"use client"
import { useSearchParams, useRouter, usePathname } from "next/navigation"
import { useEffect, useState } from "react"
import { Icon } from "./Icon"

type Toast = { label: string; message: string; color: string; icon: string }

const TOAST_MAP: Record<string, Toast> = {
  created:    { label: "Registro creado",   message: "Se creó exitosamente",       color: "#059669", icon: "check_circle" },
  updated:    { label: "Actualización",     message: "Se actualizó exitosamente",  color: "#2563EB", icon: "check_circle" },
  deleted:    { label: "Eliminado",         message: "Se eliminó exitosamente",    color: "#DC2626", icon: "delete" },
  downloaded: { label: "Descarga lista",    message: "Descarga exitosa",           color: "#7C3AED", icon: "download_done" },
  denied:     { label: "Acceso restringido", message: "Tu rol no tiene permiso para esa sección", color: "#B45309", icon: "lock" },
}

const DURATION = 2000

export function ToastNotification() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  // `id` distingue dos avisos iguales seguidos para reiniciar el temporizador
  const [toast, setToast] = useState<(Toast & { id: number }) | null>(null)
  const [visible, setVisible] = useState(false)
  const [urlToastHandled, setUrlToastHandled] = useState<string | null>(null)

  // Aviso recibido por ?toast=... : se procesa una sola vez durante el render
  const urlKey = searchParams.get("toast")
  const urlParams = searchParams.toString()
  if (urlKey && TOAST_MAP[urlKey] && urlToastHandled !== urlParams) {
    setUrlToastHandled(urlParams)
    setToast({ ...TOAST_MAP[urlKey], id: (toast?.id ?? 0) + 1 })
    setVisible(true)
  } else if (!urlKey && urlToastHandled !== null) {
    setUrlToastHandled(null)
  }

  // Quitar ?toast=... de la URL una vez mostrado
  useEffect(() => {
    if (!urlKey || !TOAST_MAP[urlKey]) return
    const params = new URLSearchParams(urlParams)
    params.delete("toast")
    const url = params.size ? `${pathname}?${params}` : pathname
    router.replace(url, { scroll: false })
  }, [urlKey, urlParams, pathname, router])

  // Avisos disparados desde el cliente con window.dispatchEvent("show-toast")
  useEffect(() => {
    function handler(e: Event) {
      const detail = (e as CustomEvent<string>).detail
      if (!TOAST_MAP[detail]) return
      setToast((prev) => ({ ...TOAST_MAP[detail], id: (prev?.id ?? 0) + 1 }))
      setVisible(true)
    }
    window.addEventListener("show-toast", handler)
    return () => window.removeEventListener("show-toast", handler)
  }, [])

  // Ocultar automáticamente tras DURATION y desmontar tras la animación de salida
  const toastId = toast?.id
  useEffect(() => {
    if (toastId === undefined) return
    if (visible) {
      const t = setTimeout(() => setVisible(false), DURATION)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setToast(null), 300)
    return () => clearTimeout(t)
  }, [toastId, visible])

  function dismiss() {
    setVisible(false)
  }

  // Sin toast activo → no renderizar nada (no bloquea la UI)
  if (!toast) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed inset-0 z-50 flex items-center justify-center print:hidden transition-opacity duration-300 ${
        visible ? "opacity-100 pointer-events-none" : "opacity-0 pointer-events-none"
      }`}
    >
      <div
        className={`pointer-events-auto w-[380px] max-w-[calc(100vw-32px)] rounded-2xl bg-white shadow-2xl overflow-hidden transition-all duration-300 ${
          visible ? "scale-100 translate-y-0" : "scale-95 -translate-y-3"
        }`}
        style={{ borderLeft: `5px solid ${toast.color}` }}
      >
        {/* Cabecera */}
        <div
          className="flex items-start gap-4 px-5 pt-5 pb-4"
          style={{ backgroundColor: toast.color + "12" }}
        >
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: toast.color + "22", color: toast.color }}
          >
            <Icon name={toast.icon} size={22} className="" />
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-[15px] font-bold" style={{ color: toast.color }}>
              {toast.label}
            </p>
            <p className="mt-0.5 text-[13px] text-[#64748B]">{toast.message}</p>
          </div>
          <button
            onClick={dismiss}
            className="mt-0.5 shrink-0 text-[#94A3B8] hover:text-[#475569] transition-colors"
          >
            <Icon name="close" size={18} className="" />
          </button>
        </div>

        {/* Barra de progreso */}
        <div className="h-[3px] w-full" style={{ backgroundColor: toast.color + "25" }}>
          <div
            className="h-full"
            style={{
              backgroundColor: toast.color,
              animation: visible ? `toast-shrink ${DURATION}ms linear forwards` : "none",
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes toast-shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </div>
  )
}
