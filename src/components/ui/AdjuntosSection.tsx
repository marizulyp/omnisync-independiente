"use client"
import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Icon } from "./Icon"

type Adjunto = {
  id: string
  nombre: string
  tipo: string
  extension: string
  tamano: number
  descripcion: string | null
  creadoEn: Date
}

function tipoIcon(tipo: string) {
  if (tipo.startsWith("image/")) return "image"
  if (tipo === "application/pdf") return "picture_as_pdf"
  return "attach_file"
}

function tipoColor(tipo: string) {
  if (tipo.startsWith("image/")) return "#1E3A6E"
  if (tipo === "application/pdf") return "#DC2626"
  return "#64748B"
}

function fmtTamano(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fmt(date: Date) {
  return new Date(date).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })
}

function toast(tipo: string) {
  window.dispatchEvent(new CustomEvent("show-toast", { detail: tipo }))
}

export function AdjuntosSection({
  mascotaId,
  adjuntos,
  puedeEliminar = false,
}: {
  mascotaId: string
  adjuntos: Adjunto[]
  puedeEliminar?: boolean
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Modal de confirmación para eliminar
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const confirmAdjunto = adjuntos.find((a) => a.id === confirmId)
  const [deleting, setDeleting] = useState(false)

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    setError(null)

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      setProgress(files.length > 1 ? `Subiendo ${i + 1} de ${files.length}…` : null)
      const fd = new FormData()
      fd.append("file", file)
      fd.append("mascotaId", mascotaId)
      const res = await fetch("/api/adjuntos", { method: "POST", body: fd })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Error al subir el archivo")
        setUploading(false)
        setProgress(null)
        if (inputRef.current) inputRef.current.value = ""
        return
      }
    }

    setUploading(false)
    setProgress(null)
    if (inputRef.current) inputRef.current.value = ""
    toast("created")
    router.refresh()
  }

  async function confirmarEliminar() {
    if (!confirmId) return
    setDeleting(true)
    setError(null)
    const res = await fetch(`/api/adjuntos/${confirmId}`, { method: "DELETE" })
    setDeleting(false)
    setConfirmId(null)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? "Error al eliminar el archivo")
      return
    }
    toast("deleted")
    router.refresh()
  }

  return (
    <>
      {/* ── Modal de confirmación eliminar ─────────────────────── */}
      {confirmId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmId(null) }}
        >
          <div className="w-[380px] rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="bg-[#FEF2F2] px-6 pt-6 pb-5 flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#DC2626]">
                <Icon name="delete" size={22} className="text-white" />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-[#0F1720]">Eliminar documento</p>
                <p className="mt-1.5 text-[13px] leading-[1.5] text-[#64748B]">
                  ¿Eliminar <span className="font-medium text-[#334155]">{confirmAdjunto?.nombre}</span>?
                  Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t border-[#F1F5F9] px-6 py-4">
              <button
                type="button"
                onClick={() => setConfirmId(null)}
                className="rounded-lg border border-[#E2E8F0] px-4 py-2 text-[13px] font-medium text-[#475569] hover:bg-[#F8FAFC] transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarEliminar}
                disabled={deleting}
                className="rounded-lg bg-[#DC2626] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#B91C1C] transition-colors disabled:opacity-60"
              >
                {deleting ? "Eliminando…" : "Eliminar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Sección de adjuntos ────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F1F5F9]">
          <div>
            <h2 className="font-semibold text-[#0F1720]">
              Documentos adjuntos ({adjuntos.length})
            </h2>
            <p className="text-[11.5px] text-[#94A3B8] mt-0.5">
              Ecografías, electrocardiogramas, análisis de sangre, etc.
            </p>
          </div>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 rounded-lg bg-[#1E3A6E] px-3 py-2 text-[12.5px] font-semibold text-white hover:bg-[#162D57] transition-colors disabled:opacity-60"
          >
            <Icon name="upload_file" size={15} className="text-white" />
            {uploading ? (progress ?? "Subiendo…") : "Subir documento"}
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/jpeg,image/jpg,image/png,application/pdf"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {error && (
          <div className="mx-5 mt-4 rounded-lg bg-[#FEF2F2] border border-[#FECACA] px-4 py-2.5">
            <p className="text-[12.5px] text-[#DC2626]">{error}</p>
          </div>
        )}

        <div className="p-5">
          {adjuntos.length === 0 ? (
            <div
              onClick={() => inputRef.current?.click()}
              className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#E2E8F0] bg-[#F8FAFC] py-10 cursor-pointer hover:border-[#1E3A6E] hover:bg-[#EBF0FC] transition-colors"
            >
              <Icon name="upload_file" size={36} className="text-[#94A3B8] mb-3" />
              <p className="text-[13px] font-medium text-[#475569]">Haz clic para subir un documento</p>
              <p className="text-[11.5px] text-[#94A3B8] mt-1">o arrastra aquí · PDF, JPG, PNG · máx. 20 MB</p>
            </div>
          ) : (
            <div className="space-y-2">
              {adjuntos.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 rounded-lg border border-[#E2E8F0] bg-[#FAFCFD] px-4 py-3 hover:bg-white transition-colors"
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: tipoColor(a.tipo) + "15" }}
                  >
                    <span style={{ color: tipoColor(a.tipo), display: "flex" }}>
                      <Icon name={tipoIcon(a.tipo)} size={18} className="" />
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#0F1720] truncate">{a.nombre}</p>
                    <p className="text-[11px] text-[#94A3B8]">
                      {fmtTamano(a.tamano)} · {fmt(a.creadoEn)}
                      {a.descripcion && ` · ${a.descripcion}`}
                    </p>
                  </div>

                  <a
                    href={`/api/adjuntos/${a.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Ver / Descargar"
                    className="flex items-center justify-center rounded p-1.5 text-[#94A3B8] hover:text-[#1E3A6E] transition-colors"
                  >
                    <Icon name="open_in_new" size={17} className="" />
                  </a>

                  {puedeEliminar && (
                    <button
                      onClick={() => setConfirmId(a.id)}
                      title="Eliminar"
                      className="flex items-center justify-center rounded p-1.5 text-[#94A3B8] hover:text-[#DC2626] transition-colors"
                    >
                      <Icon name="delete" size={17} className="" />
                    </button>
                  )}
                </div>
              ))}

              <button
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="mt-1 w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-[#E2E8F0] py-2.5 text-[12.5px] text-[#94A3B8] hover:border-[#1E3A6E] hover:text-[#1E3A6E] transition-colors disabled:opacity-60"
              >
                <Icon name="add" size={15} className="" />
                Subir otro documento
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
