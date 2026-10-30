import { prisma } from "@/lib/prisma"
import { requirePermisoPagina } from "@/lib/permisos-server"
import { Icon } from "@/components/ui/Icon"
import { DownloadLink } from "@/components/ui/DownloadLink"
import { fechaLocalISO } from "@/lib/fechas"

const ACCION_STYLE: Record<string, { bg: string; text: string; label: string }> = {
  Crear:   { bg: "#D1FAE5", text: "#065F46", label: "Crear"   },
  Editar:  { bg: "#DBEAFE", text: "#1E40AF", label: "Editar"  },
  Eliminar:{ bg: "#FEE2E2", text: "#991B1B", label: "Eliminar"},
}

const ROL_LABEL: Record<string, string> = {
  admin:         "Admin",
  veterinario:   "Veterinario/a",
  recepcionista: "Recepcionista",
  enfermero:     "Enfermero/a",
}

export default async function ActividadPage({
  searchParams,
}: {
  searchParams: Promise<{ modulo?: string; accion?: string; q?: string; desde?: string; hasta?: string; usuario?: string }>
}) {
  await requirePermisoPagina("actividad", "ver")

  const { modulo, accion, q, desde, hasta, usuario } = await searchParams

  const busqueda = q?.trim() ?? ""
  const moduloFiltro = modulo?.trim() ?? ""
  const accionFiltro = accion?.trim() ?? ""
  const usuarioFiltro = usuario?.trim() ?? ""

  const hoy = fechaLocalISO()
  const desdeDate = /^\d{4}-\d{2}-\d{2}$/.test(desde ?? "") ? new Date(`${desde}T00:00:00`) : undefined
  const hastaDate = /^\d{4}-\d{2}-\d{2}$/.test(hasta ?? "") ? new Date(`${hasta}T23:59:59.999`) : undefined

  const [registros, modulos, usuarios] = await Promise.all([
    prisma.registroActividad.findMany({
      where: {
        ...(moduloFiltro ? { modulo: moduloFiltro } : {}),
        ...(accionFiltro ? { accion: accionFiltro } : {}),
        ...(usuarioFiltro ? { usuarioEmail: usuarioFiltro } : {}),
        ...(busqueda
          ? {
              OR: [
                { usuarioNombre: { contains: busqueda, mode: "insensitive" } },
                { entidad: { contains: busqueda, mode: "insensitive" } },
                { detalle: { contains: busqueda, mode: "insensitive" } },
              ],
            }
          : {}),
        ...(desdeDate || hastaDate
          ? { fecha: { ...(desdeDate ? { gte: desdeDate } : {}), ...(hastaDate ? { lte: hastaDate } : {}) } }
          : {}),
      },
      orderBy: { fecha: "desc" },
      take: 500,
    }),
    prisma.registroActividad.findMany({
      select: { modulo: true },
      distinct: ["modulo"],
      orderBy: { modulo: "asc" },
    }),
    prisma.usuario.findMany({
      select: { nombre: true, email: true },
      orderBy: { nombre: "asc" },
    }),
  ])

  const excelParams = new URLSearchParams({
    ...(moduloFiltro ? { modulo: moduloFiltro } : {}),
    ...(accionFiltro ? { accion: accionFiltro } : {}),
    ...(usuarioFiltro ? { usuario: usuarioFiltro } : {}),
    ...(busqueda ? { q: busqueda } : {}),
    ...(desde ? { desde } : {}),
    ...(hasta ? { hasta } : {}),
  }).toString()

  return (
    <div>
      {/* Encabezado */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-[18px]">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.015em] text-[#0F1720]">
            Registro de Actividad
          </h1>
          <p className="mt-[5px] font-mono text-[11.5px] tracking-[0.04em] text-[#64748B] uppercase">
            {registros.length} evento{registros.length !== 1 ? "s" : ""}
            {registros.length === 500 && " (mostrando los últimos 500)"}
          </p>
        </div>
        <DownloadLink
          href={`/api/actividad/excel${excelParams ? `?${excelParams}` : ""}`}
          className="flex items-center gap-[7px] rounded-[7px] border border-[#16A34A] bg-[#F0FDF4] px-[13px] py-[7px] text-[13px] font-medium text-[#16A34A] hover:bg-[#DCFCE7] transition-colors"
        >
          <Icon name="table_view" size={16} className="text-[#16A34A]" />
          Descargar Excel
        </DownloadLink>
      </div>

      {/* Filtros */}
      <form method="get" className="mb-[18px] flex flex-wrap items-center gap-2">
        {/* Búsqueda */}
        <div className="flex items-center gap-2 rounded-[7px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-[7px]">
          <Icon name="search" size={17} className="text-[#94A3B8] shrink-0" />
          <input
            name="q"
            type="search"
            defaultValue={busqueda}
            placeholder="Buscar entidad, detalle…"
            className="w-40 bg-transparent text-[13px] text-[#334155] placeholder:text-[#94A3B8] focus:outline-none"
          />
        </div>

        {/* Usuario */}
        <select
          name="usuario"
          defaultValue={usuarioFiltro}
          className="rounded-[7px] border border-[#E2E8F0] bg-white px-3 py-[7px] text-[13px] text-[#334155] focus:outline-none focus:ring-1 focus:ring-[#1E3A6E]"
        >
          <option value="">Todos los usuarios</option>
          {usuarios.map((u) => (
            <option key={u.email} value={u.email}>{u.nombre}</option>
          ))}
        </select>

        {/* Módulo */}
        <select
          name="modulo"
          defaultValue={moduloFiltro}
          className="rounded-[7px] border border-[#E2E8F0] bg-white px-3 py-[7px] text-[13px] text-[#334155] focus:outline-none focus:ring-1 focus:ring-[#1E3A6E]"
        >
          <option value="">Todos los módulos</option>
          {modulos.map((m) => (
            <option key={m.modulo} value={m.modulo}>{m.modulo}</option>
          ))}
        </select>

        {/* Acción */}
        <select
          name="accion"
          defaultValue={accionFiltro}
          className="rounded-[7px] border border-[#E2E8F0] bg-white px-3 py-[7px] text-[13px] text-[#334155] focus:outline-none focus:ring-1 focus:ring-[#1E3A6E]"
        >
          <option value="">Todas las acciones</option>
          <option value="Crear">Crear</option>
          <option value="Editar">Editar</option>
          <option value="Eliminar">Eliminar</option>
        </select>

        {/* Rango de fechas */}
        <input
          name="desde"
          type="date"
          defaultValue={desde ?? ""}
          max={hoy}
          className="rounded-[7px] border border-[#E2E8F0] bg-white px-3 py-[7px] text-[13px] text-[#334155] focus:outline-none focus:ring-1 focus:ring-[#1E3A6E]"
        />
        <span className="text-[13px] text-[#94A3B8]">–</span>
        <input
          name="hasta"
          type="date"
          defaultValue={hasta ?? ""}
          max={hoy}
          className="rounded-[7px] border border-[#E2E8F0] bg-white px-3 py-[7px] text-[13px] text-[#334155] focus:outline-none focus:ring-1 focus:ring-[#1E3A6E]"
        />

        <button
          type="submit"
          className="rounded-[7px] bg-[#1E3A6E] px-4 py-[7px] text-[13px] font-medium text-white hover:bg-[#162D57] transition-colors"
        >
          Filtrar
        </button>

        {(busqueda || moduloFiltro || accionFiltro || usuarioFiltro || desde || hasta) && (
          <a
            href="/actividad"
            className="rounded-[7px] border border-[#E2E8F0] bg-white px-4 py-[7px] text-[13px] text-[#64748B] hover:bg-[#F8FAFC] transition-colors"
          >
            Limpiar
          </a>
        )}
      </form>

      {/* Tabla */}
      {registros.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#94A3B8]">
          <Icon name="history" size={48} className="mb-3 opacity-40" />
          <p className="text-[12.5px]">No se encontraron registros de actividad</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                  <th className="px-4 py-3 text-left font-mono text-[10.5px] tracking-[0.08em] text-[#94A3B8] uppercase">
                    Fecha / Hora
                  </th>
                  <th className="px-4 py-3 text-left font-mono text-[10.5px] tracking-[0.08em] text-[#94A3B8] uppercase">
                    Usuario
                  </th>
                  <th className="px-4 py-3 text-left font-mono text-[10.5px] tracking-[0.08em] text-[#94A3B8] uppercase">
                    Acción
                  </th>
                  <th className="px-4 py-3 text-left font-mono text-[10.5px] tracking-[0.08em] text-[#94A3B8] uppercase">
                    Módulo
                  </th>
                  <th className="px-4 py-3 text-left font-mono text-[10.5px] tracking-[0.08em] text-[#94A3B8] uppercase">
                    Registro afectado
                  </th>
                  <th className="px-4 py-3 text-left font-mono text-[10.5px] tracking-[0.08em] text-[#94A3B8] uppercase">
                    Detalle
                  </th>
                </tr>
              </thead>
              <tbody>
                {registros.map((r, i) => {
                  const estilo = ACCION_STYLE[r.accion] ?? ACCION_STYLE["Editar"]
                  return (
                    <tr
                      key={r.id}
                      className={`border-b border-[#F1F5F9] last:border-b-0 ${
                        i % 2 === 0 ? "bg-white" : "bg-[#FAFBFC]"
                      }`}
                    >
                      <td className="px-4 py-3 text-[#475569] whitespace-nowrap">
                        <p className="font-medium text-[#0F1720]">
                          {r.fecha.toLocaleDateString("es-CO", {
                            day: "2-digit", month: "2-digit", year: "numeric",
                          })}
                        </p>
                        <p className="text-[11.5px] text-[#94A3B8]">
                          {r.fecha.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#0F1720]">{r.usuarioNombre}</p>
                        <p className="text-[11.5px] text-[#94A3B8]">
                          {ROL_LABEL[r.usuarioRol] ?? r.usuarioRol}
                          {r.usuarioEmail && ` · ${r.usuarioEmail}`}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center rounded-full px-2.5 py-[3px] text-[11.5px] font-semibold"
                          style={{ backgroundColor: estilo.bg, color: estilo.text }}
                        >
                          {estilo.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#475569]">{r.modulo}</td>
                      <td className="px-4 py-3 font-medium text-[#0F1720]">{r.entidad}</td>
                      <td className="px-4 py-3 text-[#64748B] max-w-[200px]">
                        <span className="truncate block" title={r.detalle ?? ""}>
                          {r.detalle ?? "—"}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
