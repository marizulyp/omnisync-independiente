import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { BtnImprimir } from "@/components/ui/BtnImprimir"
import { PdfViewer } from "@/components/ui/PdfViewer"
import { readFile } from "fs/promises"
import path from "path"
import type { Metadata } from "next"
import { CLINICA } from "@/config/clinica"

function normalizar(str: string) {
  return str.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]/g, "_")
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const mascota = await prisma.mascota.findUnique({
    where: { id },
    select: { nombre: true, cliente: { select: { nombre: true } } },
  })
  if (!mascota) return {}
  const col = new Date(Date.now() - 5 * 60 * 60 * 1000)
  const dd = String(col.getUTCDate()).padStart(2, "0")
  const mm = String(col.getUTCMonth() + 1).padStart(2, "0")
  const yyyy = col.getUTCFullYear()
  const hh = String(col.getUTCHours()).padStart(2, "0")
  const min = String(col.getUTCMinutes()).padStart(2, "0")
  return {
    title: `Historia_Clinica_${normalizar(mascota.nombre)}_${normalizar(mascota.cliente.nombre.split(" ").slice(-1)[0])}_${dd}${mm}${yyyy}_${hh}${min}`,
  }
}

// ─── utilidades ──────────────────────────────────────────────────────────────

function fmt(date: Date) {
  return date.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })
}

function fmtMes(date: Date) {
  return date.toLocaleDateString("es-CO", { month: "short", year: "numeric" })
}

function calcularEdad(fecha: Date | null): string {
  if (!fecha) return "Desconocida"
  const hoy = new Date()
  const años = hoy.getFullYear() - fecha.getFullYear()
  const meses = hoy.getMonth() - fecha.getMonth()
  if (años === 0) { const m = meses < 0 ? 12 + meses : meses; return `${m} ${m === 1 ? "mes" : "meses"}` }
  if (años === 1 && meses < 0) return `${12 + meses} meses`
  return `${años} ${años === 1 ? "año" : "años"}`
}

function esVencida(date: Date | null) {
  if (!date) return false
  return date < new Date()
}

const ESPECIE_LABEL: Record<string, string> = {
  perro: "Perro", gato: "Gato", ave: "Ave", conejo: "Conejo", reptil: "Reptil", otro: "Otro",
}

// ─── componentes menores ─────────────────────────────────────────────────────

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: "1px solid #E2E8F0", borderRadius: 8, padding: "10px 12px", background: "#FAFCFD" }}>
      <p style={{ fontSize: 9, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>
        {label}
      </p>
      <p style={{ fontSize: 13, fontWeight: 600, color: "#0F1720" }}>{value}</p>
    </div>
  )
}

function SeccionHeader({ title }: { title: string }) {
  return (
    <div style={{ borderBottom: "1.5px solid #1E3A6E", paddingBottom: 5, marginBottom: 10 }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: "#1E3A6E", textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {title}
      </p>
    </div>
  )
}

function VitalChip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ border: "1px solid #E2E8F0", borderRadius: 6, padding: "4px 8px", minWidth: 52, textAlign: "center", background: "#F8FAFC" }}>
      <p style={{ fontSize: 8, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 1 }}>{label}</p>
      <p style={{ fontSize: 12, fontWeight: 700, color: "#0F1720" }}>{value}</p>
    </div>
  )
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 8, paddingBottom: 4, borderBottom: "1px solid #F1F5F9" }}>
      <p style={{ fontSize: 9.5, fontWeight: 600, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em", minWidth: 110, paddingTop: 1 }}>
        {label}
      </p>
      <p style={{ fontSize: 11.5, color: "#334155", flex: 1 }}>{value}</p>
    </div>
  )
}

// ─── página ───────────────────────────────────────────────────────────────────

export default async function ResumenPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const mascota = await prisma.mascota.findUnique({
    where: { id },
    include: {
      cliente: true,
      consultas: {
        orderBy: { fecha: "desc" },
        include: { veterinario: { select: { nombre: true } } },
      },
      vacunas: { orderBy: { fecha: "desc" } },
      desparasitaciones: { orderBy: { fecha: "desc" } },
      adjuntos: { orderBy: { creadoEn: "asc" } },
    },
  })
  if (!mascota) notFound()

  // Convertir imágenes adjuntas a base64 para incrustar en el PDF imprimible
  type AdjuntoConData = (typeof mascota.adjuntos)[0] & { dataUri?: string }
  const adjuntosConData: AdjuntoConData[] = await Promise.all(
    mascota.adjuntos.map(async (a) => {
      if (!a.tipo.startsWith("image/")) return a
      try {
        const buffer = await readFile(
          path.join(process.cwd(), "uploads", "adjuntos", `${a.id}.${a.extension}`)
        )
        return { ...a, dataUri: `data:${a.tipo};base64,${buffer.toString("base64")}` }
      } catch {
        return a
      }
    })
  )

  const hoy = new Date()
  const generadoEn = hoy.toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })

  // Pendientes: vacunas y desparasitaciones con próxima dosis
  const pendientesVacunas = mascota.vacunas
    .filter((v) => v.proximaDosis)
    .map((v) => ({
      nombre: `Vacuna de ${v.nombre.toLowerCase()}`,
      fecha: v.proximaDosis!,
      vencida: esVencida(v.proximaDosis),
    }))

  const pendientesDesparas = mascota.desparasitaciones
    .filter((d) => d.proximaDosis)
    .map((d) => ({
      nombre: `Desparasitación ${d.tipo}`,
      fecha: d.proximaDosis!,
      vencida: esVencida(d.proximaDosis),
    }))

  const pendientes = [...pendientesVacunas, ...pendientesDesparas]
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime())

  return (
    <>
      {/* Barra de acciones — solo pantalla */}
      <div className="print:hidden flex items-center gap-4 p-4 border-b border-gray-200 bg-white">
        <Link href={`/mascotas/${id}`} className="text-sm text-gray-500 hover:text-gray-700">
          ← Volver
        </Link>
        <BtnImprimir />
      </div>

      {/* Fuerza impresión de colores de fondo */}
      <style>{`
        @page {
          margin: 0 0 10mm 0;
          @top-left    { content: ""; }
          @top-center  { content: ""; }
          @top-right   { content: ""; }
          @bottom-left { content: ""; }
          @bottom-center { content: ""; }
          @bottom-right {
            content: counter(page) " / " counter(pages);
            font-size: 8pt;
            font-family: system-ui, sans-serif;
            color: #94A3B8;
          }
        }
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          ::-webkit-scrollbar { display: none !important; width: 0 !important; }
          html, body { background: #fff !important; min-height: 0 !important; }
        }
      `}</style>

      {/* Documento imprimible */}
      <div
        className="print:p-0 print:max-w-none"
        style={{ maxWidth: 760, margin: "0 auto", padding: "32px 32px 48px", background: "#fff", fontFamily: "system-ui, -apple-system, sans-serif", color: "#0F1720", fontSize: 13 }}
      >
        {/* ── Encabezado ─────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
          {/* Logo */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={CLINICA.logo} alt={CLINICA.nombre} style={{  width: 200, height: 150}} />

          {/* Info clínica */}
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {CLINICA.nombre}
            </p>
            <p style={{ fontSize: 9, color: "#94A3B8", letterSpacing: "0.05em" }}>
              {CLINICA.nit} · {CLINICA.direccion}
            </p>
            <p style={{ fontSize: 9, fontWeight: 600, color: "#1E3A6E", textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 6 }}>
              Historia Clínica Completa
            </p>
          </div>
        </div>

        {/* Línea divisora teal */}
        <div style={{ height: 2, background: "#1E3A6E", marginBottom: 16 }} />

        {/* ── Paciente ────────────────────────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0F1720", margin: 0, lineHeight: 1.15 }}>
            {mascota.nombre} {mascota.cliente.nombre.split(" ").slice(-1)[0]}
          </h1>
          <p style={{ fontSize: 12, color: "#64748B", margin: "4px 0 0" }}>
            {ESPECIE_LABEL[mascota.especie] ?? mascota.especie}
            {mascota.raza ? ` · ${mascota.raza}` : ""}
            {mascota.fechaNacimiento ? ` · ${calcularEdad(mascota.fechaNacimiento)}` : ""}
            {" · Generada el "}
            <span style={{ color: "#1E3A6E", fontWeight: 600 }}>{generadoEn}</span>
          </p>
        </div>

        {/* Tarjetas de datos */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 24 }}>
          <InfoCard label="Propietario" value={mascota.cliente.nombre} />
          <InfoCard label="Teléfono" value={mascota.cliente.telefono ?? "—"} />
          <InfoCard label="Identificación" value={mascota.cliente.identificacion ?? "—"} />
          <InfoCard
            label="Especie / Raza"
            value={`${ESPECIE_LABEL[mascota.especie] ?? mascota.especie}${mascota.raza ? ` — ${mascota.raza}` : ""}`}
          />
          <InfoCard label="Edad" value={calcularEdad(mascota.fechaNacimiento)} />
          <InfoCard label="Peso actual" value={mascota.peso ? `${mascota.peso} kg` : "—"} />
        </div>

        {/* ── Vacunas ─────────────────────────────────────────────── */}
        <div style={{ marginBottom: 22, pageBreakInside: "avoid" }}>
          <SeccionHeader title={`Vacunas (${mascota.vacunas.length})`} />
          {mascota.vacunas.length === 0 ? (
            <p style={{ fontSize: 11, color: "#94A3B8", fontStyle: "italic" }}>Sin vacunas registradas</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
              <thead>
                <tr>
                  {["Vacuna", "Aplicada", "Próxima dosis", "Lote"].map((h) => (
                    <th key={h} style={{ textAlign: "left", paddingBottom: 6, color: "#64748B", fontSize: 9.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid #E2E8F0" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mascota.vacunas.map((v, i) => {
                  const venc = esVencida(v.proximaDosis)
                  return (
                    <tr key={v.id} style={{ background: i % 2 === 1 ? "#F8FAFC" : "transparent" }}>
                      <td style={{ padding: "7px 0", fontWeight: 600, color: "#0F1720" }}>{v.nombre}</td>
                      <td style={{ padding: "7px 8px", color: "#475569" }}>{fmt(v.fecha)}</td>
                      <td style={{ padding: "7px 8px", color: venc ? "#DC2626" : "#475569", fontWeight: venc ? 600 : 400 }}>
                        {v.proximaDosis ? (
                          <>{fmt(v.proximaDosis)}{venc && <span style={{ marginLeft: 4, fontSize: 10, color: "#DC2626" }}>· vencida</span>}</>
                        ) : "—"}
                      </td>
                      <td style={{ padding: "7px 8px", color: "#94A3B8" }}>{v.lote ?? "—"}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Desparasitaciones ────────────────────────────────────── */}
        <div style={{ marginBottom: 22, pageBreakInside: "avoid" }}>
          <SeccionHeader title={`Desparasitaciones (${mascota.desparasitaciones.length})`} />
          {mascota.desparasitaciones.length === 0 ? (
            <p style={{ fontSize: 11, color: "#94A3B8", fontStyle: "italic" }}>Sin desparasitaciones registradas</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
              <thead>
                <tr>
                  {["Fecha", "Tipo", "Producto", "Próxima dosis"].map((h) => (
                    <th key={h} style={{ textAlign: "left", paddingBottom: 6, color: "#64748B", fontSize: 9.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid #E2E8F0" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {mascota.desparasitaciones.map((d, i) => {
                  const venc = esVencida(d.proximaDosis)
                  return (
                    <tr key={d.id} style={{ background: i % 2 === 1 ? "#F8FAFC" : "transparent" }}>
                      <td style={{ padding: "7px 0", color: "#475569" }}>{fmt(d.fecha)}</td>
                      <td style={{ padding: "7px 8px", color: "#475569", textTransform: "capitalize" }}>{d.tipo}</td>
                      <td style={{ padding: "7px 8px", color: "#475569" }}>{d.producto ?? "—"}</td>
                      <td style={{ padding: "7px 8px", color: venc ? "#DC2626" : "#475569", fontWeight: venc ? 600 : 400 }}>
                        {d.proximaDosis ? (
                          <>{fmt(d.proximaDosis)}{venc && <span style={{ marginLeft: 4, fontSize: 10, color: "#DC2626" }}>· vencida</span>}</>
                        ) : "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Consultas ────────────────────────────────────────────── */}
        <div style={{ marginBottom: 22 }}>
          <SeccionHeader title={`Consultas (${mascota.consultas.length})`} />
          {mascota.consultas.length === 0 ? (
            <p style={{ fontSize: 11, color: "#94A3B8", fontStyle: "italic" }}>Sin consultas registradas</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {mascota.consultas.map((c) => (
                <div
                  key={c.id}
                  style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: "12px 14px", pageBreakInside: "avoid" }}
                >
                  {/* Cabecera */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0F1720", margin: 0 }}>{c.motivo}</h3>
                    <span style={{ fontSize: 10, color: "#1E3A6E" }}>
                      {fmt(c.fecha)}{c.veterinario ? ` · Dr(a). ${c.veterinario.nombre}` : ""}
                    </span>
                  </div>

                  {/* Signos vitales */}
                  {(c.peso || c.temperatura || c.frecuenciaCardiaca || c.frecuenciaRespiratoria || c.condicionCorporal || c.mucosas) && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                      {c.peso && <VitalChip label="Peso" value={`${c.peso} kg`} />}
                      {c.temperatura && <VitalChip label="Temp." value={`${c.temperatura} °C`} />}
                      {c.frecuenciaCardiaca && <VitalChip label="FC" value={`${c.frecuenciaCardiaca} lpm`} />}
                      {c.frecuenciaRespiratoria && <VitalChip label="FR" value={`${c.frecuenciaRespiratoria} rpm`} />}
                      {c.condicionCorporal && <VitalChip label="CC" value={`${c.condicionCorporal}/9`} />}
                      {c.mucosas && <VitalChip label="Mucosas" value={c.mucosas} />}
                    </div>
                  )}

                  {/* Campos clínicos */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {c.anamnesis && <FieldRow label="Anamnesis" value={c.anamnesis} />}
                    {c.sintomas && <FieldRow label="Síntomas" value={c.sintomas} />}
                    {c.examenFisico && <FieldRow label="Examen físico" value={c.examenFisico} />}
                    {c.diagnostico && <FieldRow label="Diagnóstico" value={c.diagnostico} />}
                    {c.tratamiento && <FieldRow label="Tratamiento" value={c.tratamiento} />}
                    {c.plan && <FieldRow label="Plan" value={c.plan} />}
                    {c.observaciones && <FieldRow label="Observaciones" value={c.observaciones} />}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Pendientes del paciente ──────────────────────────────── */}
        {pendientes.length > 0 && (
          <div
            style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 10, padding: "12px 16px", marginBottom: 24, pageBreakInside: "avoid" }}
          >
            <p style={{ fontSize: 9.5, fontWeight: 700, color: "#B45309", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
              Pendientes del paciente
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "6px 24px" }}>
              {pendientes.map((p, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11.5, color: "#78350F" }}>{p.nombre}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: p.vencida ? "#DC2626" : "#78350F" }}>
                    {p.vencida ? `vencida ${fmt(p.fecha)}` : fmtMes(p.fecha)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Documentos adjuntos ─────────────────────────────────── */}
        {adjuntosConData.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <SeccionHeader title={`Documentos adjuntos (${adjuntosConData.length})`} />

            {/* Imágenes — 2 por fila */}
            {adjuntosConData.filter((a) => a.tipo.startsWith("image/")).length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                {adjuntosConData
                  .filter((a): a is AdjuntoConData & { dataUri: string } => !!a.dataUri)
                  .map((a) => (
                    <div key={a.id} style={{ pageBreakInside: "avoid" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={a.dataUri}
                        alt={a.nombre}
                        style={{ width: "100%", borderRadius: 6, border: "1px solid #E2E8F0", display: "block" }}
                      />
                      <p style={{ fontSize: 9, color: "#94A3B8", marginTop: 3, textAlign: "center" }}>{a.nombre}</p>
                    </div>
                  ))}
              </div>
            )}

            {/* PDFs — renderizados página por página */}
            {adjuntosConData.filter((a) => a.tipo === "application/pdf").length > 0 && (
              <div style={{ marginTop: 8 }}>
                <p style={{ fontSize: 9.5, fontWeight: 600, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                  Documentos PDF adjuntos
                </p>
                {adjuntosConData
                  .filter((a) => a.tipo === "application/pdf")
                  .map((a) => (
                    <PdfViewer
                      key={a.id}
                      url={`/api/adjuntos/${a.id}`}
                      nombre={a.nombre}
                      fecha={fmt(a.creadoEn)}
                    />
                  ))}
              </div>
            )}
          </div>
        )}

        {/* ── Pie de página ────────────────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 10, borderTop: "1px solid #E2E8F0" }}>
          <p style={{ fontSize: 9, color: "#94A3B8" }}>
            Documento clínico confidencial · Uso exclusivo del propietario y del equipo veterinario.
          </p>
          <p style={{ fontSize: 9, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            {mascota.nombre.toUpperCase()} · {hoy.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()}
          </p>
        </div>
      </div>
    </>
  )
}
