import Link from "next/link"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { Icon } from "@/components/ui/Icon"
import { tienePermiso } from "@/lib/permisos"
import type { Metadata } from "next"
import { AutoRefresh } from "@/components/ui/AutoRefresh"

export const metadata: Metadata = { title: "Inicio" }

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n)
}

function formatHora(fecha: Date) {
  return fecha.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: true })
}

// DICCIONARIO CAMALEÓN ACTUALIZADO
const DICCIONARIO: Record<string, { tituloAtencion: string; tituloFicha: string; iconoFicha: string }> = {
  veterinaria: { tituloAtencion: "Consultas hoy", tituloFicha: "Nuevo paciente", iconoFicha: "pets" },
  taller: { tituloAtencion: "Órdenes de trabajo", tituloFicha: "Nuevo vehículo", iconoFicha: "directions_car" },
  barberia: { tituloAtencion: "Servicios de hoy", tituloFicha: "Nueva ficha", iconoFicha: "face" },
  medico: { tituloAtencion: "Consultas hoy", tituloFicha: "Nuevo paciente", iconoFicha: "personal_injury" },
}

export default async function HomePage() {
  const session = await auth()
  const email = session?.user?.email ?? ""
  
  // Extracción segura del Negocio ID para blindar el Dashboard
  const usuarioDb = await prisma.usuario.findUnique({
    where: { email },
    select: { negocioId: true, negocio: { select: { tipoNegocio: true } } }
  })
  
  const negocioId = usuarioDb?.negocioId || undefined // Se usa undefined para evitar romper la BD si falla
  const nombre = session?.user.name?.split(" ")[0] ?? "Usuario"
  const rol = session?.user.rol
  
  const tipoNegocio = usuarioDb?.negocio?.tipoNegocio || session?.user.tipoNegocio as string || "veterinaria"
  const dicc = DICCIONARIO[tipoNegocio] || DICCIONARIO["veterinaria"]

  const hoy = new Date()
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const finHoy = new Date(inicioHoy.getTime() + 24 * 60 * 60 * 1000)

  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59)

  // EL MURO DE CONTENCIÓN APLICADO A TODAS LAS MÉTRICAS SIMULTÁNEAMENTE
  const [
    atencionesHoy,
    citasHoy,
    citasPendientes,
    productos,
    ingresosMes,
    recordatoriosAbiertos,
    citasProximas,
    nuevosClientesMes,
  ] = await Promise.all([
    prisma.atencion.count({ where: { negocioId, fecha: { gte: inicioHoy, lt: finHoy } } }),
    prisma.cita.findMany({
      where: { negocioId, fecha: { gte: inicioHoy, lt: finHoy } },
      orderBy: { fecha: "asc" },
      include: {
        ficha: {
          select: { nombre: true, tipo: true, cliente: { select: { nombre: true } } },
        },
      },
    }),
    prisma.cita.count({
      where: { negocioId, fecha: { gte: inicioHoy }, estado: { in: ["pendiente", "confirmada"] } },
    }),
    prisma.producto.findMany({ 
      where: { negocioId }, 
      select: { stock: true, stockMinimo: true } 
    }),
    prisma.factura.aggregate({
      _sum: { total: true },
      where: { negocioId, fecha: { gte: inicioMes, lte: finMes } },
    }),
    prisma.recordatorio.count({ where: { negocioId, completado: false } }),
    prisma.cita.findMany({
      where: { negocioId, fecha: { gte: hoy }, estado: { in: ["pendiente", "confirmada"] } },
      orderBy: { fecha: "asc" },
      take: 3,
      include: {
        ficha: {
          select: { nombre: true, cliente: { select: { nombre: true } } },
        },
      },
    }),
    prisma.cliente.count({ where: { negocioId, creadoEn: { gte: inicioMes } } }),
  ])

  const productosMinimo = productos.filter(
    (p) => p.stockMinimo > 0 && p.stock <= p.stockMinimo
  ).length
  const ingresosMesTotal = Number(ingresosMes._sum.total ?? 0)

  const kpis = [
    {
      label: dicc.tituloAtencion,
      value: atencionesHoy,
      icon: "clinical_notes",
      href: "/atenciones",
      accent: "#1E3A6E",
      bg: "#E8EEFB",
    },
    {
      label: "Citas pendientes",
      value: citasPendientes,
      icon: "calendar_month",
      href: "/agenda",
      accent: "#7C3AED",
      bg: "#EDE9FE",
    },
    {
      label: "Stock bajo mínimo",
      value: productosMinimo,
      icon: "inventory_2",
      href: "/inventario",
      accent: productosMinimo > 0 ? "#B45309" : "#64748B",
      bg: productosMinimo > 0 ? "#FEF3C7" : "#F1F5F9",
    },
    {
      label: "Ingresos del mes",
      value: formatCOP(ingresosMesTotal),
      icon: "account_balance_wallet",
      href: "/finanzas",
      visible: tienePermiso(rol, "finanzas", "ver"),
      accent: "#059669",
      bg: "#D1FAE5",
      mono: true,
    },
    {
      label: "Nuevos clientes",
      value: nuevosClientesMes,
      icon: "group_add",
      href: "/clientes",
      accent: "#2563EB",
      bg: "#DBEAFE",
    },
  ]

  return (
    <div>
      <AutoRefresh segundos={60} />
      {/* Saludo */}
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold tracking-[-0.015em] text-[#0F1720]">
          Buenos días, {nombre}
        </h1>
        <p className="mt-[5px] font-mono text-[11.5px] tracking-[0.04em] text-[#64748B] uppercase">
          {hoy.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-3.5 mb-7" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))" }}>
        {kpis.filter((k) => k.visible !== false).map((k) => (
          <Link
            key={k.label}
            href={k.href}
            className="flex flex-col rounded-xl border border-[#E2E8F0] bg-white p-4 hover:border-[#1E3A6E] transition-colors"
          >
            <div
              className="mb-3 flex h-9 w-9 items-center justify-center rounded-[9px]"
              style={{ backgroundColor: k.bg }}
            >
              <Icon name={k.icon} size={20} style={{ color: k.accent }} />
            </div>
            <p
              className={`text-[22px] font-bold leading-none ${k.mono ? "font-mono" : ""}`}
              style={{ color: k.accent }}
            >
              {k.value}
            </p>
            <p className="mt-1.5 text-[12px] text-[#64748B]">{k.label}</p>
          </Link>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Agenda de hoy */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white">
          <div
            className="flex items-center justify-between px-[18px] py-[13px]"
            style={{ borderBottom: "1px solid #EEF2F6" }}
          >
            <div>
              <p className="text-[14px] font-semibold text-[#0F1720]">Agenda de hoy</p>
              <p className="font-mono text-[10.5px] tracking-[0.06em] text-[#94A3B8] uppercase">
                {citasHoy.length} {citasHoy.length === 1 ? "cita" : "citas"} programada{citasHoy.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Link
              href="/agenda"
              className="flex items-center gap-1 text-[12.5px] text-[#1E3A6E] hover:underline"
            >
              Ver agenda
              <Icon name="arrow_forward" size={15} className="text-[#1E3A6E]" />
            </Link>
          </div>

          {citasHoy.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-[#94A3B8]">
              <Icon name="event_available" size={36} className="mb-2 opacity-40" />
              <p className="text-[12.5px]">Sin citas para hoy</p>
            </div>
          ) : (
            <div>
              {citasHoy.map((c, i) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3.5 px-[18px] py-3 hover:bg-[#F8FAFC] transition-colors"
                  style={{ borderTop: i > 0 ? "1px solid #F1F5F9" : "none" }}
                >
                  <div className="flex w-[54px] shrink-0 flex-col items-center">
                    <span className="font-mono text-[13px] font-semibold text-[#1E3A6E]">
                      {formatHora(c.fecha)}
                    </span>
                  </div>
                  <div
                    className="h-8 w-[3px] shrink-0 rounded-full"
                    style={{ backgroundColor: c.estado === "confirmada" ? "#1E3A6E" : "#E2E8F0" }}
                  />
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-medium text-[#0F1720] truncate">
                      {c.ficha?.nombre || "Sin nombre"}
                    </p>
                    <p className="text-[12px] text-[#64748B] truncate">{c.ficha?.cliente?.nombre || "Sin cliente"}</p>
                  </div>
                  <span
                    className={`ml-auto shrink-0 rounded-full px-2 py-[3px] font-mono text-[10.5px] font-medium ${
                      c.estado === "confirmada"
                        ? "bg-[#D1FAE5] text-[#059669]"
                        : c.estado === "atendida"
                        ? "bg-[#F1F5F9] text-[#64748B]"
                        : "bg-[#FEF3C7] text-[#B45309]"
                    }`}
                  >
                    {c.estado}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Panel lateral */}
        <div className="flex flex-col gap-5">
          {/* Alertas */}
          {(productosMinimo > 0 || recordatoriosAbiertos > 0) && (
            <div className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB]">
              <div className="px-4 py-3" style={{ borderBottom: "1px solid #FDE68A" }}>
                <p className="flex items-center gap-1.5 text-[13px] font-semibold text-[#B45309]">
                  <Icon name="warning" size={16} className="text-[#B45309]" />
                  Alertas pendientes
                </p>
              </div>
              <div className="p-4 flex flex-col gap-2">
                {productosMinimo > 0 && (
                  <Link
                    href="/inventario"
                    className="flex items-center gap-2.5 text-[12.5px] text-[#78350F] hover:text-[#B45309]"
                  >
                    <Icon name="inventory_2" size={15} className="text-[#B45309]" />
                    <span>{productosMinimo} producto{productosMinimo !== 1 ? "s" : ""} bajo stock mínimo</span>
                  </Link>
                )}
                {recordatoriosAbiertos > 0 && (
                  <Link
                    href="/recordatorios"
                    className="flex items-center gap-2.5 text-[12.5px] text-[#78350F] hover:text-[#B45309]"
                  >
                    <Icon name="notifications" size={15} className="text-[#B45309]" />
                    <span>{recordatoriosAbiertos} recordatorio{recordatoriosAbiertos !== 1 ? "s" : ""} sin completar</span>
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Próximas citas */}
          <div className="rounded-xl border border-[#E2E8F0] bg-white">
            <div className="px-4 py-3" style={{ borderBottom: "1px solid #EEF2F6" }}>
              <p className="text-[13px] font-semibold text-[#0F1720]">Próximas citas</p>
            </div>
            {citasProximas.length === 0 ? (
              <p className="px-4 py-6 text-center text-[12px] text-[#94A3B8]">Sin citas próximas</p>
            ) : (
              <div className="p-3 flex flex-col gap-1">
                {citasProximas.map((c) => (
                  <Link
                    key={c.id}
                    href={`/agenda`}
                    className="flex flex-col rounded-[7px] px-3 py-2 hover:bg-[#F8FAFC] transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium text-[#0F1720]">{c.ficha?.nombre || "Sin nombre"}</span>
                      <span className="font-mono text-[11.5px] text-[#64748B]">
                        {c.fecha.toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}
                      </span>
                    </div>
                    <span className="text-[12px] text-[#94A3B8]">{c.ficha?.cliente?.nombre || "Sin cliente"}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Acceso rápido */}
          <div className="rounded-xl border border-[#E2E8F0] bg-white">
            <div className="px-4 py-3" style={{ borderBottom: "1px solid #EEF2F6" }}>
              <p className="text-[13px] font-semibold text-[#0F1720]">Acceso rápido</p>
            </div>
            <div className="grid grid-cols-2 gap-1 p-3">
              {[
                { href: "/fichas/nueva", icon: dicc.iconoFicha, label: dicc.tituloFicha, visible: tienePermiso(rol, "fichas", "editar") },
                { href: "/clientes/nuevo", icon: "person_add", label: "Nuevo cliente", visible: tienePermiso(rol, "clientes", "editar") },
                { href: "/agenda/nueva", icon: "event_available", label: "Nueva cita", visible: tienePermiso(rol, "agenda", "editar") },
                { href: "/inventario", icon: "inventory_2", label: "Inventario", visible: tienePermiso(rol, "inventario", "ver") },
              ].filter((a) => a.visible).map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  className="flex flex-col items-center gap-1.5 rounded-[8px] py-3 px-2 text-center hover:bg-[#F8FAFC] transition-colors"
                >
                  <Icon name={a.icon} size={22} className="text-[#1E3A6E]" />
                  <span className="text-[12px] text-[#475569]">{a.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}