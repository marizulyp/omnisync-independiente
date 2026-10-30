import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { BtnEliminar } from "@/components/ui/BtnEliminar"
import { DownloadLink } from "@/components/ui/DownloadLink"
import { Icon } from "@/components/ui/Icon"
import { cambiarEstadoCita, eliminarCita } from "./actions"
import type { EstadoCita } from "@/generated/prisma/client"
import { AutoRefresh } from "@/components/ui/AutoRefresh"
import { auth } from "@/auth"

// ─── helpers de fecha ───────────────────────────────────────────────────────

function hoyISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function sumarDias(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function lunesDeSemana(iso: string) {
  const d = new Date(`${iso}T12:00:00`)
  const dow = d.getDay()
  const back = dow === 0 ? 6 : dow - 1
  d.setDate(d.getDate() - back)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function numeroSemana(iso: string) {
  const d = new Date(`${iso}T12:00:00`)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() + 3 - ((d.getDay() + 6) % 7))
  const w1 = new Date(d.getFullYear(), 0, 4)
  return 1 + Math.round(((d.getTime() - w1.getTime()) / 86400000 - 3 + ((w1.getDay() + 6) % 7)) / 7)
}

function fechaLegibleCorta(iso: string) {
  const d = new Date(`${iso}T12:00:00`)
  return d.toLocaleDateString("es-CO", { day: "numeric", month: "short" })
}

function fechaLegibleLarga(iso: string) {
  const d = new Date(`${iso}T12:00:00`)
  return d.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
}

function isoToHHMM(date: Date) {
  return date.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false })
}

// ─── estilos dinámicos ────────────────────────────────────────────────────────

const ESTADO_LABEL: Record<EstadoCita, string> = {
  pendiente:  "Pendiente",
  confirmada: "Confirmada",
  cancelada:  "Cancelada",
  atendida:   "Atendida",
}

const ESTADO_STYLE: Record<EstadoCita, string> = {
  pendiente:  "bg-[#FEF3C7] text-[#B45309]",
  confirmada: "bg-[#D1FAE5] text-[#059669]",
  cancelada:  "bg-[#FEE2E2] text-[#DC2626]",
  atendida:   "bg-[#F1F5F9] text-[#64748B]",
}

const TIPO_COLORS: Record<string, { bg: string; border: string; text: string; dot: string }> = {
  consulta: { bg: "#E3F4F5", border: "#1E3A6E", text: "#0A5561", dot: "#1E3A6E" },
  mantenimiento: { bg: "#E3F4F5", border: "#1E3A6E", text: "#0A5561", dot: "#1E3A6E" },
  reparacion: { bg: "#FEF3E0", border: "#F97316", text: "#C2410C", dot: "#F97316" },
  corte: { bg: "#F0FDF4", border: "#22C55E", text: "#15803D", dot: "#22C55E" },
  default: { bg: "#EFF6FF", border: "#3B82F6", text: "#1D4ED8", dot: "#3B82F6" },
}

const HORAS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18]
const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]

type CitaConRelaciones = Awaited<ReturnType<typeof fetchCitas>>[number]

// EL MURO DE CONTENCIÓN EN LA CONSULTA
async function fetchCitas(inicio: Date, fin: Date, negocioId: string | null) {
  return prisma.cita.findMany({
    where: { negocioId, fecha: { gte: inicio, lte: fin } }, // Aislamiento estricto
    orderBy: { fecha: "asc" },
    include: {
      ficha: { include: { cliente: { select: { nombre: true } } } },
      especialista: { select: { nombre: true } },
    },
  })
}

// ─── componente tarjeta de cita ──────────────────────────────────────────────

function CitaCard({ c, fecha }: { c: CitaConRelaciones; fecha: string }) {
  const tipoKey = c.tipo?.toLowerCase() || "default"
  const col = TIPO_COLORS[tipoKey] || TIPO_COLORS.default
  const deleteAction = eliminarCita.bind(null, c.id, fecha)
  
  return (
    <div
      className="rounded-[6px] px-[8px] py-[6px] mb-1 border-l-[3px] text-[11.5px] leading-[1.3]"
      style={{ backgroundColor: col.bg, borderLeftColor: col.border }}
    >
      <p className="font-semibold truncate" style={{ color: col.text }}>{c.ficha?.nombre || "Sin registro"}</p>
      <p className="truncate capitalize" style={{ color: col.text + "CC" }}>{c.tipo}</p>
      {c.especialista && (
        <p className="truncate text-[10.5px] opacity-70" style={{ color: col.text }}>
          Espec. {c.especialista.nombre.split(" ")[0]}
        </p>
      )}
      <div className="mt-[5px] flex gap-1 flex-wrap">
        <Link
          href={`/agenda/${c.id}/editar`}
          className="rounded px-1.5 py-[2px] text-[10px] font-medium border transition-colors"
          style={{ borderColor: col.border + "66", color: col.text }}
        >
          Editar
        </Link>
        <BtnEliminar action={deleteAction} mensaje="¿Eliminar esta cita?" />
      </div>
    </div>
  )
}

// ─── vista semana ────────────────────────────────────────────────────────────

async function VistaSemana({ lunes, hoy, negocioId }: { lunes: string; hoy: string; negocioId: string | null }) {
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i))
  const inicio = new Date(`${lunes}T00:00:00`)
  const fin = new Date(`${dias[6]}T23:59:59.999`)
  const citas = await fetchCitas(inicio, fin, negocioId)

  const semana = numeroSemana(lunes)

  const idx = new Map<string, CitaConRelaciones[]>()
  for (const c of citas) {
    const dIso = `${c.fecha.getFullYear()}-${String(c.fecha.getMonth() + 1).padStart(2, "0")}-${String(c.fecha.getDate()).padStart(2, "0")}`
    const h = c.fecha.getHours()
    const key = `${dIso}-${h}`
    if (!idx.has(key)) idx.set(key, [])
    idx.get(key)!.push(c)
  }

  const lunes2 = sumarDias(lunes, -7)
  const lunes3 = sumarDias(lunes, 7)
  const domingo = dias[6]
  const enSemana = hoy >= lunes && hoy <= domingo

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <span className="font-mono text-[11.5px] tracking-[0.04em] text-[#64748B] uppercase">
          Semana {semana} · {fechaLegibleCorta(lunes)} – {fechaLegibleCorta(domingo)}
        </span>
        <div className="flex flex-wrap items-center gap-1 ml-auto">
          <Link href={`/agenda?fecha=${lunes2}&vista=semana`} className="flex items-center rounded-[7px] border border-[#E2E8F0] bg-white px-2.5 py-[7px] text-[#475569] hover:bg-[#F8FAFC] transition-colors">
            <Icon name="chevron_left" size={17} className="text-[#94A3B8]" />
          </Link>
          <Link href={`/agenda?fecha=${hoy}&vista=semana`} className={`rounded-[7px] border px-3 py-[7px] text-[13px] font-medium transition-colors ${enSemana ? "border-[#1E3A6E] bg-[#E8EEFB] text-[#1E3A6E]" : "border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC]"}`}>
            Hoy
          </Link>
          <Link href={`/agenda?fecha=${lunes3}&vista=semana`} className="flex items-center rounded-[7px] border border-[#E2E8F0] bg-white px-2.5 py-[7px] text-[#475569] hover:bg-[#F8FAFC] transition-colors">
            <Icon name="chevron_right" size={17} className="text-[#94A3B8]" />
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white">
        <div style={{ minWidth: 640 }}>
          <div className="grid border-b border-[#E2E8F0]" style={{ gridTemplateColumns: "56px repeat(7, 1fr)" }}>
            <div className="py-2 border-r border-[#E2E8F0]" />
            {dias.map((d, i) => {
              const esHoyCol = d === hoy
              return (
                <div key={d} className={`py-2 px-1 text-center border-r border-[#E2E8F0] last:border-r-0 ${esHoyCol ? "bg-[#E8EEFB]" : ""}`}>
                  <p className={`text-[10.5px] font-medium uppercase tracking-wide ${esHoyCol ? "text-[#1E3A6E]" : "text-[#94A3B8]"}`}>{DIAS_SEMANA[i]}</p>
                  <p className={`text-[14px] font-bold ${esHoyCol ? "text-[#1E3A6E]" : "text-[#0F1720]"}`}>{new Date(`${d}T12:00:00`).getDate()}</p>
                </div>
              )
            })}
          </div>

          {HORAS.map((h) => (
            <div key={h} className="grid border-b border-[#E2E8F0] last:border-b-0" style={{ gridTemplateColumns: "56px repeat(7, 1fr)", minHeight: 64 }}>
              <div className="flex items-start justify-end pr-2 pt-1 border-r border-[#E2E8F0]">
                <span className="font-mono text-[10.5px] text-[#94A3B8]">{String(h).padStart(2, "0")}:00</span>
              </div>
              {dias.map((d) => {
                const key = `${d}-${h}`
                const citasSlot = idx.get(key) ?? []
                const esHoyCol = d === hoy
                return (
                  <div key={d} className={`p-1 border-r border-[#E2E8F0] last:border-r-0 ${esHoyCol ? "bg-[#F7FCFC]" : ""}`}>
                    {citasSlot.map((c) => <CitaCard key={c.id} c={c} fecha={d} />)}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── vista día ───────────────────────────────────────────────────────────────

async function VistaDia({ fecha, hoy, negocioId }: { fecha: string; hoy: string; negocioId: string | null }) {
  const inicio = new Date(`${fecha}T00:00:00`)
  const fin = new Date(`${fecha}T23:59:59.999`)
  const citas = await fetchCitas(inicio, fin, negocioId)
  const esHoy = fecha === hoy

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <p className="font-mono text-[11.5px] tracking-[0.04em] text-[#64748B] uppercase capitalize">
          {fechaLegibleLarga(fecha)} · {citas.length} {citas.length === 1 ? "cita" : "citas"}
        </p>
        <div className="flex flex-wrap items-center gap-1 ml-auto">
          <Link href={`/agenda?fecha=${sumarDias(fecha, -1)}&vista=dia`} className="flex items-center gap-1 rounded-[7px] border border-[#E2E8F0] bg-white px-3 py-[7px] text-[13px] text-[#475569] hover:bg-[#F8FAFC] transition-colors">
            <Icon name="chevron_left" size={17} className="text-[#94A3B8]" /> Anterior
          </Link>
          <Link href={`/agenda?fecha=${hoy}&vista=dia`} className={`rounded-[7px] border px-3 py-[7px] text-[13px] font-medium transition-colors ${esHoy ? "border-[#1E3A6E] bg-[#E8EEFB] text-[#1E3A6E]" : "border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC]"}`}>
            Hoy
          </Link>
          <Link href={`/agenda?fecha=${sumarDias(fecha, 1)}&vista=dia`} className="flex items-center gap-1 rounded-[7px] border border-[#E2E8F0] bg-white px-3 py-[7px] text-[13px] text-[#475569] hover:bg-[#F8FAFC] transition-colors">
            Siguiente <Icon name="chevron_right" size={17} className="text-[#94A3B8]" />
          </Link>
          <form method="get" className="flex items-center gap-1">
            <input type="hidden" name="vista" value="dia" />
            <input name="fecha" type="date" defaultValue={fecha} className="rounded-[7px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-[7px] font-mono text-[12.5px] text-[#334155] focus:outline-none focus:ring-1 focus:ring-[#1E3A6E]" />
            <button type="submit" className="rounded-[7px] border border-[#E2E8F0] bg-white px-3 py-[7px] text-[13px] text-[#475569] hover:bg-[#F8FAFC] transition-colors">Ir</button>
          </form>
        </div>
      </div>

      {citas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#94A3B8]">
          <Icon name="event_available" size={48} className="mb-3 opacity-40" />
          <p className="text-[12.5px]">No hay citas para este día en tu negocio</p>
          <Link href={`/agenda/nueva?fecha=${fecha}`} className="mt-2 text-[13px] text-[#1E3A6E] hover:underline">
            Agendar una cita →
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {citas.map((c) => {
            const tipoKey = c.tipo?.toLowerCase() || "default"
            const col = TIPO_COLORS[tipoKey] || TIPO_COLORS.default
            const deleteAction = eliminarCita.bind(null, c.id, fecha)
            
            return (
              <div key={c.id} className="flex flex-col rounded-xl border border-[#E2E8F0] bg-white p-4 sm:flex-row sm:items-start sm:gap-4">
                <div className="flex w-[64px] shrink-0 flex-col items-center justify-start pt-[2px]">
                  <span className="font-mono text-[15px] font-bold" style={{ color: col.border }}>{isoToHHMM(c.fecha)}</span>
                </div>

                <div className="hidden sm:block h-full w-[3px] shrink-0 rounded-full self-stretch" style={{ backgroundColor: col.border }} />

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-[14.5px] font-semibold text-[#0F1720]">
                        {c.ficha?.nombre || "Sin registro"}
                        <span className="ml-2 text-[13px] font-normal text-[#64748B]">
                          — {c.ficha?.cliente?.nombre || "Sin cliente"}
                        </span>
                      </p>
                      <p className="mt-[3px] text-[13px] text-[#475569]">{c.motivo}</p>
                      {c.especialista && (
                        <p className="mt-[3px] flex items-center gap-1 text-[12px] text-[#94A3B8]">
                          <Icon name="stethoscope" size={13} />
                          {c.especialista.nombre}
                        </p>
                      )}
                      {c.notas && <p className="mt-1 text-[12px] text-[#94A3B8]">{c.notas}</p>}
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className="rounded-full px-2.5 py-1 font-mono text-[10.5px] font-medium capitalize" style={{ backgroundColor: col.bg, color: col.text }}>
                        {c.tipo}
                      </span>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 font-mono text-[10.5px] font-medium ${ESTADO_STYLE[c.estado]}`}>
                        {ESTADO_LABEL[c.estado]}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-[#F1F5F9] pt-3">
                    <div className="flex items-center gap-2">
                      {c.estado !== "confirmada" && (
                        <form action={cambiarEstadoCita.bind(null, c.id, "confirmada", fecha)}>
                          <button type="submit" className="rounded-[6px] border border-[#D1FAE5] bg-[#F0FDF4] px-2.5 py-1 text-[12px] font-medium text-[#059669] hover:bg-[#D1FAE5] transition-colors">Confirmar</button>
                        </form>
                      )}
                      {c.estado !== "atendida" && (
                        <form action={cambiarEstadoCita.bind(null, c.id, "atendida", fecha)}>
                          <button type="submit" className="rounded-[6px] border border-[#E2E8F0] bg-[#F8FAFC] px-2.5 py-1 text-[12px] font-medium text-[#64748B] hover:bg-[#E2E8F0] transition-colors">Atendida</button>
                        </form>
                      )}
                      {c.estado !== "cancelada" && (
                        <form action={cambiarEstadoCita.bind(null, c.id, "cancelada", fecha)}>
                          <button type="submit" className="rounded-[6px] border border-[#FEE2E2] bg-[#FFF5F5] px-2.5 py-1 text-[12px] font-medium text-[#DC2626] hover:bg-[#FEE2E2] transition-colors">Cancelar</button>
                        </form>
                      )}
                    </div>
                    <div className="ml-auto flex items-center gap-1">
                      <Link href={`/agenda/${c.id}/editar`} title="Editar" className="flex items-center justify-center rounded p-1 text-[#94A3B8] hover:text-[#334155] transition-colors">
                        <Icon name="edit" size={18} />
                      </Link>
                      <BtnEliminar action={deleteAction} mensaje="¿Eliminar esta cita?" />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── página principal ────────────────────────────────────────────────────────

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string; vista?: string }>
}) {
  const { fecha: fechaParam, vista: vistaParam } = await searchParams
  const hoy = hoyISO()
  const fecha = fechaParam && /^\d{4}-\d{2}-\d{2}$/.test(fechaParam) ? fechaParam : hoy
  const vista = vistaParam === "dia" ? "dia" : "semana"
  const lunes = lunesDeSemana(fecha)

  // Extracción del Negocio ID para inyectarlo en los calendarios
  const session = await auth()
  const email = session?.user?.email ?? ""
  const usuarioDb = await prisma.usuario.findUnique({
    where: { email },
    select: { negocioId: true }
  })
  const negocioId = usuarioDb?.negocioId || null

  return (
    <div>
      <AutoRefresh segundos={30} />
      <div className="flex flex-wrap items-end justify-between gap-4 mb-[18px]">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.015em] text-[#0F1720]">Agenda</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex rounded-[8px] border border-[#E2E8F0] overflow-hidden">
            <Link href={`/agenda?fecha=${fecha}&vista=dia`} className={`px-3 py-[7px] text-[13px] font-medium transition-colors ${vista === "dia" ? "bg-[#1E3A6E] text-white" : "bg-white text-[#475569] hover:bg-[#F8FAFC]"}`}>Día</Link>
            <Link href={`/agenda?fecha=${fecha}&vista=semana`} className={`px-3 py-[7px] text-[13px] font-medium border-l border-[#E2E8F0] transition-colors ${vista === "semana" ? "bg-[#1E3A6E] text-white" : "bg-white text-[#475569] hover:bg-[#F8FAFC]"}`}>Semana</Link>
          </div>

          <DownloadLink href={`/api/agenda/excel?fecha=${fecha}&vista=${vista}`} className="flex items-center gap-[7px] rounded-[7px] border border-[#16A34A] bg-[#F0FDF4] px-[13px] py-[7px] text-[13px] font-medium text-[#16A34A] hover:bg-[#DCFCE7] transition-colors">
            <Icon name="table_view" size={16} className="text-[#16A34A]" />
            Descargar Excel
          </DownloadLink>

          <Link href="/agenda/empleados" className="flex items-center gap-[7px] rounded-[7px] border border-[#E2E8F0] bg-white px-[13px] py-[7px] text-[13px] font-medium text-[#475569] hover:bg-[#F8FAFC] transition-colors">
            <Icon name="schedule" size={16} className="text-[#94A3B8]" />
            Horarios
          </Link>

          <Link href={`/agenda/nueva?fecha=${vista === "semana" ? lunes : fecha}`} className="flex items-center gap-[7px] rounded-[7px] bg-[#1E3A6E] px-[15px] py-[9px] text-[13px] font-semibold text-white hover:bg-[#162D57] transition-colors">
            <Icon name="add" size={17} className="text-white" />
            Nueva cita
          </Link>
        </div>
      </div>

      {vista === "semana" ? (
        <VistaSemana lunes={lunes} hoy={hoy} negocioId={negocioId} />
      ) : (
        <VistaDia fecha={fecha} hoy={hoy} negocioId={negocioId} />
      )}
    </div>
  )
}