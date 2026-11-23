import { auth, signOut } from "@/auth"
import { redirect } from "next/navigation"
import { Suspense } from "react"
import Link from "next/link"
import { NavLink } from "@/components/ui/NavLink"
import { Icon } from "@/components/ui/Icon"
import { prisma } from "@/lib/prisma"
import { ToastNotification } from "@/components/ui/ToastNotification"
import { MarcoApp } from "@/components/ui/MarcoApp"
import { BuscadorGlobal } from "@/components/ui/BuscadorGlobal"
import { tienePermiso, type Accion, type Modulo } from "@/lib/permisos"
import { crearLogo } from "@/lib/logo"

type NavItem = { href: string; label: string; icon: string; visible: boolean }

const DICCIONARIO: Record<
  string,
  {
    fichas: string
    fichasIcon: string
    atenciones: string
    recomendaciones: string
    botonAtencion: string
    botonCita: string
  }
> = {
  veterinaria: {
    fichas: "Pacientes",
    fichasIcon: "pets",
    atenciones: "Historia Clínica",
    recomendaciones: "Fórmulas",
    botonAtencion: "Nueva atención",
    botonCita: "Nueva cita",
  },
  taller: {
    fichas: "Vehículos",
    fichasIcon: "directions_car",
    atenciones: "Órdenes de Trabajo",
    recomendaciones: "Recomendaciones",
    botonAtencion: "Nueva orden",
    botonCita: "Nueva revisión",
  },
  barberia: {
    fichas: "Fichas/Clientes",
    fichasIcon: "face",
    atenciones: "Historial de Servicios",
    recomendaciones: "Fórmulas Capilares",
    botonAtencion: "Nuevo servicio",
    botonCita: "Nuevo turno",
  },
  medico: {
    fichas: "Pacientes",
    fichasIcon: "personal_injury",
    atenciones: "Historia Clínica",
    recomendaciones: "Recetas Médicas",
    botonAtencion: "Nueva atención",
    botonCita: "Nueva cita",
  },
}

function navPorConfiguracion(rol: string, tipoNegocio: string, modulosActivos: string[]) {
  const nombres = DICCIONARIO[tipoNegocio] || DICCIONARIO["veterinaria"]

  const puede = <M extends Modulo>(modulo: M, accion: Accion<M>) => {
    const tienePermisoRol = tienePermiso(rol, modulo, accion)
    const esOpcional = ["agenda", "fichas", "atenciones", "inventario", "finanzas"].includes(modulo)
    const negocioTieneModulo = esOpcional ? modulosActivos.includes(modulo) : true
    return tienePermisoRol && negocioTieneModulo
  }

  const verFinanzas = puede("finanzas", "ver")

  const operacionBase: NavItem[] = [
    { href: "/", label: "Inicio", icon: "space_dashboard", visible: true },
    { href: "/agenda", label: "Agenda", icon: "calendar_month", visible: puede("agenda", "ver") },
    { href: "/fichas", label: nombres.fichas, icon: nombres.fichasIcon, visible: puede("fichas", "ver") },
    { href: "/clientes", label: "Clientes", icon: "group", visible: true },
    { href: "/atenciones", label: nombres.atenciones, icon: "clinical_notes", visible: puede("atenciones", "ver") },
    {
      href: "/recomendaciones",
      label: nombres.recomendaciones,
      icon: "prescriptions",
      visible: puede("atenciones", "ver") && tienePermiso(rol, "recomendaciones" as any, "ver"),
    },
  ]

  const operacionFinanzas: NavItem[] = [
    { href: "/inventario", label: "Inventario", icon: "inventory_2", visible: puede("inventario", "ver") },
    { href: "/facturas", label: "Facturas", icon: "receipt_long", visible: puede("finanzas", "ver") },
    verFinanzas
      ? { href: "/finanzas", label: "Finanzas", icon: "account_balance_wallet", visible: true }
      : {
          href: "/finanzas/cobros",
          label: "Cobros",
          icon: "account_balance_wallet",
          visible: tienePermiso(rol, "cobros" as any, "ver") && modulosActivos.includes("finanzas"),
        },
    { href: "/recordatorios", label: "Recordatorios", icon: "notifications", visible: true },
  ]

  const admin: NavItem[] = [
    { href: "/admin/usuarios", label: "Equipo y usuarios", icon: "badge", visible: tienePermiso(rol, "usuarios" as any, "ver") },
    { href: "/informes", label: "Informes", icon: "bar_chart_4_bars", visible: tienePermiso(rol, "informes" as any, "ver") },
    { href: "/actividad", label: "Registro de actividad", icon: "history", visible: tienePermiso(rol, "actividad" as any, "ver") },
  ]

  const soloVisibles = (items: NavItem[]) => items.filter((i) => i.visible)
  return { clinica: soloVisibles(operacionBase), operacion: soloVisibles(operacionFinanzas), admin: soloVisibles(admin) }
}

const ROL_LABEL: Record<string, string> = {
  admin: "Administrador",
  especialista: "Especialista",
  recepcionista: "Recepción",
  asistente: "Asistente",
}

function getIniciales(nombre: string) {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("")
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")

  const usuarioDb = await prisma.usuario.findUnique({
    where: { email: session.user.email ?? "" },
    include: { negocio: true },
  })

  const negocio = usuarioDb?.negocio
  const negocioId = negocio?.id
  const tipoNegocio = negocio?.tipoNegocio || "veterinaria"
  const modulosActivos = negocio?.modulosActivos || []
  const nombreNegocio = negocio?.nombre || "Mi Negocio"
  const logoNegocio = negocio?.logoUrl || crearLogo(nombreNegocio, tipoNegocio, "dark")

  const nav = navPorConfiguracion(session.user.rol ?? "asistente", tipoNegocio, modulosActivos)
  const dicc = DICCIONARIO[tipoNegocio] || DICCIONARIO["veterinaria"]

  const ahora = new Date()
  const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
  const finHoy = new Date(inicioHoy.getTime() + 24 * 60 * 60 * 1000 - 1)
  const en7dias = new Date(inicioHoy.getTime() + 7 * 24 * 60 * 60 * 1000)

  const [productos, recordatoriosPendientes, citasHoyCount, controlesCount] = await Promise.all([
    prisma.producto.findMany({ where: { negocioId }, select: { stock: true, stockMinimo: true } }),
    prisma.recordatorio.count({ where: { negocioId, completado: false } }),
    prisma.cita.count({
      where: { negocioId, fecha: { gte: inicioHoy, lte: finHoy }, estado: { notIn: ["cancelada", "atendida"] } },
    }),
    prisma.controlPreventivo.count({ where: { ficha: { negocioId }, proximaFecha: { not: null, lte: en7dias } } }),
  ])
  const productosMinimo = productos.filter((p) => p.stockMinimo > 0 && p.stock <= p.stockMinimo).length
  const alertasRecordatorios = citasHoyCount + controlesCount + recordatoriosPendientes + productosMinimo

  async function logout() {
    "use server"
    await signOut({ redirectTo: "/login" })
  }

  const iniciales = getIniciales(session.user.name ?? "U")

  const menu = (
    <>
      <div className="px-[14px] pt-4 pb-4 flex flex-col items-center border-b border-white/10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={logoNegocio} alt={nombreNegocio} style={{ width: 200, height: 142, objectFit: "contain" }} />
      </div>

      <nav className="flex-1 overflow-y-auto px-[10px] py-3">
        {nav.clinica.length > 0 && (
          <>
            <p className="mx-3 mt-2.5 mb-1.5 font-mono text-[10px] tracking-[0.12em] text-zinc-500 uppercase">Atención</p>
            <div className="flex flex-col gap-1">
              {nav.clinica.map((item) => (
                <NavLink key={item.href} href={item.href} icon={item.icon} label={item.label} />
              ))}
            </div>
          </>
        )}

        {nav.operacion.length > 0 && (
          <>
            <p className="mx-3 mt-4 mb-1.5 font-mono text-[10px] tracking-[0.12em] text-zinc-500 uppercase">Operación</p>
            <div className="flex flex-col gap-1">
              {nav.operacion.map((item) => (
                <NavLink
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  label={item.label}
                  badge={item.href === "/inventario" ? productosMinimo : item.href === "/recordatorios" ? alertasRecordatorios : undefined}
                />
              ))}
            </div>
          </>
        )}

        {nav.admin.length > 0 && (
          <>
            <p className="mx-3 mt-4 mb-1.5 font-mono text-[10px] tracking-[0.12em] text-zinc-500 uppercase">Administración</p>
            <div className="flex flex-col gap-1">
              {nav.admin.map((item) => (
                <NavLink key={item.href} href={item.href} icon={item.icon} label={item.label} />
              ))}
            </div>
          </>
        )}
      </nav>

      <div className="p-3 border-t border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-500/30 bg-emerald-500/15 font-semibold text-[12.5px] text-emerald-400">
            {iniciales}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-medium text-zinc-100">{session.user.name}</p>
            <p className="text-[11.5px] text-zinc-500">{ROL_LABEL[session.user.rol ?? ""] ?? session.user.rol}</p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              title="Cerrar sesión"
              className="flex items-center justify-center rounded-lg p-1.5 text-zinc-500 hover:bg-white/5 hover:text-zinc-200 transition-colors"
            >
              <Icon name="logout" size={18} />
            </button>
          </form>
        </div>
      </div>
    </>
  )

  const encabezado = (
    <>
      <BuscadorGlobal tipoNegocio={tipoNegocio} />
      <div className="ml-auto flex items-center gap-2">
        {tienePermiso(session.user.rol, "atenciones", "editar") && modulosActivos.includes("atenciones") && (
          <Link
            href="/atenciones"
            className="flex items-center gap-[7px] rounded-lg border border-white/10 bg-white/5 px-[11px] sm:px-[13px] py-2 text-[13px] text-zinc-200 hover:bg-white/10 hover:border-white/20 transition-colors"
          >
            <Icon name="medical_services" size={17} className="text-emerald-400" />
            <span className="hidden sm:inline">{dicc.botonAtencion}</span>
          </Link>
        )}
        {tienePermiso(session.user.rol, "agenda", "editar") && modulosActivos.includes("agenda") && (
          <Link
            href="/agenda/nueva"
            className="flex items-center gap-[7px] rounded-lg bg-emerald-500 px-[11px] sm:px-[15px] py-[9px] text-[13px] font-bold text-zinc-950 hover:bg-emerald-400 shadow-[0_0_20px_-4px_rgba(16,185,129,0.5)] transition-colors"
          >
            <Icon name="add" size={17} className="text-zinc-950" />
            <span className="hidden sm:inline">{dicc.botonCita}</span>
          </Link>
        )}
      </div>
    </>
  )

  return (
    <>
      <MarcoApp menu={menu} encabezado={encabezado}>
        {children}
      </MarcoApp>
      <Suspense>
        <ToastNotification />
      </Suspense>
    </>
  )
}