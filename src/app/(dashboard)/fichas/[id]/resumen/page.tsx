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
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "_")
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const ficha = await prisma.ficha.findUnique({
    where: { id },
    select: { nombre: true, cliente: { select: { nombre: true } } },
  })
  if (!ficha) return {}
  const col = new Date(Date.now() - 5 * 60 * 60 * 1000)
  const dd = String(col.getUTCDate()).padStart(2, "0")
  const mm = String(col.getUTCMonth() + 1).padStart(2, "0")
  const yyyy = col.getUTCFullYear()
  const hh = String(col.getUTCHours()).padStart(2, "0")
  const min = String(col.getUTCMinutes()).padStart(2, "0")
  return {
    title: `Historia_Clinica_${normalizar(ficha.nombre)}_${normalizar(ficha.cliente.nombre.split(" ").slice(-1)[0])}_${dd}${mm}${yyyy}_${hh}${min}`,
  }
}

// ─── utilidades ──────────────────────────────────────────────────────────────

function fmt(date: Date) {
  return date.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })
}

function fmtMes(date: Date) {
  return date.toLocaleDateString("es-CO", { month: "short", year: "numeric" })
}

function calcularEdad(fechaStr: string | null | undefined): string {
  if (!fechaStr) return "Desconocida"
  const fecha = new Date(fechaStr)
  if (isNaN(fecha.getTime())) return "Desconocida"
  
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
  const ficha = await prisma.ficha.findUnique({
    where: { id },
    include: {
      cliente: true,
      atenciones: {
        orderBy: { fecha: "desc" },
        include: { especialista: { select: { nombre: true } } },
      },
      controles: { orderBy: { fecha: "desc" } },
      adjuntos: { orderBy: { creadoEn: "asc" } },
    },
  })
  
  if (!ficha) notFound()

  // Extracción segura del JSON de datos generales de la ficha
  const datosFicha = (ficha.datosGenerales as any) || {}
  const especieFicha = datosFicha.especie || ficha.tipo
  const razaFicha = datosFicha.raza || ""
  const pesoFicha = datosFicha.peso || ""

  // Filtramos los controles preventivos en Vacunas y Desparasitaciones según el "tipo"
  const vacunas = ficha.controles.filter(c => c.tipo.toLowerCase() === "vacuna")
  const desparasitaciones = ficha.controles.filter(c => c.tipo.toLowerCase() !== "vacuna")

  // Convertir imágenes adjuntas a base64 para incrustar en el PDF imprimible
  type AdjuntoConData = (typeof ficha.adjuntos)[0] & { dataUri?: string }
  const adjuntosConData: AdjuntoConData[] = await Promise.all(
    ficha.adjuntos.map(async (a) => {
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

  // Pendientes unificados a través de Controles Preventivos
  const pendientes = ficha.controles
    .filter((c) => c.proximaFecha)
    .map((c) => ({
      nombre: c.tipo.toLowerCase() === "vacuna" ? `Vacuna de ${c.nombre.toLowerCase()}` : `Desparasitación ${c.tipo}`,
      fecha: c.proximaFecha!,
      vencida: esVencida(c.proximaFecha),
    }))
    .sort((a, b) => a.fecha.getTime() - b.fecha.getTime())

  return (
    <>
      {/* Barra de acciones — solo pantalla */}
      <div className="print:hidden flex items-center gap-4 p-4 border-b border-gray-200 bg-white">
        <Link href={`/fichas/${id}`} className="text-sm text-gray-500 hover:text-gray-700">
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
          <img src={CLINICA.logo} alt={CLINICA.nombre} style={{ width: 200, height: 150, objectFit: "contain" }} />

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
            {ficha.nombre} {ficha.cliente.nombre.split(" ").slice(-1)[0]}
          </h1>
          <p style={{ fontSize: 12, color: "#64748B", margin: "4px 0 0" }}>
            {ESPECIE_LABEL[especieFicha] ?? especieFicha}
            {razaFicha ? ` · ${razaFicha}` : ""}
            {datosFicha.fechaNacimiento ? ` · ${calcularEdad(datosFicha.fechaNacimiento)}` : ""}
            {" · Generada el "}
            <span style={{ color: "#1E3A6E", fontWeight: 600 }}>{generadoEn}</span>
          </p>
        </div>

        {/* Tarjetas de datos */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 24 }}>
          <InfoCard label="Propietario" value={ficha.cliente.nombre} />
          <InfoCard label="Teléfono" value={ficha.cliente.telefono ?? "—"} />
          <InfoCard label="Identificación" value={ficha.cliente.identificacion ?? "—"} />
          <InfoCard
            label="Especie / Raza"
            value={`${ESPECIE_LABEL[especieFicha] ?? especieFicha}${razaFicha ? ` — ${razaFicha}` : ""}`}
          />
          <InfoCard label="Edad" value={calcularEdad(datosFicha.fechaNacimiento)} />
          <InfoCard label="Peso actual" value={pesoFicha ? `${pesoFicha} kg` : "—"} />
        </div>

        {/* ── Vacunas ─────────────────────────────────────────────── */}
        <div style={{ marginBottom: 22, pageBreakInside: "avoid" }}>
          <SeccionHeader title={`Vacunas (${vacunas.length})`} />
          {vacunas.length === 0 ? (
            <p style={{ fontSize: 11, color: "#94A3B8", fontStyle: "italic" }}>Sin vacunas registradas</p>
          ) : (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11.5 }}>
              <thead>
                <tr>
                  {["Vacuna", "Aplicada", "Próxima dosis", "Notas"].map((h) => (
                    <th key={h} style={{ textAlign: "left", paddingBottom: 6, color: "#64748B", fontSize: 9.5, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid #E2E8F0" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {vacunas.map((v, i) => {
                  const venc = esVencida(v.proximaFecha)
                  return (
                    <tr key={v.id} style={{ background: i % 2 === 1 ? "#F8FAFC" : "transparent" }}>
                      <td style={{ padding: "7px 0", fontWeight: 600, color: "#0F1720" }}>{v.nombre}</td>
                      <td style={{ padding: "7px 8px", color: "#475569" }}>{fmt(v.fecha)}</td>
                      <td style={{ padding: "7px 8px", color: venc ? "#DC2626" : "#475569", fontWeight: venc ? 600 : 400 }}>
                        {v.proximaFecha ? (
                          <>{fmt(v.proximaFecha)}{venc && <span style={{ marginLeft: 4, fontSize: 10, color: "#DC2626" }}>· vencida</span>}</>
                        ) : "—"}
                      </td>
                      <td style={{ padding: "7px 8px", color: "#94A3B8" }}>{v.notas ?? "—"}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Desparasitaciones ────────────────────────────────────── */}
        <div style={{ marginBottom: 22, pageBreakInside: "avoid" }}>
          <SeccionHeader title={`Desparasitaciones (${desparasitaciones.length})`} />
          {desparasitaciones.length === 0 ? (
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
                {desparasitaciones.map((d, i) => {
                  const venc = esVencida(d.proximaFecha)
                  return (
                    <tr key={d.id} style={{ background: i % 2 === 1 ? "#F8FAFC" : "transparent" }}>
                      <td style={{ padding: "7px 0", color: "#475569" }}>{fmt(d.fecha)}</td>
                      <td style={{ padding: "7px 8px", color: "#475569", textTransform: "capitalize" }}>{d.tipo}</td>
                      <td style={{ padding: "7px 8px", color: "#475569" }}>{d.nombre ?? "—"}</td>
                      <td style={{ padding: "7px 8px", color: venc ? "#DC2626" : "#475569", fontWeight: venc ? 600 : 400 }}>
                        {d.proximaFecha ? (
                          <>{fmt(d.proximaFecha)}{venc && <span style={{ marginLeft: 4, fontSize: 10, color: "#DC2626" }}>· vencida</span>}</>
                        ) : "—"}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* ── Atenciones Clínicas ────────────────────────────────────────────── */}
        <div style={{ marginBottom: 22 }}>
          <SeccionHeader title={`Atenciones Médicas (${ficha.atenciones.length})`} />
          {ficha.atenciones.length === 0 ? (
            <p style={{ fontSize: 11, color: "#94A3B8", fontStyle: "italic" }}>Sin atenciones registradas</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {ficha.atenciones.map((a) => {
                const det = (a.detalles as any) || {}
                const tieneSignos = det.peso || det.temperatura || det.frecuenciaCardiaca || det.frecuenciaRespiratoria || det.condicionCorporal || det.mucosas
                
                return (
                  <div
                    key={a.id}
                    style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: "12px 14px", pageBreakInside: "avoid" }}
                  >
                    {/* Cabecera */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                      <h3 style={{ fontSize: 14, fontWeight: 700, color: "#0F1720", margin: 0 }}>{a.motivo}</h3>
                      <span style={{ fontSize: 10, color: "#1E3A6E" }}>
                        {fmt(a.fecha)}{a.especialista ? ` · Dr(a). ${a.especialista.nombre}` : ""}
                      </span>
                    </div>

                    {/* Signos vitales */}
                    {tieneSignos && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                        {det.peso && <VitalChip label="Peso" value={`${det.peso} kg`} />}
                        {det.temperatura && <VitalChip label="Temp." value={`${det.temperatura} °C`} />}
                        {det.frecuenciaCardiaca && <VitalChip label="FC" value={`${det.frecuenciaCardiaca} lpm`} />}
                        {det.frecuenciaRespiratoria && <VitalChip label="FR" value={`${det.frecuenciaRespiratoria} rpm`} />}
                        {det.condicionCorporal && <VitalChip label="CC" value={`${det.condicionCorporal}/9`} />}
                        {det.mucosas && <VitalChip label="Mucosas" value={det.mucosas} />}
                      </div>
                    )}

                    {/* Campos clínicos */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {det.anamnesis && <FieldRow label="Anamnesis" value={det.anamnesis} />}
                      {det.sintomas && <FieldRow label="Síntomas" value={det.sintomas} />}
                      {det.examenFisico && <FieldRow label="Examen físico" value={det.examenFisico} />}
                      {det.diagnostico && <FieldRow label="Diagnóstico" value={det.diagnostico} />}
                      {det.tratamiento && <FieldRow label="Tratamiento" value={det.tratamiento} />}
                      {det.plan && <FieldRow label="Plan" value={det.plan} />}
                      {det.observaciones && <FieldRow label="Observaciones" value={det.observaciones} />}
                    </div>
                  </div>
                )
              })}
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
            {ficha.nombre.toUpperCase()} · {hoy.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()}
          </p>
        </div>
      </div>
    </>
  )
};