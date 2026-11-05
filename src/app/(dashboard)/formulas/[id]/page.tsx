import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { BtnImprimir } from "@/components/ui/BtnImprimir"
import Link from "next/link"
import { CLINICA } from "@/config/clinica"

const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"]

const TEAL  = "#1E3A6E"
const DARK  = "#0F1720"
const GRAY  = "#334155"
const MUTED = "#64748B"
const LIGHT = "#94A3B8"
const BORDER = "#E2E8F0"

function normalizar(str: string) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "_")
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const recomendacion = await prisma.recomendacion.findUnique({
    where: { id },
    select: {
      fecha: true,
      creadoEn: true,
      ficha: { select: { nombre: true, cliente: { select: { nombre: true } } } },
    },
  })
  if (!recomendacion || !recomendacion.ficha) return { title: "Formula_Medica" }

  const paciente = normalizar(recomendacion.ficha.nombre)
  const apellido = normalizar(recomendacion.ficha.cliente.nombre.split(" ").slice(-1)[0])
  const f = recomendacion.fecha
  const fecha = `${String(f.getDate()).padStart(2, "0")}${String(f.getMonth() + 1).padStart(2, "0")}${f.getFullYear()}`
  const col = new Date(recomendacion.creadoEn.getTime() - 5 * 60 * 60 * 1000)
  const hora = `${String(col.getUTCHours()).padStart(2, "0")}${String(col.getUTCMinutes()).padStart(2, "0")}`

  return { title: `Formula_Medica_${paciente}_${apellido}_${fecha}_${hora}` }
}

function calcularEdad(fechaNacimientoStr: string | null | undefined): string {
  if (!fechaNacimientoStr) return "—"
  const fechaNacimiento = new Date(fechaNacimientoStr)
  if (isNaN(fechaNacimiento.getTime())) return "—"
  
  const hoy = new Date()
  const totalMeses =
    (hoy.getFullYear() - fechaNacimiento.getFullYear()) * 12 +
    (hoy.getMonth() - fechaNacimiento.getMonth())
  if (totalMeses < 1) return "< 1 m"
  if (totalMeses < 12) return `${totalMeses} mes${totalMeses > 1 ? "es" : ""}`
  const años = Math.floor(totalMeses / 12)
  const meses = totalMeses % 12
  return meses > 0 ? `${años} a ${meses} m` : `${años} año${años > 1 ? "s" : ""}`
}

function localDate(d: Date) {
  return {
    dia: String(d.getDate()).padStart(2, "0"),
    mes: String(d.getMonth() + 1).padStart(2, "0"),
    año: String(d.getFullYear()),
  }
}

export default async function FormulaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const recomendacion = await prisma.recomendacion.findUnique({
    where: { id },
    include: {
      ficha: { include: { cliente: true } },
      especialista: { select: { nombre: true } },
      items: { orderBy: { orden: "asc" } },
    },
  })

  if (!recomendacion || !recomendacion.ficha) notFound()

  const { ficha } = recomendacion
  const datosGenerales = (ficha.datosGenerales as any) || {}
  
  const edad = calcularEdad(datosGenerales.fechaNacimiento)
  const fecha = localDate(recomendacion.fecha)
  const hcNum = ficha.id.slice(-6).toUpperCase()
  const especie = datosGenerales.especie || ficha.tipo
  const raza = datosGenerales.raza || ""
  const peso = datosGenerales.peso || ""

  return (
    <>
      {/* Barra de acciones — solo pantalla */}
      <div className="print:hidden flex items-center gap-4 p-4 border-b border-gray-200 bg-white">
        <Link href="/formulas" className="text-sm text-gray-500 hover:text-gray-700">
          ← Volver a fórmulas
        </Link>
        <div className="ml-auto">
          <BtnImprimir />
        </div>
      </div>

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

      {/* ── FÓRMULA MÉDICA ──────────────────────────────────────────────── */}
      <div
        className="print:p-0 print:max-w-none"
        style={{
          maxWidth: 760,
          margin: "0 auto",
          padding: "32px 32px 48px",
          background: "#fff",
          fontFamily: "system-ui, -apple-system, sans-serif",
          color: DARK,
          fontSize: 13,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Marca de agua */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            opacity: 0.04,
            transform: "rotate(-30deg)",
            pointerEvents: "none",
            userSelect: "none",
            zIndex: 0,
          }}
        >
          <p style={{ fontSize: 56, fontWeight: 900, color: DARK, whiteSpace: "nowrap", letterSpacing: "0.1em", margin: 0 }}>
            {CLINICA.nombre.toUpperCase()}
          </p>
          <p style={{ fontSize: 17, color: DARK, marginTop: 4 }}>{CLINICA.nit}</p>
        </div>

        <div style={{ position: "relative", zIndex: 1 }}>

          {/* ── Encabezado ───────────────────────────────────────────── */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
            {/* Logo */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={(CLINICA as any).logo || ""} alt={CLINICA.nombre} style={{ width: 200, height: 150, objectFit: "contain" }} />

            {/* Datos empresa */}
            <div style={{ textAlign: "right" }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: DARK, marginBottom: 2 }}>{CLINICA.razonSocial}</p>
              <p style={{ fontSize: 11, color: MUTED }}>{CLINICA.nit}</p>
              <p style={{ fontSize: 11, color: TEAL }}>{CLINICA.direccion}</p>
              <p style={{ fontSize: 11, color: TEAL }}>{CLINICA.telefono} · {(CLINICA as any).celular || ""}</p>
              <p style={{ fontSize: 9, fontWeight: 600, color: TEAL, textTransform: "uppercase", letterSpacing: "0.08em", marginTop: 6 }}>
                Fórmula Médica Veterinaria
              </p>
            </div>
          </div>

          {/* Línea divisora */}
          <div style={{ height: 1.5, background: DARK, marginBottom: 18, marginTop: 10 }} />

          {/* ── Cajas: NIT / Número / Fecha ─────────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 18 }}>
            {/* NIT */}
            <div style={{ border: `1px solid ${BORDER}`, borderRadius: 6, padding: "10px 14px" }}>
              <p style={{ fontSize: 9, fontWeight: 600, color: LIGHT, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>NIT</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: DARK }}>{CLINICA.nit.replace(/^NIT\s*/, "")}</p>
            </div>
            {/* H/C */}
            <div style={{ border: `1px solid ${BORDER}`, borderRadius: 6, padding: "10px 14px" }}>
              <p style={{ fontSize: 9, fontWeight: 600, color: LIGHT, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>H/C N°</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: DARK }}>{hcNum}</p>
            </div>
            {/* Fecha */}
            <div style={{ border: `1.5px solid ${TEAL}`, borderRadius: 6, padding: "10px 14px" }}>
              <p style={{ fontSize: 9, fontWeight: 600, color: TEAL, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Fecha</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: TEAL }}>{fecha.dia}/{fecha.mes}/{fecha.año}</p>
            </div>
          </div>

          {/* ── Datos del paciente ───────────────────────────────────── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 22 }}>
            {/* Paciente */}
            <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: "12px 14px" }}>
              <p style={{ fontSize: 9.5, fontWeight: 700, color: TEAL, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
                Paciente
              </p>
              <p style={{ fontSize: 16, fontWeight: 700, color: DARK, marginBottom: 10 }}>
                {ficha.nombre} {ficha.cliente.nombre.split(" ").slice(-1)[0]}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ fontSize: 10, color: LIGHT, minWidth: 60 }}>Especie</span>
                  <span style={{ fontSize: 11, color: GRAY, textTransform: "capitalize" }}>
                    {raza ? `${raza} · ${especie}` : especie}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ fontSize: 10, color: LIGHT, minWidth: 60 }}>Edad</span>
                  <span style={{ fontSize: 11, color: GRAY }}>{edad}</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ fontSize: 10, color: LIGHT, minWidth: 60 }}>Peso</span>
                  <span style={{ fontSize: 11, color: GRAY }}>{peso ? `${peso} kg` : "—"}</span>
                </div>
              </div>
            </div>

            {/* Propietario */}
            <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: "12px 14px" }}>
              <p style={{ fontSize: 9.5, fontWeight: 700, color: TEAL, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>
                Propietario
              </p>
              <p style={{ fontSize: 16, fontWeight: 700, color: DARK, marginBottom: 10 }}>
                {ficha.cliente.nombre}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ fontSize: 10, color: LIGHT, minWidth: 60 }}>Teléfono</span>
                  <span style={{ fontSize: 11, color: GRAY }}>{ficha.cliente.telefono ?? "—"}</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ fontSize: 10, color: LIGHT, minWidth: 60 }}>Identificación</span>
                  <span style={{ fontSize: 11, color: GRAY }}>{ficha.cliente.identificacion ?? "—"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Línea divisora sección medicamentos ─────────────────── */}
          <div style={{ borderBottom: `1.5px solid ${DARK}`, paddingBottom: 5, marginBottom: 16 }}>
            <p style={{ fontSize: 10, fontWeight: 700, color: DARK, textTransform: "uppercase", letterSpacing: "0.07em" }}>
              Recomendaciones y/o Medicamentos
            </p>
          </div>

          {/* ── Medicamentos ─────────────────────────────────────────── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16, minHeight: 200, marginBottom: 28 }}>
            {recomendacion.items.map((item, idx) => (
              <div key={item.id} style={{ display: "flex", gap: 14, breakInside: "avoid" as const }}>
                {/* Número romano */}
                <div style={{ flexShrink: 0 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      border: `2px solid ${DARK}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#fff",
                    }}
                  >
                    <span style={{ fontSize: 9.5, fontWeight: 900, color: DARK }}>
                      {ROMAN[idx] ?? idx + 1}
                    </span>
                  </div>
                </div>
                {/* Contenido */}
                <div style={{ flex: 1, borderBottom: `1px solid ${BORDER}`, paddingBottom: 12 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: DARK, margin: 0, lineHeight: 1.3 }}>
                    {item.item}
                  </p>
                  {item.instrucciones && (
                    <p style={{ fontSize: 12, color: GRAY, margin: "4px 0 0", lineHeight: 1.6, whiteSpace: "pre-line" }}>
                      {item.instrucciones}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ── Firma ────────────────────────────────────────────────── */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 32, breakInside: "avoid" as const }}>
            <div style={{ textAlign: "center", width: 220 }}>
              {recomendacion.especialista && (
                <p style={{ fontSize: 12, fontWeight: 600, color: GRAY, marginBottom: 28 }}>
                  {recomendacion.especialista.nombre}
                </p>
              )}
              <div style={{ borderBottom: `1.5px solid ${DARK}`, marginBottom: 5 }} />
              <p style={{ fontSize: 9.5, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>
                Firma del Profesional
              </p>
            </div>
          </div>

          {/* ── Pie de página ─────────────────────────────────────────── */}
          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ fontSize: 9, color: LIGHT }}>
              Documento clínico confidencial · Uso exclusivo del propietario y del equipo veterinario.
            </p>
            <p style={{ fontSize: 9, color: LIGHT, textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {ficha.nombre.toUpperCase()} · {fecha.dia}/{fecha.mes}/{fecha.año}
            </p>
          </div>

        </div>
      </div>
    </>
  )
};