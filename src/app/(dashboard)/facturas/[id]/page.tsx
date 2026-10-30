import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { BtnImprimir } from "@/components/ui/BtnImprimir"
import Link from "next/link"
import { requirePermisoPagina } from "@/lib/permisos-server"
import { CLINICA } from "@/config/clinica"
import { auth } from "@/auth"

function normalizar(str: string) {
  return str.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9\s]/g, "").trim().replace(/\s+/g, "_")
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const session = await auth()
  const email = session?.user?.email ?? ""
  const user = await prisma.usuario.findUnique({ where: { email }, select: { negocioId: true } })
  const negocioId = user?.negocioId || undefined

  const factura = await prisma.factura.findFirst({
    where: { id, negocioId }, // Aislamiento en los metadatos
    select: { numero: true, fecha: true, cliente: { select: { nombre: true } } },
  })
  
  if (!factura) return { title: "Factura" }
  const num = String(factura.numero).padStart(4, "0")
  const cli = factura.cliente ? normalizar(factura.cliente.nombre) : "Cliente"
  const f = factura.fecha
  const fecha = `${String(f.getDate()).padStart(2, "0")}${String(f.getMonth() + 1).padStart(2, "0")}${f.getFullYear()}`
  return { title: `Factura_${num}_${cli}_${fecha}` }
}

function fmtCOP(n: number) {
  return `$${n.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

function fmtFecha(d: Date) {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`
}

function calcularEdad(fechaStr: string | null): string {
  if (!fechaStr) return "Desconocida"
  const fecha = new Date(fechaStr)
  const hoy = new Date()
  const años = hoy.getFullYear() - fecha.getFullYear()
  const meses = hoy.getMonth() - fecha.getMonth()
  if (años === 0) {
    const m = meses < 0 ? 12 + meses : meses
    return `${m} ${m === 1 ? "mes" : "meses"}`
  }
  if (años === 1 && meses < 0) return `${12 + meses} meses`
  return `${años} ${años === 1 ? "año" : "años"}`
}

const TEAL = "#1E3A6E"
const DARK = "#0F1720"
const GRAY = "#64748B"
const LIGHT_GRAY = "#94A3B8"
const BORDER = "#E2E8F0"

const LABEL_FICHA: Record<string, string> = {
  veterinaria: "Paciente",
  taller: "Vehículo",
  barberia: "Ficha",
}

const CONFIG_NEGOCIO: Record<string, any> = {
  veterinaria: {
    logo: CLINICA.logo,
    nombre: "Centro Veterinario",
    razonSocial: "Centro Veterinario S.A.S.",
    nit: "NIT 900.000.000-0",
    direccion: "Calle 00 # 00-00 - Ciudad",
    telefono: "Tel. (000) 000 0000",
    celular: "Cel. 300 000 0000",
    email: "contacto@centroveterinario.com",
    subtitulo: "Clínica Veterinaria y Tienda para Mascotas",
  },
  taller: {
    logo: CLINICA.logo,
    nombre: "AutoFix Taller Premium",
    razonSocial: "AutoFix Soluciones Automotrices S.A.S.",
    nit: "NIT 901.123.456-7",
    direccion: "Cra 45 # 10-20 - Medellín",
    telefono: "Tel. (604) 123 4567",
    celular: "Cel. 310 987 6543",
    email: "contacto@autofixpremium.com",
    subtitulo: "Centro Especializado en Mecánica y Mantenimiento",
  },
  barberia: {
    logo: CLINICA.logo,
    nombre: "Style & Grooming",
    razonSocial: "Style & Grooming Barber Shop",
    nit: "NIT 902.987.654-1",
    direccion: "Av. Siempre Viva 742 - Ciudad",
    telefono: "Tel. (604) 987 6543",
    celular: "Cel. 320 123 4567",
    email: "contacto@stylegrooming.com",
    subtitulo: "Barbería Clásica & Estética Masculina",
  }
}

export default async function FacturaDetallePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermisoPagina("facturas", "ver")
  const { id } = await params
  
  const session = await auth()
  const email = session?.user?.email ?? ""
  
  // Extraemos el negocioId y el tipo de negocio
  const usuarioDb = await prisma.usuario.findUnique({
    where: { email },
    select: { negocioId: true, negocio: { select: { tipoNegocio: true } } }
  })
  
  const negocioId = usuarioDb?.negocioId || undefined
  const tipoNegocio = usuarioDb?.negocio?.tipoNegocio || (session?.user as any)?.tipoNegocio || "veterinaria"
  const labelFicha = LABEL_FICHA[tipoNegocio] || "Registro"
  const infoNegocio = CONFIG_NEGOCIO[tipoNegocio] || CONFIG_NEGOCIO["veterinaria"]

  // EL MURO DE CONTENCIÓN AL ABRIR LA FACTURA
  const factura = await prisma.factura.findFirst({
    where: { id, negocioId }, // Aislamiento estricto
    include: {
      cliente: true,
      ficha: true,
      items: { orderBy: { orden: "asc" } },
      usuario: { select: { nombre: true } },
    },
  })
  
  if (!factura) notFound()

  const num = String(factura.numero).padStart(4, "0")
  const ivaAmount = factura.subtotal * (factura.porcentajeIva / 100)
  
  const fichaData = factura.ficha?.datosGenerales as any || {}
  const especificaciones = []
  
  if (factura.ficha) {
    if (tipoNegocio === "taller") {
      if (factura.ficha.tipo) especificaciones.push({ label: "Tipo", value: factura.ficha.tipo })
      if (fichaData.marca) especificaciones.push({ label: "Marca", value: fichaData.marca })
      if (fichaData.color) especificaciones.push({ label: "Color", value: fichaData.color })
    } else if (tipoNegocio === "veterinaria") {
      if (factura.ficha.tipo) especificaciones.push({ label: "Especie", value: factura.ficha.tipo })
      if (fichaData.raza) especificaciones.push({ label: "Raza", value: fichaData.raza })
      if (fichaData.fechaNacimiento) especificaciones.push({ label: "Edad", value: calcularEdad(fichaData.fechaNacimiento) })
    } else {
      if (factura.ficha.tipo) especificaciones.push({ label: "Tipo", value: factura.ficha.tipo })
    }
  }

  return (
    <div style={{ fontFamily: "system-ui, -apple-system, sans-serif", color: DARK }}>
      <div className="print:hidden flex items-center gap-3 p-4 border-b border-gray-200 bg-white">
        <Link href="/facturas" className="text-sm text-gray-500 hover:text-gray-700">
          ← Volver a facturas
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

      <div className="overflow-x-auto print:overflow-visible">
      <div
        className="min-w-[600px] print:min-w-0 print:p-0 print:max-w-none print:shadow-none"
        style={{ maxWidth: 760, margin: "0 auto", padding: "32px 32px 48px", background: "#fff" }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={infoNegocio.logo} alt={infoNegocio.nombre} style={{ width: 200, height: 150, objectFit: "contain" }} />

          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: DARK, marginBottom: 2 }}>{infoNegocio.razonSocial}</p>
            <p style={{ fontSize: 11, color: GRAY }}>{infoNegocio.nit}</p>
            <p style={{ fontSize: 11, color: TEAL }}>{infoNegocio.direccion}</p>
            <p style={{ fontSize: 11, color: TEAL }}>{infoNegocio.telefono} · {infoNegocio.celular}</p>
            <p style={{ fontSize: 11, color: TEAL }}>{infoNegocio.email}</p>
          </div>
        </div>

        <p style={{ fontSize: 9.5, fontWeight: 600, color: LIGHT_GRAY, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
          {infoNegocio.subtitulo}
        </p>
        <div style={{ height: 1.5, background: DARK, marginBottom: 18 }} />

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1.2fr", gap: 12, marginBottom: 20, alignItems: "stretch" }}>
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px" }}>
            <p style={{ fontSize: 9, fontWeight: 600, color: TEAL, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Comprobante</p>
            <p style={{ fontSize: 24, fontWeight: 800, color: DARK, lineHeight: 1.15 }}>Factura<br />de venta</p>
          </div>
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px" }}>
            <p style={{ fontSize: 9, fontWeight: 600, color: LIGHT_GRAY, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Número</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: DARK, fontVariantNumeric: "tabular-nums" }}>{num}</p>
          </div>
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: "10px 14px" }}>
            <p style={{ fontSize: 9, fontWeight: 600, color: LIGHT_GRAY, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Fecha</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: DARK, fontVariantNumeric: "tabular-nums" }}>{fmtFecha(factura.fecha)}</p>
          </div>
          <div style={{ border: `1.5px solid ${TEAL}`, borderRadius: 8, padding: "10px 14px" }}>
            <p style={{ fontSize: 9, fontWeight: 600, color: LIGHT_GRAY, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 6 }}>Condición</p>
            <p style={{ fontSize: 16, fontWeight: 700, color: TEAL }}>{factura.condicion}</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: "12px 14px" }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: TEAL, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Cliente</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: DARK, marginBottom: 8 }}>
              {factura.cliente?.nombre ?? "Consumidor final"}
            </p>
            {factura.cliente?.identificacion && (
              <div style={{ display: "flex", gap: 6, marginBottom: 3, fontSize: 11 }}>
                <span style={{ color: TEAL, minWidth: 90 }}>Identificación</span>
                <span style={{ color: DARK, fontFamily: "monospace" }}>{factura.cliente.identificacion}</span>
              </div>
            )}
            {factura.cliente?.direccion && (
              <div style={{ display: "flex", gap: 6, marginBottom: 3, fontSize: 11 }}>
                <span style={{ color: TEAL, minWidth: 90 }}>Dirección</span>
                <span style={{ color: DARK }}>{factura.cliente.direccion}</span>
              </div>
            )}
            {factura.cliente?.telefono && (
              <div style={{ display: "flex", gap: 6, fontSize: 11 }}>
                <span style={{ color: TEAL, minWidth: 90 }}>Teléfono</span>
                <span style={{ color: DARK, fontFamily: "monospace" }}>{factura.cliente.telefono}</span>
              </div>
            )}
          </div>

          <div style={{ border: `1px solid ${BORDER}`, borderRadius: 8, padding: "12px 14px" }}>
            <p style={{ fontSize: 9, fontWeight: 700, color: TEAL, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{labelFicha}</p>
            {factura.ficha ? (
              <>
                <p style={{ fontSize: 15, fontWeight: 700, color: DARK, marginBottom: 8 }}>
                  {factura.ficha.nombre}
                </p>
                {especificaciones.map((esp, i) => (
                  <div key={i} style={{ display: "flex", gap: 6, marginBottom: 3, fontSize: 11 }}>
                    <span style={{ color: LIGHT_GRAY, minWidth: 80 }}>{esp.label}</span>
                    <span style={{ color: DARK, textTransform: "capitalize" }}>{esp.value}</span>
                  </div>
                ))}
                {factura.usuario && (
                  <div style={{ display: "flex", gap: 6, fontSize: 11, marginTop: 6 }}>
                    <span style={{ color: LIGHT_GRAY, minWidth: 80 }}>Atendido por</span>
                    <span style={{ color: DARK }}>{factura.usuario.nombre}</span>
                  </div>
                )}
              </>
            ) : (
              <p style={{ fontSize: 12, color: LIGHT_GRAY, fontStyle: "italic" }}>Sin {labelFicha.toLowerCase()} asociado</p>
            )}
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, marginBottom: 20 }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${DARK}` }}>
              {[
                { label: "#",       align: "left",  width: 28 },
                { label: "Descripción", align: "left",  width: "auto" },
                { label: "Cant.",       align: "right", width: 56 },
                { label: "V. Unitario", align: "right", width: 110 },
                { label: "Total",       align: "right", width: 110 },
              ].map((h) => (
                <th
                  key={h.label}
                  style={{
                    textAlign: h.align as "left" | "right",
                    paddingBottom: 7,
                    paddingTop: 2,
                    fontSize: 9,
                    fontWeight: 700,
                    color: LIGHT_GRAY,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    width: h.width,
                  }}
                >
                  {h.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {factura.items.map((item, idx) => (
              <tr key={item.id} style={{ borderBottom: `1px solid ${BORDER}` }}>
                <td style={{ padding: "9px 0", color: LIGHT_GRAY, fontSize: 11 }}>{idx + 1}</td>
                <td style={{ padding: "9px 8px", color: DARK, fontWeight: 500 }}>{item.descripcion}</td>
                <td style={{ padding: "9px 0", textAlign: "right", color: GRAY }}>{item.cantidad}</td>
                <td style={{ padding: "9px 0", textAlign: "right", color: GRAY }}>{fmtCOP(item.precioUnit)}</td>
                <td style={{ padding: "9px 0", textAlign: "right", fontWeight: 700, color: DARK }}>{fmtCOP(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 28, pageBreakInside: "avoid" }}>
          <div>
            <p style={{ fontSize: 9, fontWeight: 700, color: LIGHT_GRAY, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>Observaciones</p>
            <p style={{ fontSize: 11.5, color: GRAY, lineHeight: 1.6 }}>{factura.observaciones || "—"}</p>
          </div>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ fontSize: 12, color: GRAY }}>Subtotal</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: DARK }}>{fmtCOP(factura.subtotal)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${BORDER}` }}>
              <span style={{ fontSize: 12, color: GRAY }}>IVA {factura.porcentajeIva}%</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: DARK }}>{fmtCOP(ivaAmount)}</span>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 10,
                padding: "12px 16px",
                borderRadius: 8,
                background: DARK,
                color: "#fff",
              }}
            >
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em" }}>Total a pagar</span>
              <span style={{ fontSize: 22, fontWeight: 800 }}>{fmtCOP(factura.total)}</span>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 48, marginBottom: 20, pageBreakInside: "avoid" }}>
          <div>
            <div style={{ borderTop: `1px solid ${DARK}`, paddingTop: 6 }}>
              <p style={{ fontSize: 9.5, fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: "0.06em" }}>Entregado por</p>
            </div>
          </div>
          <div>
            <div style={{ borderTop: `1px solid ${DARK}`, paddingTop: 6 }}>
              <p style={{ fontSize: 9.5, fontWeight: 700, color: GRAY, textTransform: "uppercase", letterSpacing: "0.06em" }}>Recibido por</p>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingTop: 10, borderTop: `1px solid ${BORDER}` }}>
          <p style={{ fontSize: 8.5, color: LIGHT_GRAY, maxWidth: 340, lineHeight: 1.5 }}>
            Comprobante de venta interno para control administrativo. No constituye factura electrónica con validez tributaria ante la DIAN.
          </p>
          <p style={{ fontSize: 8.5, color: LIGHT_GRAY, textTransform: "uppercase", letterSpacing: "0.05em", whiteSpace: "nowrap" }}>
            {infoNegocio.nombre} · No. {num}
          </p>
        </div>
      </div>
    </div>
    </div>
  )
}