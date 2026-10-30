import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { BtnEliminar } from "@/components/ui/BtnEliminar"
import { DownloadLink } from "@/components/ui/DownloadLink"
import { Icon } from "@/components/ui/Icon"
import { eliminarCliente } from "./actions"
import { rolActual } from "@/lib/permisos-server"
import { tienePermiso } from "@/lib/permisos"
import { auth } from "@/auth"

function getIniciales(nombre: string) {
  return nombre.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("")
}

const DICCIONARIO: Record<string, { columna: string; msjEliminar: string }> = {
  veterinaria: { columna: "Mascotas", msjEliminar: "También se eliminarán sus mascotas." },
  taller: { columna: "Vehículos", msjEliminar: "También se eliminarán sus vehículos." },
  barberia: { columna: "Fichas", msjEliminar: "También se eliminarán sus fichas." },
  medico: { columna: "Pacientes", msjEliminar: "También se eliminarán sus pacientes." },
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const rol = await rolActual()
  const puedeEditar = tienePermiso(rol, "clientes", "editar")
  const puedeEliminar = tienePermiso(rol, "clientes", "eliminar")
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
  const clientes = await prisma.cliente.findMany({
    where: {
      negocioId, // Aislamiento estricto
      ...(busqueda
        ? {
            OR: [
              { nombre: { contains: busqueda, mode: "insensitive" } },
              { identificacion: { contains: busqueda, mode: "insensitive" } },
              { telefono: { contains: busqueda } },
              { email: { contains: busqueda, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { nombre: "asc" },
    include: { _count: { select: { fichas: true } } },
  })

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-[18px]">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.015em] text-[#0F1720]">Clientes</h1>
          <p className="mt-[5px] font-mono text-[11.5px] tracking-[0.04em] text-[#64748B] uppercase">
            {clientes.length} {clientes.length === 1 ? "registro" : "registros"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form method="get">
            <div className="flex items-center gap-2 rounded-[7px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-[7px]">
              <Icon name="search" size={17} className="text-[#94A3B8] shrink-0" />
              <input
                name="q"
                type="search"
                defaultValue={busqueda}
                placeholder="Buscar por nombre, cédula, teléfono…"
                className="w-56 bg-transparent text-[13px] text-[#334155] placeholder:text-[#94A3B8] focus:outline-none"
              />
            </div>
          </form>
          <DownloadLink
            href="/api/clientes/excel"
            className="flex items-center gap-[7px] rounded-[7px] border border-[#16A34A] bg-[#F0FDF4] px-[13px] py-[7px] text-[13px] font-medium text-[#16A34A] hover:bg-[#DCFCE7] transition-colors"
          >
            <Icon name="table_view" size={16} className="text-[#16A34A]" />
            Descargar Excel
          </DownloadLink>
          {puedeEditar && (
            <Link
              href="/clientes/nuevo"
              className="flex items-center gap-[7px] rounded-[7px] bg-[#1E3A6E] px-[15px] py-[9px] text-[13px] font-semibold text-white hover:bg-[#162D57] transition-colors"
            >
              <Icon name="person_add" size={17} className="text-white" />
              Nuevo cliente
            </Link>
          )}
        </div>
      </div>

      {clientes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#94A3B8]">
          <Icon name="group" size={48} className="mb-3 opacity-40" />
          <p className="text-[12.5px]">
            {busqueda ? "No se encontraron clientes" : "Aún no hay clientes registrados en este negocio"}
          </p>
          {!busqueda && puedeEditar && (
            <Link href="/clientes/nuevo" className="mt-2 text-[13px] text-[#1E3A6E] hover:underline">
              Registrar primer cliente →
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
          <div className="overflow-x-auto">
            <div className="min-w-[840px]">
              <div
                className="grid gap-3 border-b border-[#EEF2F6] bg-[#F8FAFC] px-[18px] py-[9px] font-mono text-[10.5px] tracking-[0.08em] text-[#7C8CA0] uppercase"
                style={{ gridTemplateColumns: "minmax(0,1.3fr) 110px 120px minmax(0,1.4fr) 80px 110px" }}
              >
                <span>Cliente</span>
                <span>Cédula</span>
                <span>Teléfono</span>
                <span>Email</span>
                <span className="text-center">{dicc.columna}</span>
                <span className="text-right">Acciones</span>
              </div>

              {clientes.map((c) => {
                const deleteAction = eliminarCliente.bind(null, c.id)
                return (
                  <div
                    key={c.id}
                    className="grid gap-3 items-center border-b border-[#F1F5F9] px-[18px] py-[11px] hover:bg-[#F8FAFC] transition-colors last:border-0"
                    style={{ gridTemplateColumns: "minmax(0,1.3fr) 110px 120px minmax(0,1.4fr) 80px 110px" }}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg text-xs font-semibold"
                        style={{ backgroundColor: "#E8EEFB", color: "#1E3A6E" }}
                      >
                        {getIniciales(c.nombre)}
                      </div>
                      <Link
                        href={`/clientes/${c.id}`}
                        className="truncate text-[13.5px] font-semibold text-[#0F1720] hover:text-[#1E3A6E]"
                      >
                        {c.nombre}
                      </Link>
                    </div>

                    <span className="truncate font-mono text-[12px] text-[#475569]">{c.identificacion ?? "—"}</span>
                    <span className="truncate font-mono text-[12px] text-[#475569]">{c.telefono ?? "—"}</span>
                    <span className="truncate text-[12.5px] text-[#64748B]">{c.email ?? "—"}</span>

                    <div className="flex justify-center">
                      <span className="rounded bg-[#F1F5F9] px-2 font-mono text-[12px] text-[#475569]">
                        {c._count.fichas}
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-2.5">
                      <Link
                        href={`/clientes/${c.id}`}
                        title="Ver"
                        className="flex items-center justify-center rounded p-1 text-[#94A3B8] hover:text-[#1E3A6E] transition-colors"
                      >
                        <Icon name="visibility" size={18} />
                      </Link>
                      {puedeEditar && (
                        <Link
                          href={`/clientes/${c.id}/editar`}
                          title="Editar"
                          className="flex items-center justify-center rounded p-1 text-[#94A3B8] hover:text-[#334155] transition-colors"
                        >
                          <Icon name="edit" size={18} />
                        </Link>
                      )}
                      {puedeEliminar && (
                        <BtnEliminar
                          action={deleteAction}
                          mensaje={`¿Eliminar a ${c.nombre}? ${dicc.msjEliminar}`}
                        />
                      )}
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