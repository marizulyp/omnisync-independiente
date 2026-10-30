import { prisma } from "@/lib/prisma"
import { requirePermisoPagina } from "@/lib/permisos-server"
import { BtnImprimir } from "@/components/ui/BtnImprimir"
import { Icon } from "@/components/ui/Icon"
import type { EstadoCita } from "@/generated/prisma/client"
import { fechaLocalISO } from "@/lib/fechas"
import { auth } from "@/auth"

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>
}) {
  const { desde: d, hasta: h } = await searchParams
  const primerDia = new Date()
  const desde = /^\d{4}-\d{2}-\d{2}$/.test(d ?? "") ? d! : `${primerDia.getFullYear()}-${String(primerDia.getMonth() + 1).padStart(2, "0")}-01`
  const hasta = /^\d{4}-\d{2}-\d{2}$/.test(h ?? "") ? h! : fechaLocalISO()
  const fmt = (iso: string) => iso.split("-").reverse().join("")
  const ahora = new Date()
  const hhmm = `${String(ahora.getHours()).padStart(2, "0")}${String(ahora.getMinutes()).padStart(2, "0")}`
  return { title: `Informe_OmniSync_${fmt(desde)}_${fmt(hasta)}_${hhmm}` }
}

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n)
}

function primerDiaMes() {
  const d = new Date()
  return fechaLocalISO(new Date(d.getFullYear(), d.getMonth(), 1))
}

function hoyISO() {
  return fechaLocalISO()
}

const ESTADO_LABEL: Record<EstadoCita, string> = {
  pendiente: "Pendiente",
  confirmada: "Confirmada",
  cancelada: "Cancelada",
  atendida: "Atendida",
}

const DICCIONARIO: Record<string, any> = {
  veterinaria: { 
    seccionAtencion: "Atención clínica", iconAtencion: "clinical_notes", item1: "Consultas", item2: "Atendidas", item3: "Nuevas Fichas" 
  },
  taller: { 
    seccionAtencion: "Operación de taller", iconAtencion: "build", item1: "Órdenes", item2: "Entregas", item3: "Nuevos Veh." 
  },
  barberia: { 
    seccionAtencion: "Servicios prestados", iconAtencion: "face_retouching_natural", item1: "Servicios", item2: "Atendidos", item3: "Nuevas Fichas" 
  }
}

export default async function InformesPage({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>
}) {
  await requirePermisoPagina("informes", "ver")

  // 1. EXTRACCIÓN SEGURA DEL NEGOCIO Y APLICACIÓN DEL CAMALEÓN
  const session = await auth()
  const email = session?.user?.email ?? ""
  const usuarioDb = await prisma.usuario.findUnique({
    where: { email },
    select: { negocioId: true, negocio: { select: { tipoNegocio: true, nombre: true } } }
  })
  
  const negocioId = usuarioDb?.negocioId
  const nombreNegocio = usuarioDb?.negocio?.nombre || "Mi Negocio"
  const tipoNegocio = usuarioDb?.negocio?.tipoNegocio || "veterinaria"
  const dicc = DICCIONARIO[tipoNegocio] || DICCIONARIO["veterinaria"]

  if (!negocioId) {
    return <div className="p-8 text-center text-red-500">Error: Usuario sin negocio asignado.</div>
  }

  const { desde: desdeParam, hasta: hastaParam } = await searchParams
  const desde = /^\d{4}-\d{2}-\d{2}$/.test(desdeParam ?? "") ? desdeParam! : primerDiaMes()
  const hasta = /^\d{4}-\d{2}-\d{2}$/.test(hastaParam ?? "") ? hastaParam! : hoyISO()

  const inicio = new Date(`${desde}T00:00:00`)
  const fin = new Date(`${hasta}T23:59:59.999`)
  const rango = { gte: inicio, lte: fin }

  // 2. EL MURO DE CONTENCIÓN: Todo filtrado por negocioId
  const [
    cobros,
    egresos,
    atenciones,
    citas,
    movimientos,
    nuevosClientes,
    nuevasFichas,
    productos,
  ] = await Promise.all([
    prisma.cobro.findMany({
      where: { negocioId, fecha: rango },
      orderBy: { fecha: "asc" },
      include: { cliente: { select: { nombre: true } }, ficha: { select: { nombre: true } } },
    }),
    prisma.egreso.findMany({
      where: { negocioId, fecha: rango },
      orderBy: { fecha: "asc" },
    }),
    prisma.atencion.findMany({ 
      where: { negocioId, fecha: rango }, 
      include: { especialista: { select: { nombre: true } } } 
    }),
    prisma.cita.findMany({ where: { negocioId, fecha: rango } }),
    prisma.movimientoInventario.findMany({ 
      where: { producto: { negocioId }, fecha: rango } // Filtrado a través de la relación de producto
    }),
    prisma.cliente.count({ where: { negocioId, creadoEn: rango } }),
    prisma.ficha.count({ where: { negocioId, creadoEn: rango } }),
    prisma.producto.findMany({ where: { negocioId } }),
  ])

  const totalCobros = cobros.reduce((acc, c) => acc + c.monto, 0)
  const totalEgresos = egresos.reduce((acc, e) => acc + e.monto, 0)
  const gananciaNeta = totalCobros - totalEgresos

  const atencionesPorPersonal = atenciones.reduce<Record<string, number>>((acc, a) => {
    const nombre = a.especialista?.nombre ?? "Sin asignar"
    acc[nombre] = (acc[nombre] ?? 0) + 1
    return acc
  }, {})

  const citasPorEstado = citas.reduce<Record<string, number>>((acc, c) => {
    acc[c.estado] = (acc[c.estado] ?? 0) + 1
    return acc
  }, {})

  const entradas = movimientos.filter((m) => m.tipo === "entrada").reduce((acc, m) => acc + m.cantidad, 0)
  const salidas = movimientos.filter((m) => m.tipo === "salida").reduce((acc, m) => acc + m.cantidad, 0)
  const productosStockBajo = productos.filter(
    (p) => p.stockMinimo > 0 && p.stock <= p.stockMinimo
  ).length

  type MovFinanciero = {
    fecha: Date
    tipo: "Ingreso" | "Egreso"
    numero: string
    concepto: string
    detalle: string
    monto: number
    saldo: number
  }

  const extracto: MovFinanciero[] = []
  cobros.forEach((c, idx) =>
    extracto.push({
      fecha: c.fecha,
      tipo: "Ingreso",
      numero: c.facturaId ? `FAC-${String(c.numero || idx).padStart(4, "0")}` : `ING-${String(c.numero || idx).padStart(4, "0")}`,
      concepto: c.concepto,
      detalle: [c.cliente?.nombre, c.ficha?.nombre].filter(Boolean).join(" · "),
      monto: c.monto,
      saldo: 0,
    })
  )
  egresos.forEach((e, idx) =>
    extracto.push({
      fecha: e.fecha,
      tipo: "Egreso",
      numero: `EGR-${String(idx + 1).padStart(4, "0")}`,
      concepto: e.concepto,
      detalle: [e.proveedor, e.categoria].filter(Boolean).join(" · "),
      monto: e.monto,
      saldo: 0,
    })
  )
  extracto.sort((a, b) => a.fecha.getTime() - b.fecha.getTime())

  let saldoAcumulado = 0
  extracto.forEach((m) => {
    saldoAcumulado += m.tipo === "Ingreso" ? m.monto : -m.monto
    m.saldo = saldoAcumulado
  })

  const ingresoPromedio = cobros.length > 0 ? totalCobros / cobros.length : 0
  const egresoPromedio = egresos.length > 0 ? totalEgresos / egresos.length : 0
  const mayorIngreso = cobros.length > 0 ? Math.max(...cobros.map((c) => c.monto)) : 0
  const mayorEgreso = egresos.length > 0 ? Math.max(...egresos.map((e) => e.monto)) : 0

  const generadoEn = new Date().toLocaleDateString("es-CO", {
    day: "2-digit", month: "long", year: "numeric",
  })

  const excelUrl = `/api/informes/excel?desde=${desde}&hasta=${hasta}`

  return (
    <div>
      <div className="print:hidden flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.015em] text-[#0F1720]">Informes</h1>
          <p className="mt-[5px] font-mono text-[11.5px] tracking-[0.04em] text-[#64748B] uppercase">
            {new Date(`${desde}T12:00:00`).toLocaleDateString("es-CO")} — {new Date(`${hasta}T12:00:00`).toLocaleDateString("es-CO")}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <form method="get" className="flex flex-wrap items-end gap-2">
            <div>
              <label className="mb-1 block font-mono text-[10.5px] tracking-[0.08em] text-[#7C8CA0] uppercase">Desde</label>
              <input name="desde" type="date" defaultValue={desde} className="rounded-[7px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-[7px] font-mono text-[12.5px] text-[#334155] focus:outline-none focus:ring-1 focus:ring-[#1E3A6E]" />
            </div>
            <div>
              <label className="mb-1 block font-mono text-[10.5px] tracking-[0.08em] text-[#7C8CA0] uppercase">Hasta</label>
              <input name="hasta" type="date" defaultValue={hasta} className="rounded-[7px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-[7px] font-mono text-[12.5px] text-[#334155] focus:outline-none focus:ring-1 focus:ring-[#1E3A6E]" />
            </div>
            <button type="submit" className="flex items-center gap-1.5 rounded-[7px] bg-[#1E3A6E] px-[15px] py-[9px] text-[13px] font-semibold text-white hover:bg-[#162D57] transition-colors">
              <Icon name="bar_chart_4_bars" size={17} className="text-white" /> Generar
            </button>
          </form>
          <a href={excelUrl} className="flex items-center gap-1.5 rounded-[7px] border border-[#16A34A] bg-[#F0FDF4] px-[15px] py-[9px] text-[13px] font-semibold text-[#16A34A] hover:bg-[#DCFCE7] transition-colors">
            <Icon name="table_view" size={17} className="text-[#16A34A]" /> Descargar Excel
          </a>
          <BtnImprimir />
        </div>
      </div>

      <div className="print:text-black">
        <div className="mb-6 pb-4 print:border-b-2 print:border-black" style={{ borderBottom: "2px solid #0F1720" }}>
          <h1 className="text-[18px] font-bold text-[#0F1720]">{nombreNegocio} — Informe administrativo</h1>
          <p className="mt-1 font-mono text-[11.5px] text-[#64748B]">Período: {new Date(`${desde}T12:00:00`).toLocaleDateString("es-CO")} – {new Date(`${hasta}T12:00:00`).toLocaleDateString("es-CO")} · Generado el {generadoEn}</p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {/* Resumen financiero */}
          <div className="rounded-xl border border-[#E2E8F0] bg-white">
            <div className="px-[18px] py-[13px]" style={{ borderBottom: "1px solid #EEF2F6" }}>
              <p className="flex items-center gap-2 text-[13.5px] font-semibold text-[#0F1720]"><Icon name="account_balance_wallet" size={17} className="text-[#1E3A6E]" /> Resumen financiero</p>
            </div>
            <div className="p-[18px] grid grid-cols-3 gap-3">
              <div>
                <p className="font-mono text-[10px] tracking-[0.1em] text-[#94A3B8] uppercase">Ingresos</p>
                <p className="font-mono text-[15px] font-bold text-[#059669]">{formatCOP(totalCobros)}</p>
                <p className="font-mono text-[11px] text-[#94A3B8]">{cobros.length} reg.</p>
              </div>
              <div>
                <p className="font-mono text-[10px] tracking-[0.1em] text-[#94A3B8] uppercase">Egresos</p>
                <p className="font-mono text-[15px] font-bold text-[#DC2626]">{formatCOP(totalEgresos)}</p>
                <p className="font-mono text-[11px] text-[#94A3B8]">{egresos.length} reg.</p>
              </div>
              <div>
                <p className="font-mono text-[10px] tracking-[0.1em] text-[#94A3B8] uppercase">Neto</p>
                <p className="font-mono text-[15px] font-bold" style={{ color: gananciaNeta >= 0 ? "#1E3A6E" : "#DC2626" }}>{formatCOP(gananciaNeta)}</p>
              </div>
            </div>
          </div>

          {/* Dinámico: Atención / Servicios */}
          <div className="rounded-xl border border-[#E2E8F0] bg-white">
            <div className="px-[18px] py-[13px]" style={{ borderBottom: "1px solid #EEF2F6" }}>
              <p className="flex items-center gap-2 text-[13.5px] font-semibold text-[#0F1720]"><Icon name={dicc.iconAtencion} size={17} className="text-[#1E3A6E]" /> {dicc.seccionAtencion}</p>
            </div>
            <div className="p-[18px]">
              <div className="mb-3 grid grid-cols-3 gap-3">
                <div>
                  <p className="font-mono text-[10px] tracking-[0.1em] text-[#94A3B8] uppercase">{dicc.item1}</p>
                  <p className="font-mono text-[20px] font-bold text-[#0F1720]">{atenciones.length}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] tracking-[0.1em] text-[#94A3B8] uppercase">{dicc.item2}</p>
                  <p className="font-mono text-[20px] font-bold text-[#0F1720]">{citasPorEstado["atendida"] || 0}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] tracking-[0.1em] text-[#94A3B8] uppercase">{dicc.item3}</p>
                  <p className="font-mono text-[20px] font-bold text-[#0F1720]">{nuevasFichas}</p>
                </div>
              </div>
              {Object.keys(atencionesPorPersonal).length > 0 && (
                <div className="pt-3" style={{ borderTop: "1px solid #F1F5F9" }}>
                  {Object.entries(atencionesPorPersonal).map(([nombre, n]) => (
                    <div key={nombre} className="flex items-center justify-between py-[3px]">
                      <span className="text-[12.5px] text-[#475569]">{nombre}</span>
                      <span className="font-mono text-[12.5px] font-semibold text-[#0F1720]">{n}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Agenda */}
          <div className="rounded-xl border border-[#E2E8F0] bg-white">
            <div className="px-[18px] py-[13px]" style={{ borderBottom: "1px solid #EEF2F6" }}>
              <p className="flex items-center gap-2 text-[13.5px] font-semibold text-[#0F1720]"><Icon name="calendar_month" size={17} className="text-[#1E3A6E]" /> Agenda · {citas.length} cita{citas.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="p-[18px]">
              {citas.length === 0 ? (
                <p className="text-[12.5px] text-[#94A3B8] italic">Sin citas en el período</p>
              ) : (
                Object.entries(citasPorEstado).map(([estado, n]) => (
                  <div key={estado} className="flex items-center justify-between py-[3px]">
                    <span className="text-[12.5px] text-[#475569]">{ESTADO_LABEL[estado as EstadoCita]}</span>
                    <span className="font-mono text-[12.5px] font-semibold text-[#0F1720]">{n}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Inventario y crecimiento */}
          <div className="rounded-xl border border-[#E2E8F0] bg-white">
            <div className="px-[18px] py-[13px]" style={{ borderBottom: "1px solid #EEF2F6" }}>
              <p className="flex items-center gap-2 text-[13.5px] font-semibold text-[#0F1720]"><Icon name="inventory_2" size={17} className="text-[#1E3A6E]" /> Inventario y crecimiento</p>
            </div>
            <div className="p-[18px]">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <p className="font-mono text-[10px] tracking-[0.1em] text-[#94A3B8] uppercase">Entradas</p>
                  <p className="font-mono text-[20px] font-bold text-[#059669]">{entradas}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] tracking-[0.1em] text-[#94A3B8] uppercase">Salidas</p>
                  <p className="font-mono text-[20px] font-bold text-[#DC2626]">{salidas}</p>
                </div>
              </div>
              <div className="pt-3 grid grid-cols-2 gap-3" style={{ borderTop: "1px solid #F1F5F9" }}>
                <div>
                  <p className="font-mono text-[10px] tracking-[0.1em] text-[#94A3B8] uppercase">Stock bajo</p>
                  <p className="font-mono text-[18px] font-bold" style={{ color: productosStockBajo > 0 ? "#B45309" : "#059669" }}>{productosStockBajo}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] tracking-[0.1em] text-[#94A3B8] uppercase">Clientes nuevos</p>
                  <p className="font-mono text-[18px] font-bold text-[#0F1720]">{nuevosClientes}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Resumen estilo banco ── */}
        <div className="mt-6 rounded-xl border border-[#E2E8F0] bg-white overflow-hidden">
          <div className="px-[18px] py-[13px]" style={{ borderBottom: "1px solid #EEF2F6" }}>
            <p className="flex items-center gap-2 text-[13.5px] font-semibold text-[#0F1720]"><Icon name="account_balance" size={17} className="text-[#1E3A6E]" /> Resumen del período</p>
          </div>
          <div className="p-[18px]">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-0" style={{ border: "1px solid #E2E8F0", borderRadius: 8, overflow: "hidden" }}>
              {[
                { label: "Total abonos", value: formatCOP(totalCobros), color: "#059669", sub: `${cobros.length} ingreso${cobros.length !== 1 ? "s" : ""}` },
                { label: "Total cargos", value: formatCOP(totalEgresos), color: "#DC2626", sub: `${egresos.length} egreso${egresos.length !== 1 ? "s" : ""}` },
                { label: "Saldo neto", value: formatCOP(gananciaNeta), color: gananciaNeta >= 0 ? "#1E3A6E" : "#DC2626", sub: gananciaNeta >= 0 ? "Favorable" : "Negativo" },
                { label: "N° movimientos", value: String(extracto.length), color: "#0F1720", sub: "transacciones" },
              ].map((item, i, arr) => (
                <div key={item.label} className="px-5 py-4" style={{ borderRight: i < arr.length - 1 ? "1px solid #E2E8F0" : undefined, background: i === 2 ? "#F8FAFC" : "white" }}>
                  <p className="font-mono text-[10px] tracking-[0.1em] text-[#94A3B8] uppercase mb-1">{item.label}</p>
                  <p className="font-mono text-[16px] font-bold" style={{ color: item.color }}>{item.value}</p>
                  <p className="font-mono text-[11px] text-[#94A3B8] mt-0.5">{item.sub}</p>
                </div>
              ))}
            </div>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-0" style={{ border: "1px solid #E2E8F0", borderRadius: 8, overflow: "hidden" }}>
              {[
                { label: "Ingreso promedio", value: cobros.length > 0 ? formatCOP(ingresoPromedio) : "—", color: "#475569" },
                { label: "Egreso promedio", value: egresos.length > 0 ? formatCOP(egresoPromedio) : "—", color: "#475569" },
                { label: "Mayor ingreso", value: cobros.length > 0 ? formatCOP(mayorIngreso) : "—", color: "#059669" },
                { label: "Mayor egreso", value: egresos.length > 0 ? formatCOP(mayorEgreso) : "—", color: "#DC2626" },
              ].map((item, i, arr) => (
                <div key={item.label} className="px-5 py-3.5" style={{ borderRight: i < arr.length - 1 ? "1px solid #E2E8F0" : undefined }}>
                  <p className="font-mono text-[10px] tracking-[0.1em] text-[#94A3B8] uppercase mb-1">{item.label}</p>
                  <p className="font-mono text-[14px] font-semibold" style={{ color: item.color }}>{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Extracto de movimientos ── */}
        <div className="mt-4 rounded-xl border border-[#E2E8F0] bg-white overflow-hidden">
          <div className="px-[18px] py-[13px]" style={{ borderBottom: "1px solid #EEF2F6" }}>
            <p className="flex items-center gap-2 text-[13.5px] font-semibold text-[#0F1720]">
              <Icon name="receipt_long" size={17} className="text-[#1E3A6E]" /> Extracto de movimientos <span className="font-mono text-[11.5px] font-normal text-[#94A3B8] ml-1">{extracto.length} transaccion{extracto.length !== 1 ? "es" : ""}</span>
            </p>
          </div>
          {extracto.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[#94A3B8]">
              <Icon name="receipt_long" size={40} className="mb-2 opacity-30" />
              <p className="text-[13px]">Sin movimientos en el período seleccionado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0" }}>
                    <th className="text-left px-4 py-3 font-mono text-[10.5px] tracking-[0.08em] text-[#94A3B8] uppercase whitespace-nowrap">Fecha / Hora</th>
                    <th className="text-left px-4 py-3 font-mono text-[10.5px] tracking-[0.08em] text-[#94A3B8] uppercase">N° Doc.</th>
                    <th className="text-left px-4 py-3 font-mono text-[10.5px] tracking-[0.08em] text-[#94A3B8] uppercase">Tipo</th>
                    <th className="text-left px-4 py-3 font-mono text-[10.5px] tracking-[0.08em] text-[#94A3B8] uppercase">Concepto</th>
                    <th className="text-left px-4 py-3 font-mono text-[10.5px] tracking-[0.08em] text-[#94A3B8] uppercase hidden md:table-cell">Detalle</th>
                    <th className="text-right px-4 py-3 font-mono text-[10.5px] tracking-[0.08em] text-[#94A3B8] uppercase">Monto</th>
                    <th className="text-right px-4 py-3 font-mono text-[10.5px] tracking-[0.08em] text-[#94A3B8] uppercase whitespace-nowrap">Saldo acum.</th>
                  </tr>
                </thead>
                <tbody>
                  {extracto.map((mov, i) => (
                    <tr key={`${mov.numero}-${i}`} style={{ borderBottom: "1px solid #F1F5F9" }} className="hover:bg-[#FAFCFF] transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className="font-mono text-[12.5px] text-[#334155]">{mov.fecha.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" })}</p>
                        <p className="font-mono text-[11px] text-[#94A3B8]">{mov.fecha.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}</p>
                      </td>
                      <td className="px-4 py-3 font-mono text-[12px] text-[#94A3B8]">{mov.numero}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold" style={mov.tipo === "Ingreso" ? { background: "#F0FDF4", color: "#15803D" } : { background: "#FEF2F2", color: "#B91C1C" }}>
                          {mov.tipo === "Ingreso" ? "▲" : "▼"} {mov.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[13px] font-medium text-[#0F1720] max-w-[240px]"><p className="truncate">{mov.concepto}</p></td>
                      <td className="px-4 py-3 text-[12.5px] text-[#64748B] hidden md:table-cell max-w-[180px]"><p className="truncate">{mov.detalle || "—"}</p></td>
                      <td className="px-4 py-3 text-right font-mono text-[13px] font-semibold whitespace-nowrap" style={{ color: mov.tipo === "Ingreso" ? "#059669" : "#DC2626" }}>
                        {mov.tipo === "Ingreso" ? "+" : "-"}{formatCOP(mov.monto)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-[12.5px] whitespace-nowrap" style={{ color: mov.saldo >= 0 ? "#1E3A6E" : "#DC2626" }}>{formatCOP(mov.saldo)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <p className="mt-8 text-center font-mono text-[11px] text-[#94A3B8] print:mt-12">{nombreNegocio} · Documento de control interno · {generadoEn}</p>
      </div>
    </div>
  )
}