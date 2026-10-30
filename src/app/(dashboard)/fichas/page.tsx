import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Icon } from "@/components/ui/Icon"
import { DownloadLink } from "@/components/ui/DownloadLink"
import { rolActual } from "@/lib/permisos-server"
import { tienePermiso } from "@/lib/permisos"
import { auth } from "@/auth"

const DICCIONARIO: Record<string, { titulo: string; singular: string; icono: string; alertaText: string; f1: string; f2: string }> = {
  veterinaria: { titulo: "Pacientes", singular: "paciente", icono: "pets", alertaText: "con alerta clínica", f1: "Perro", f2: "Gato" },
  taller: { titulo: "Vehículos", singular: "vehículo", icono: "directions_car", alertaText: "con mantenimiento vencido", f1: "Carro", f2: "Moto" },
  barberia: { titulo: "Fichas", singular: "ficha", icono: "face", alertaText: "con alertas", f1: "Corte", f2: "Color" },
  medico: { titulo: "Pacientes", singular: "paciente", icono: "personal_injury", alertaText: "con control pendiente", f1: "General", f2: "Especialidad" }
}

export default async function FichasPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; tipo?: string }>
}) {
  const rol = await rolActual()
  const puedeEditar = tienePermiso(rol, "fichas", "editar")
  const { q, tipo } = await searchParams
  const busqueda = q?.trim() ?? ""
  
  // Extracción segura del Negocio ID
  const session = await auth()
  const email = session?.user?.email ?? ""
  const usuarioDb = await prisma.usuario.findUnique({
    where: { email },
    select: { negocioId: true, negocio: { select: { tipoNegocio: true } } }
  })
  
  const negocioId = usuarioDb?.negocioId || null
  const tipoNegocio = usuarioDb?.negocio?.tipoNegocio || (session?.user as any)?.tipoNegocio || "veterinaria"
  const dicc = DICCIONARIO[tipoNegocio] || DICCIONARIO["veterinaria"]

  const tipoFiltro = tipo && tipo !== "todos" && tipo !== "alerta" ? tipo : undefined
  const hoy = new Date()

  // EL MURO DE CONTENCIÓN: where { negocioId }
  const fichas = await prisma.ficha.findMany({
    where: {
      negocioId, // Aislamiento estricto
      ...(busqueda
        ? {
            OR: [
              { nombre: { contains: busqueda, mode: "insensitive" } },
              { cliente: { nombre: { contains: busqueda, mode: "insensitive" } } },
            ],
          }
        : {}),
      ...(tipoFiltro ? { tipo: { equals: tipoFiltro, mode: "insensitive" } } : {}),
    },
    orderBy: { nombre: "asc" },
    include: {
      cliente: { select: { id: true, nombre: true } },
      atenciones: { orderBy: { fecha: "desc" }, take: 1, select: { fecha: true } },
      controles: { select: { proximaFecha: true } },
    },
  })

  const fichasConAlerta = new Set(
    fichas
      .filter((f) => f.controles.some((c) => c.proximaFecha && c.proximaFecha < hoy))
      .map((f) => f.id)
  )

  const filtros = [
    { label: "Todos", value: "" },
    { label: `${dicc.f1}s`, value: dicc.f1 },
    { label: `${dicc.f2}s`, value: dicc.f2 },
    { label: "Con alertas", value: "alerta", amber: true },
  ]

  const fichasMostradas = tipo === "alerta" ? fichas.filter((f) => fichasConAlerta.has(f.id)) : fichas

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-[18px]">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.015em] text-[#0F1720]">{dicc.titulo}</h1>
          <p className="mt-[5px] font-mono text-[11.5px] tracking-[0.04em] text-[#64748B] uppercase">
            {fichas.length} registrado{fichas.length !== 1 ? "s" : ""}
            {fichasConAlerta.size > 0 && (
              <span className="ml-2 text-[#B45309]">
                · {fichasConAlerta.size} {dicc.alertaText}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <DownloadLink
            href="/api/fichas/excel"
            className="flex items-center gap-[7px] rounded-[7px] border border-[#16A34A] bg-[#F0FDF4] px-[13px] py-[7px] text-[13px] font-medium text-[#16A34A] hover:bg-[#DCFCE7] transition-colors"
          >
            <Icon name="table_view" size={16} className="text-[#16A34A]" />
            Descargar Excel
          </DownloadLink>
          {puedeEditar && (
            <Link
              href="/fichas/nueva"
              className="flex items-center gap-[7px] rounded-[7px] bg-[#1E3A6E] px-[15px] py-[9px] text-[13px] font-semibold text-white hover:bg-[#162D57] transition-colors"
            >
              <Icon name="add" size={17} className="text-white" />
              Nuevo {dicc.singular}
            </Link>
          )}
        </div>
      </div>

      <div className="mb-[18px] flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1">
          {filtros.map((f) => {
            const activo = f.value === "alerta" ? tipo === "alerta" : (tipoFiltro ?? "") === f.value
            const href = f.value === ""
              ? "/fichas"
              : busqueda ? `/fichas?q=${busqueda}&tipo=${f.value}` : `/fichas?tipo=${f.value}`
            return (
              <Link
                key={f.value}
                href={href}
                className={`rounded-full px-3 py-[5px] text-[12.5px] transition-colors ${
                  activo
                    ? f.amber
                      ? "bg-[#FEF3C7] text-[#B45309] font-medium"
                      : "bg-[#0F1720] text-white font-medium"
                    : "text-[#475569] hover:bg-[#F1F5F9]"
                }`}
              >
                {f.label}
                {f.amber && fichasConAlerta.size > 0 && (
                  <span className="ml-1.5 font-mono">{fichasConAlerta.size}</span>
                )}
              </Link>
            )
          })}
        </div>

        <form method="get" className="ml-auto">
          {tipoFiltro && <input type="hidden" name="tipo" value={tipoFiltro} />}
          <div className="flex items-center gap-2 rounded-[7px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-[7px]">
            <Icon name="search" size={17} className="text-[#94A3B8] shrink-0" />
            <input
              name="q"
              type="search"
              defaultValue={busqueda}
              placeholder="Buscar por nombre o dueño…"
              className="w-52 bg-transparent text-[13px] text-[#334155] placeholder:text-[#94A3B8] focus:outline-none"
            />
          </div>
        </form>
      </div>

      {fichasMostradas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#94A3B8]">
          <Icon name={dicc.icono} size={48} className="mb-3 opacity-40" />
          <p className="text-[12.5px]">
            {busqueda || tipo ? "No se encontraron resultados con ese filtro" : `Aún no hay ${dicc.titulo.toLowerCase()} registrados en este negocio`}
          </p>
          {!busqueda && !tipo && puedeEditar && (
            <Link href="/fichas/nueva" className="mt-2 text-[13px] text-[#1E3A6E] hover:underline">
              Registrar primer {dicc.singular} →
            </Link>
          )}
        </div>
      ) : (
        <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))" }}>
          {fichasMostradas.map((f) => {
            const tieneAlerta = fichasConAlerta.has(f.id)
            const ultimaVisita = f.atenciones[0]?.fecha
            
            const datos = (f.datosGenerales as any) || {}
            let subtitulo = f.tipo
            if (tipoNegocio === "veterinaria" && datos.raza) subtitulo += ` · ${datos.raza}`
            if (tipoNegocio === "taller" && datos.marca) subtitulo += ` · ${datos.marca} ${datos.modelo || ''}`

            return (
              <Link
                key={f.id}
                href={`/fichas/${f.id}`}
                className={`relative flex flex-col rounded-xl border bg-white p-4 transition-colors hover:border-[#1E3A6E] ${
                  tieneAlerta ? "border-[#FDE68A]" : "border-[#E2E8F0]"
                }`}
              >
                {tieneAlerta && (
                  <span className="absolute top-3 right-3 text-[#DC2626]">
                    <Icon name="error" size={18} />
                  </span>
                )}

                <div className="flex items-start gap-3 mb-3">
                  <div
                    className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px]"
                    style={{ backgroundColor: "#F1F5F9" }}
                  >
                    <Icon name={dicc.icono} size={22} className="text-[#7C8CA0]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-[#0F1720] truncate">{f.nombre}</p>
                    <p className="text-[12.5px] text-[#64748B] truncate">{subtitulo}</p>
                  </div>
                </div>

                <div
                  className="grid grid-cols-2 gap-3 pt-3"
                  style={{ borderTop: "1px solid #F1F5F9" }}
                >
                  <div>
                    <p className="font-mono text-[10px] tracking-[0.1em] text-[#94A3B8] uppercase">
                      Propietario / Cliente
                    </p>
                    <p className="mt-0.5 text-[12.5px] text-[#334155] truncate">
                      {f.cliente.nombre}
                    </p>
                  </div>
                  <div>
                    <p className="font-mono text-[10px] tracking-[0.1em] text-[#94A3B8] uppercase">
                      Última visita
                    </p>
                    <p className="mt-0.5 font-mono text-[12.5px] text-[#334155]">
                      {ultimaVisita
                        ? ultimaVisita.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })
                        : "Sin visitas"}
                    </p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}