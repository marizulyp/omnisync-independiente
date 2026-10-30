import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Icon } from "@/components/ui/Icon"
import { auth } from "@/auth"

const DICCIONARIO: Record<string, any> = {
  veterinaria: { titulo: "Historia Clínica", sub: "pacientes con historial registrado", inputPlaceholder: "Buscar por paciente o dueño...", vacio: "Aún no hay historias clínicas", itemNombre: "Paciente", linkResumen: "Imprimir historia", accion: "Ver consultas", icon: "pets" },
  taller: { titulo: "Órdenes de Trabajo", sub: "vehículos con órdenes registradas", inputPlaceholder: "Buscar por vehículo, placa o cliente...", vacio: "Aún no hay órdenes de trabajo", itemNombre: "Vehículo", linkResumen: "Imprimir reporte", accion: "Ver órdenes", icon: "directions_car" },
  barberia: { titulo: "Historial de Servicios", sub: "fichas con historial registrado", inputPlaceholder: "Buscar por cliente o alias...", vacio: "Aún no hay servicios registrados", itemNombre: "Ficha", linkResumen: "Imprimir resumen", accion: "Ver servicios", icon: "content_cut" },
}

export default async function AtencionesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
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

  // EL MURO DE CONTENCIÓN: where { negocioId }
  const fichas = await prisma.ficha.findMany({
    where: {
      negocioId, // Aislamiento estricto
      atenciones: { some: {} }, // Solo trae las que tienen al menos una atención
      ...(busqueda
        ? {
            OR: [
              { nombre: { contains: busqueda, mode: "insensitive" } },
              { cliente: { nombre: { contains: busqueda, mode: "insensitive" } } },
              {
                atenciones: {
                  some: {
                    OR: [
                      { motivo: { contains: busqueda, mode: "insensitive" } },
                    ],
                  },
                },
              },
            ],
          }
        : {}),
    },
    include: {
      cliente: { select: { nombre: true } },
      atenciones: {
        orderBy: { fecha: "desc" },
        take: 1,
        select: { fecha: true, motivo: true },
      },
      _count: { select: { atenciones: true } },
    },
    orderBy: { nombre: "asc" },
  })

  fichas.sort((a, b) => {
    const fa = a.atenciones[0]?.fecha?.getTime() ?? 0
    const fb = b.atenciones[0]?.fecha?.getTime() ?? 0
    return fb - fa
  })

  return (
    <div>
      {/* Encabezado */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-[18px]">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.015em] text-[#0F1720]">{dicc.titulo}</h1>
          <p className="mt-[5px] font-mono text-[11.5px] tracking-[0.04em] text-[#64748B] uppercase">
            {fichas.length} {dicc.sub}
          </p>
        </div>
        <form method="get">
          <div className="flex items-center gap-2 rounded-[7px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-[7px]">
            <Icon name="search" size={17} className="text-[#94A3B8] shrink-0" />
            <input
              name="q"
              type="search"
              defaultValue={busqueda}
              placeholder={dicc.inputPlaceholder}
              className="w-64 bg-transparent text-[13px] text-[#334155] placeholder:text-[#94A3B8] focus:outline-none"
            />
          </div>
        </form>
      </div>

      {fichas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#94A3B8]">
          <Icon name="clinical_notes" size={48} className="mb-3 opacity-40" />
          <p className="text-[12.5px]">
            {busqueda
              ? "No se encontraron registros con ese criterio"
              : "Aún no hay registros en este negocio"}
          </p>
          {!busqueda && (
            <p className="mt-1 text-[12px] text-[#94A3B8]">
              Abre el perfil de un {dicc.itemNombre.toLowerCase()} para registrar una atención.
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              {/* Encabezado tabla */}
              <div
                className="grid gap-3 border-b border-[#EEF2F6] bg-[#F8FAFC] px-[18px] py-[9px] font-mono text-[10.5px] tracking-[0.08em] text-[#7C8CA0] uppercase"
                style={{ gridTemplateColumns: "minmax(0,1.2fr) minmax(0,1fr) minmax(0,1.3fr) 80px 140px" }}
              >
                <span>{dicc.itemNombre}</span>
                <span>Propietario / Cliente</span>
                <span>Último registro</span>
                <span className="text-center">Total</span>
                <span className="text-right">Acciones</span>
              </div>

              {/* Filas */}
              {fichas.map((f) => {
                const ultima = f.atenciones[0]
                return (
                  <div
                    key={f.id}
                    className="grid gap-3 items-center border-b border-[#F1F5F9] px-[18px] py-[11px] hover:bg-[#F8FAFC] transition-colors last:border-0"
                    style={{ gridTemplateColumns: "minmax(0,1.2fr) minmax(0,1fr) minmax(0,1.3fr) 80px 140px" }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-[8px]" style={{ backgroundColor: "#F1F5F9" }}>
                        <Icon name={dicc.icon} size={16} className="text-[#7C8CA0]" />
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/fichas/${f.id}`}
                          className="block truncate text-[13.5px] font-semibold text-[#0F1720] hover:text-[#1E3A6E]"
                        >
                          {f.nombre}
                        </Link>
                        <p className="truncate text-[11.5px] text-[#94A3B8] capitalize">
                          {f.tipo}
                        </p>
                      </div>
                    </div>

                    <span className="truncate text-[13px] text-[#475569]">{f.cliente.nombre}</span>

                    {ultima ? (
                      <div className="min-w-0">
                        <p className="font-mono text-[12.5px] text-[#334155]">
                          {ultima.fecha.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                        </p>
                        <p className="truncate text-[12px] text-[#1E3A6E]">{ultima.motivo}</p>
                      </div>
                    ) : (
                      <span className="text-[12.5px] text-[#94A3B8]">—</span>
                    )}

                    <div className="flex justify-center">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full font-mono text-[12px] font-semibold" style={{ backgroundColor: "#E8EEFB", color: "#1E3A6E" }}>
                        {f._count.atenciones}
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/fichas/${f.id}`}
                        className="flex items-center gap-1.5 rounded-[6px] border border-[#E2E8F0] px-2.5 py-[5px] text-[12px] text-[#475569] hover:bg-[#F8FAFC] transition-colors"
                      >
                        <Icon name="clinical_notes" size={14} className="text-[#7C8CA0]" />
                        {dicc.accion}
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}