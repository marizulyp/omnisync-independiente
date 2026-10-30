import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Icon } from "@/components/ui/Icon"
import type { MetodoPago, CategoriaEgreso } from "@/generated/prisma/client"
import { requirePermisoPagina } from "@/lib/permisos-server"

const METODO_LABEL: Record<MetodoPago, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  otro: "Otro",
}

const CATEGORIA_LABEL: Record<CategoriaEgreso, string> = {
  insumos: "Insumos",
  nomina: "Nómina",
  servicios: "Servicios",
  arriendo: "Arriendo",
  otro: "Otro",
}

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n)
}

function mesActualISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function sumarMeses(mesISO: string, delta: number) {
  const [y, m] = mesISO.split("-").map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function nombreMes(mesISO: string) {
  const [y, m] = mesISO.split("-").map(Number)
  const d = new Date(y, m - 1, 1)
  return d.toLocaleDateString("es-CO", { month: "long", year: "numeric" })
}

export default async function FinanzasPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string }>
}) {
  await requirePermisoPagina("finanzas", "ver")
  const { mes: mesParam } = await searchParams
  const mes = mesParam && /^\d{4}-\d{2}$/.test(mesParam) ? mesParam : mesActualISO()
  const [y, m] = mes.split("-").map(Number)
  const inicio = new Date(y, m - 1, 1)
  const fin = new Date(y, m, 0, 23, 59, 59, 999)
  const esActual = mes === mesActualISO()

  const [cobros, egresos] = await Promise.all([
    prisma.cobro.findMany({ where: { fecha: { gte: inicio, lte: fin } } }),
    prisma.egreso.findMany({ where: { fecha: { gte: inicio, lte: fin } } }),
  ])

  const totalCobros = cobros.reduce((acc, c) => acc + c.monto, 0)
  const totalEgresos = egresos.reduce((acc, e) => acc + e.monto, 0)
  const gananciaNeta = totalCobros - totalEgresos

  const porMetodo = cobros.reduce<Record<string, number>>((acc, c) => {
    acc[c.metodoPago] = (acc[c.metodoPago] ?? 0) + c.monto
    return acc
  }, {})

  const porCategoria = egresos.reduce<Record<string, number>>((acc, e) => {
    acc[e.categoria] = (acc[e.categoria] ?? 0) + e.monto
    return acc
  }, {})

  const kpis = [
    {
      label: "Total ingresos",
      value: formatCOP(totalCobros),
      sub: `${cobros.length} registro${cobros.length !== 1 ? "s" : ""}`,
      icon: "trending_up",
      accent: "#059669",
      bg: "#D1FAE5",
    },
    {
      label: "Total egresos",
      value: formatCOP(totalEgresos),
      sub: `${egresos.length} registro${egresos.length !== 1 ? "s" : ""}`,
      icon: "trending_down",
      accent: "#DC2626",
      bg: "#FEE2E2",
    },
    {
      label: "Ganancia neta",
      value: formatCOP(gananciaNeta),
      sub: gananciaNeta >= 0 ? "Balance positivo" : "Balance negativo",
      icon: "account_balance_wallet",
      accent: gananciaNeta >= 0 ? "#1E3A6E" : "#DC2626",
      bg: gananciaNeta >= 0 ? "#E8EEFB" : "#FEE2E2",
    },
    {
      label: "Margen",
      value: totalCobros > 0 ? `${Math.round((gananciaNeta / totalCobros) * 100)}%` : "—",
      sub: "Sobre ingresos",
      icon: "pie_chart",
      accent: "#7C3AED",
      bg: "#EDE9FE",
    },
  ]

  return (
    <div>
      {/* Encabezado */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-[18px]">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.015em] text-[#0F1720]">Finanzas</h1>
          <p className="mt-[5px] font-mono text-[11.5px] tracking-[0.04em] text-[#64748B] uppercase">
            {nombreMes(mes).toUpperCase()} · CONTROL INTERNO
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/finanzas/egresos/nuevo"
            className="flex items-center gap-[7px] rounded-[7px] border border-[#E2E8F0] bg-white px-[13px] py-[9px] text-[13px] text-[#334155] hover:bg-[#F8FAFC] transition-colors"
          >
            <Icon name="remove_circle" size={15} className="text-[#DC2626]" />
            Registrar egreso
          </Link>
          <Link
            href="/finanzas/cobros/nuevo"
            title="Ingresos que no son ventas (abonos, otros)"
            className="flex items-center gap-[7px] rounded-[7px] border border-[#E2E8F0] bg-white px-[13px] py-[9px] text-[13px] text-[#334155] hover:bg-[#F8FAFC] transition-colors"
          >
            <Icon name="add_circle" size={15} className="text-[#059669]" />
            Registrar ingreso
          </Link>
          <Link
            href="/facturas/nueva"
            title="Factura + salida de inventario + ingreso, en un solo paso"
            className="flex items-center gap-[7px] rounded-[7px] bg-[#1E3A6E] px-[15px] py-[9px] text-[13px] font-semibold text-white hover:bg-[#162D57] transition-colors"
          >
            <Icon name="point_of_sale" size={15} className="text-white" />
            Nueva venta
          </Link>
        </div>
      </div>

      {/* Navegación de mes */}
      <div className="mb-6 flex items-center gap-2">
        <Link
          href={`/finanzas?mes=${sumarMeses(mes, -1)}`}
          className="flex items-center gap-1 rounded-[7px] border border-[#E2E8F0] bg-white px-3 py-[7px] text-[13px] text-[#475569] hover:bg-[#F8FAFC] transition-colors"
        >
          <Icon name="chevron_left" size={17} className="text-[#94A3B8]" />
          Anterior
        </Link>
        <Link
          href={`/finanzas?mes=${mesActualISO()}`}
          className={`rounded-[7px] border px-3 py-[7px] text-[13px] font-medium transition-colors ${
            esActual
              ? "border-[#1E3A6E] bg-[#E8EEFB] text-[#1E3A6E]"
              : "border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC]"
          }`}
        >
          Mes actual
        </Link>
        <Link
          href={`/finanzas?mes=${sumarMeses(mes, 1)}`}
          className="flex items-center gap-1 rounded-[7px] border border-[#E2E8F0] bg-white px-3 py-[7px] text-[13px] text-[#475569] hover:bg-[#F8FAFC] transition-colors"
        >
          Siguiente
          <Icon name="chevron_right" size={17} className="text-[#94A3B8]" />
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid gap-3.5 mb-6" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px,1fr))" }}>
        {kpis.map((k) => (
          <div
            key={k.label}
            className="flex flex-col rounded-xl border border-[#E2E8F0] bg-white p-4"
          >
            <div
              className="mb-3 flex h-9 w-9 items-center justify-center rounded-[9px]"
              style={{ backgroundColor: k.bg }}
            >
              <Icon name={k.icon} size={20} style={{ color: k.accent }} />
            </div>
            <p className="font-mono text-[20px] font-bold leading-none" style={{ color: k.accent }}>
              {k.value}
            </p>
            <p className="mt-1.5 text-[12px] text-[#64748B]">{k.label}</p>
            <p className="font-mono text-[10.5px] text-[#94A3B8]">{k.sub}</p>
          </div>
        ))}
      </div>

      {/* Desglose */}
      <div className="grid gap-5 lg:grid-cols-2">
        {/* Ingresos por método */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white">
          <div
            className="flex items-center justify-between px-[18px] py-[13px]"
            style={{ borderBottom: "1px solid #EEF2F6" }}
          >
            <p className="text-[14px] font-semibold text-[#0F1720]">Ingresos por método de pago</p>
            <Link
              href="/finanzas/cobros"
              className="flex items-center gap-1 text-[12.5px] text-[#1E3A6E] hover:underline"
            >
              Ver todos
              <Icon name="arrow_forward" size={14} className="text-[#1E3A6E]" />
            </Link>
          </div>
          <div className="p-[18px]">
            {Object.keys(porMetodo).length === 0 ? (
              <p className="text-[12.5px] text-[#94A3B8]">Sin ingresos este mes</p>
            ) : (
              <div className="flex flex-col gap-3">
                {Object.entries(porMetodo).map(([metodo, total]) => {
                  const pct = totalCobros > 0 ? Math.round((total / totalCobros) * 100) : 0
                  return (
                    <div key={metodo}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[13px] text-[#475569]">
                          {METODO_LABEL[metodo as MetodoPago]}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[12px] text-[#94A3B8]">{pct}%</span>
                          <span className="font-mono text-[13px] font-semibold text-[#0F1720]">
                            {formatCOP(total)}
                          </span>
                        </div>
                      </div>
                      <div className="h-[4px] rounded-full bg-[#F1F5F9]">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: "#1E3A6E" }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Egresos por categoría */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white">
          <div
            className="flex items-center justify-between px-[18px] py-[13px]"
            style={{ borderBottom: "1px solid #EEF2F6" }}
          >
            <p className="text-[14px] font-semibold text-[#0F1720]">Egresos por categoría</p>
            <Link
              href="/finanzas/egresos"
              className="flex items-center gap-1 text-[12.5px] text-[#1E3A6E] hover:underline"
            >
              Ver todos
              <Icon name="arrow_forward" size={14} className="text-[#1E3A6E]" />
            </Link>
          </div>
          <div className="p-[18px]">
            {Object.keys(porCategoria).length === 0 ? (
              <p className="text-[12.5px] text-[#94A3B8]">Sin egresos este mes</p>
            ) : (
              <div className="flex flex-col gap-3">
                {Object.entries(porCategoria).map(([cat, total]) => {
                  const pct = totalEgresos > 0 ? Math.round((total / totalEgresos) * 100) : 0
                  return (
                    <div key={cat}>
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-[13px] text-[#475569]">
                          {CATEGORIA_LABEL[cat as CategoriaEgreso]}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[12px] text-[#94A3B8]">{pct}%</span>
                          <span className="font-mono text-[13px] font-semibold text-[#0F1720]">
                            {formatCOP(total)}
                          </span>
                        </div>
                      </div>
                      <div className="h-[4px] rounded-full bg-[#F1F5F9]">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: "#DC2626" }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <p className="mt-5 text-[11.5px] text-[#94A3B8]">
        Control interno de ingresos y egresos. Los ingresos se registran automáticamente al crear una factura.
      </p>
    </div>
  )
}
