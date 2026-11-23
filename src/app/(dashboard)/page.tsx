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

const DICCIONARIO: Record<
  string,
  {
    tituloAtencion: string
    tituloFicha: string
    iconoFicha: string
    citasPendientes: string
    citaSingular: string
    citaPlural: string
    sinCitasHoy: string
    proximasCitas: string
    sinProximas: string
    nuevaCita: string
  }
> = {
  veterinaria: {
    tituloAtencion: "Consultas hoy",
    tituloFicha: "Nuevo paciente",
    iconoFicha: "pets",
    citasPendientes: "Citas pendientes",
    citaSingular: "cita programada",
    citaPlural: "citas programadas",
    sinCitasHoy: "Sin citas para hoy",
    proximasCitas: "Próximas citas",
    sinProximas: "Sin citas próximas",
    nuevaCita: "Nueva cita",
  },
  taller: {
    tituloAtencion: "Órdenes de trabajo",
    tituloFicha: "Nuevo vehículo",
    iconoFicha: "directions_car",
    citasPendientes: "Revisiones pendientes",
    citaSingular: "revisión programada",
    citaPlural: "revisiones programadas",
    sinCitasHoy: "Sin revisiones para hoy",
    proximasCitas: "Próximas revisiones",
    sinProximas: "Sin revisiones próximas",
    nuevaCita: "Nueva revisión",
  },
  barberia: {
    tituloAtencion: "Servicios de hoy",
    tituloFicha: "Nueva ficha",
    iconoFicha: "face",
    citasPendientes: "Turnos pendientes",
    citaSingular: "turno programado",
    citaPlural: "turnos programados",
    sinCitasHoy: "Sin turnos para hoy",
    proximasCitas: "Próximos turnos",
    sinProximas: "Sin turnos próximos",
    nuevaCita: "Nuevo turno",
  },
  medico: {
    tituloAtencion: "Consultas hoy",
    tituloFicha: "Nuevo paciente",
    iconoFicha: "personal_injury",
    citasPendientes: "Citas pendientes",
    citaSingular: "cita programada",
    citaPlural: "citas programadas",
    sinCitasHoy: "Sin citas para hoy",
    proximasCitas: "Próximas citas",
    sinProximas: "Sin citas próximas",
    nuevaCita: "Nueva cita",
  },
}

export default async function HomePage() {
  const session = await auth()
  const email = session?.user?.email ?? ""

  const usuarioDb = await prisma.usuario.findUnique({
    where: { email },
    select: { negocioId: true, negocio: { select: { tipoNegocio: true } } },
  })

  const negocioId = usuarioDb?.negocioId || undefined
  const nombre = session?.user.name?.split(" ")[0] ?? "Usuario"
  const rol = session?.user.rol

  const tipoNegocio = usuarioDb?.negocio?.tipoNegocio || (session?.user.tipoNegocio as string) || "veterinaria"
  const dicc = DICCIONARIO[tipoNegocio] || DICCIONARIO["veterinaria"]

  const hoy = new Date()
  const inicioHoy = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate())
  const finHoy = new Date(inicioHoy.getTime() + 24 * 60 * 60 * 1000)

  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
  const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0, 23, 59, 59)

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
      select: { stock: true, stockMinimo: true },
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
      iconClass: "text-emerald-600 dark:text-emerald-400",
      bgClass: "bg-emerald-50 border-emerald-200 dark:bg-emerald-500/15 dark:border-emerald-500/20",
      valueClass: "text-slate-900 dark:text-zinc-100",
    },
    {
      label: dicc.citasPendientes,
      value: citasPendientes,
      icon: "calendar_month",
      href: "/agenda",
      iconClass: "text-cyan-600 dark:text-cyan-400",
      bgClass: "bg-cyan-50 border-cyan-200 dark:bg-cyan-500/15 dark:border-cyan-500/20",
      valueClass: "text-cyan-700 dark:text-cyan-400",
    },
    {
      label: "Stock bajo mínimo",
      value: productosMinimo,
      icon: "inventory_2",
      href: "/inventario",
      iconClass: productosMinimo > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-500 dark:text-zinc-400",
      bgClass:
        productosMinimo > 0
          ? "bg-amber-50 border-amber-200 dark:bg-amber-500/15 dark:border-amber-500/25"
          : "bg-slate-100 border-slate-200 dark:bg-white/5 dark:border-white/10",
      valueClass: productosMinimo > 0 ? "text-amber-600 dark:text-amber-400" : "text-slate-800 dark:text-zinc-200",
    },
    {
      label: "Ingresos del mes",
      value: formatCOP(ingresosMesTotal),
      icon: "account_balance_wallet",
      href: "/finanzas",
      visible: tienePermiso(rol, "finanzas", "ver"),
      iconClass: "text-emerald-600 dark:text-emerald-400",
      bgClass: "bg-emerald-50 border-emerald-200 dark:bg-emerald-500/15 dark:border-emerald-500/25",
      valueClass: "text-emerald-700 dark:text-emerald-400",
      mono: true,
    },
    {
      label: "Nuevos clientes",
      value: nuevosClientesMes,
      icon: "group_add",
      href: "/clientes",
      iconClass: "text-teal-600 dark:text-teal-400",
      bgClass: "bg-teal-50 border-teal-200 dark:bg-teal-500/15 dark:border-teal-500/20",
      valueClass: "text-teal-700 dark:text-teal-300",
    },
  ]

  return (
    <div>
      <AutoRefresh segundos={60} />

      <div className="mb-6">
        <h1 className="text-[22px] font-bold tracking-[-0.015em] text-slate-900 dark:text-zinc-50">
          Buenos días, {nombre}
        </h1>
        <p className="mt-[5px] font-mono text-[11.5px] tracking-[0.06em] text-slate-500 dark:text-zinc-500 uppercase">
          {hoy.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-3.5 mb-7" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(150px,1fr))" }}>
        {kpis
          .filter((k) => k.visible !== false)
          .map((k) => (
            <Link
              key={k.label}
              href={k.href}
              className="group flex flex-col rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-zinc-900/70 backdrop-blur-sm p-4 hover:border-emerald-500/50 dark:hover:bg-zinc-900 transition-all"
            >
              <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl border ${k.bgClass}`}>
                <Icon name={k.icon} size={20} className={k.iconClass} />
              </div>
              <p className={`text-[22px] font-bold leading-none ${k.valueClass} ${k.mono ? "font-mono" : ""}`}>
                {k.value}
              </p>
              <p className="mt-1.5 text-[12px] text-slate-500 dark:text-zinc-400 group-hover:text-slate-700 dark:group-hover:text-zinc-300 transition-colors">
                {k.label}
              </p>
            </Link>
          ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        {/* Agenda de hoy */}
        <div className="rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-zinc-900/70 backdrop-blur-sm">
          <div className="flex items-center justify-between px-[18px] py-[14px] border-b border-slate-100 dark:border-white/10">
            <div>
              <p className="text-[14px] font-semibold text-slate-900 dark:text-zinc-100">Agenda de hoy</p>
              <p className="font-mono text-[10.5px] tracking-[0.06em] text-slate-400 dark:text-zinc-500 uppercase">
                {citasHoy.length} {citasHoy.length === 1 ? dicc.citaSingular : dicc.citaPlural}
              </p>
            </div>
            <Link
              href="/agenda"
              className="flex items-center gap-1 text-[12.5px] font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 dark:hover:text-emerald-300 transition-colors"
            >
              Ver agenda
              <Icon name="arrow_forward" size={15} className="text-emerald-600 dark:text-emerald-400" />
            </Link>
          </div>

          {citasHoy.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-zinc-500">
              <Icon name="event_available" size={36} className="mb-2 opacity-40 text-emerald-500 dark:text-emerald-400" />
              <p className="text-[12.5px]">{dicc.sinCitasHoy}</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {citasHoy.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3.5 px-[18px] py-3 hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors"
                >
                  <div className="flex w-[60px] shrink-0 flex-col items-center">
                    <span className="font-mono text-[12.5px] font-semibold text-emerald-600 dark:text-emerald-400">
                      {formatHora(c.fecha)}
                    </span>
                  </div>
                  <div
                    className="h-8 w-[3px] shrink-0 rounded-full"
                    style={{ backgroundColor: c.estado === "confirmada" ? "#10B981" : "#64748B" }}
                  />
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-medium text-slate-900 dark:text-zinc-100 truncate">
                      {c.ficha?.nombre || "Sin nombre"}
                    </p>
                    <p className="text-[12px] text-slate-500 dark:text-zinc-400 truncate">
                      {c.ficha?.cliente?.nombre || "Sin cliente"}
                    </p>
                  </div>
                  <span
                    className={`ml-auto shrink-0 rounded-full px-2.5 py-[3px] font-mono text-[10.5px] font-medium border ${
                      c.estado === "confirmada"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/25"
                        : c.estado === "atendida"
                        ? "bg-slate-100 text-slate-600 border-slate-200 dark:bg-white/5 dark:text-zinc-400 dark:border-white/10"
                        : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/15 dark:text-amber-400 dark:border-amber-500/25"
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
          {(productosMinimo > 0 || recordatoriosAbiertos > 0) && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:border-amber-500/25 dark:bg-amber-500/10">
              <div className="px-4 py-3 border-b border-amber-200 dark:border-amber-500/20">
                <p className="flex items-center gap-1.5 text-[13px] font-semibold text-amber-800 dark:text-amber-300">
                  <Icon name="warning" size={16} className="text-amber-600 dark:text-amber-400" />
                  Alertas pendientes
                </p>
              </div>
              <div className="p-4 flex flex-col gap-2">
                {productosMinimo > 0 && (
                  <Link
                    href="/inventario"
                    className="flex items-center gap-2.5 text-[12.5px] text-amber-900 hover:text-amber-700 dark:text-amber-200/90 dark:hover:text-amber-300 transition-colors"
                  >
                    <Icon name="inventory_2" size={15} className="text-amber-600 dark:text-amber-400" />
                    <span>{productosMinimo} producto{productosMinimo !== 1 ? "s" : ""} bajo stock mínimo</span>
                  </Link>
                )}
                {recordatoriosAbiertos > 0 && (
                  <Link
                    href="/recordatorios"
                    className="flex items-center gap-2.5 text-[12.5px] text-amber-900 hover:text-amber-700 dark:text-amber-200/90 dark:hover:text-amber-300 transition-colors"
                  >
                    <Icon name="notifications" size={15} className="text-amber-600 dark:text-amber-400" />
                    <span>{recordatoriosAbiertos} recordatorio{recordatoriosAbiertos !== 1 ? "s" : ""} sin completar</span>
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Próximas citas / turnos */}
          <div className="rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-zinc-900/70 backdrop-blur-sm">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-white/10">
              <p className="text-[13px] font-semibold text-slate-900 dark:text-zinc-100">{dicc.proximasCitas}</p>
            </div>
            {citasProximas.length === 0 ? (
              <p className="px-4 py-6 text-center text-[12px] text-slate-400 dark:text-zinc-500">{dicc.sinProximas}</p>
            ) : (
              <div className="p-3 flex flex-col gap-1">
                {citasProximas.map((c) => (
                  <Link
                    key={c.id}
                    href="/agenda"
                    className="flex flex-col rounded-lg px-3 py-2 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium text-slate-900 dark:text-zinc-100">{c.ficha?.nombre || "Sin nombre"}</span>
                      <span className="font-mono text-[11.5px] text-emerald-600 dark:text-emerald-400">
                        {c.fecha.toLocaleDateString("es-CO", { day: "2-digit", month: "short" })}
                      </span>
                    </div>
                    <span className="text-[12px] text-slate-500 dark:text-zinc-400">{c.ficha?.cliente?.nombre || "Sin cliente"}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Acceso rápido */}
          <div className="rounded-2xl border border-slate-200 bg-white dark:border-white/10 dark:bg-zinc-900/70 backdrop-blur-sm">
            <div className="px-4 py-3 border-b border-slate-100 dark:border-white/10">
              <p className="text-[13px] font-semibold text-slate-900 dark:text-zinc-100">Acceso rápido</p>
            </div>
            <div className="grid grid-cols-2 gap-2 p-3">
              {[
                { href: "/fichas/nueva", icon: dicc.iconoFicha, label: dicc.tituloFicha, visible: tienePermiso(rol, "fichas", "editar") },
                { href: "/clientes/nuevo", icon: "person_add", label: "Nuevo cliente", visible: tienePermiso(rol, "clientes", "editar") },
                { href: "/agenda/nueva", icon: "event_available", label: dicc.nuevaCita, visible: tienePermiso(rol, "agenda", "editar") },
                { href: "/inventario", icon: "inventory_2", label: "Inventario", visible: tienePermiso(rol, "inventario", "ver") },
              ]
                .filter((a) => a.visible)
                .map((a) => (
                  <Link
                    key={a.href}
                    href={a.href}
                    className="group flex flex-col items-center gap-2 rounded-xl border border-slate-100 bg-slate-50/70 dark:border-white/5 dark:bg-white/[0.03] py-3.5 px-2 text-center hover:border-emerald-500/40 hover:bg-emerald-50/60 dark:hover:bg-emerald-500/10 transition-all"
                  >
                    <Icon name={a.icon} size={22} className="text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform" />
                    <span className="text-[12px] text-slate-700 dark:text-zinc-300 group-hover:text-slate-950 dark:group-hover:text-white">{a.label}</span>
                  </Link>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}