import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { BtnEliminar } from "@/components/ui/BtnEliminar"
import { eliminarCliente } from "../actions"
import { rolActual } from "@/lib/permisos-server"
import { tienePermiso } from "@/lib/permisos"
import { auth } from "@/auth"

const DICCIONARIO: Record<string, any> = {
  veterinaria: { titulo: "Mascotas", btn: "+ Agregar mascota", vacio: "Este cliente no tiene mascotas registradas", link: "Agregar primera mascota", icono: "🐾" },
  taller: { titulo: "Vehículos", btn: "+ Agregar vehículo", vacio: "Este cliente no tiene vehículos registrados", link: "Agregar primer vehículo", icono: "🚗" },
  barberia: { titulo: "Fichas", btn: "+ Agregar ficha", vacio: "Este cliente no tiene fichas registradas", link: "Agregar primera ficha", icono: "✂️" },
}

export default async function ClienteDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const rol = await rolActual()
  const puedeEditar = tienePermiso(rol, "clientes", "editar")
  const puedeEliminar = tienePermiso(rol, "clientes", "eliminar")
  const puedeCrearFicha = tienePermiso(rol, "fichas", "editar") // Actualizado a 'fichas'
  
  const session = await auth()
  const tipoNegocio = (session?.user as any)?.tipoNegocio || "veterinaria"
  const dicc = DICCIONARIO[tipoNegocio] || DICCIONARIO["veterinaria"]

  const { id } = await params
  
  // Actualizado para incluir 'fichas' en lugar de 'mascotas'
  const cliente = await prisma.cliente.findUnique({
    where: { id },
    include: { fichas: { orderBy: { nombre: "asc" } } },
  })
  
  if (!cliente) notFound()

  const deleteAction = eliminarCliente.bind(null, id)

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link href="/clientes" className="text-sm text-gray-500 hover:text-gray-700">
        ← Volver a clientes
      </Link>

      <div className="flex items-start justify-between mt-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{cliente.nombre}</h1>
          {cliente.identificacion && (
            <p className="text-sm text-gray-500 mt-0.5">CC / NIT: {cliente.identificacion}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {puedeEditar && (
            <Link
              href={`/clientes/${id}/editar`}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Editar
            </Link>
          )}
          {puedeEliminar && (
            <BtnEliminar
              action={deleteAction}
              mensaje={`¿Eliminar a ${cliente.nombre}? También se eliminarán sus registros asociados.`}
            />
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="grid grid-cols-2 gap-y-4 gap-x-6">
          {[
            { label: "Teléfono", value: cliente.telefono },
            { label: "Email", value: cliente.email },
            { label: "Dirección", value: cliente.direccion },
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
              <p className="text-sm text-gray-900 mt-0.5">{value ?? "—"}</p>
            </div>
          ))}
        </div>
        {cliente.notas && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Notas</p>
            <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{cliente.notas}</p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-900">
          {dicc.titulo} ({cliente.fichas.length})
        </h2>
        {puedeCrearFicha && (
          <Link
            href={`/fichas/nueva?clienteId=${id}`}
            className="text-sm text-[#1E3A6E] hover:text-[#162D57] font-medium"
          >
            {dicc.btn}
          </Link>
        )}
      </div>

      {cliente.fichas.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400">
          <p className="text-3xl mb-2">{dicc.icono}</p>
          <p className="text-sm">{dicc.vacio}</p>
          {puedeCrearFicha && (
            <Link
              href={`/fichas/nueva?clienteId=${id}`}
              className="text-[#1E3A6E] text-sm mt-2 inline-block hover:text-[#162D57]"
            >
              {dicc.link} →
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {cliente.fichas.map((f) => {
            const datos = (f.datosGenerales as any) || {}
            let subtitulo = f.tipo
            if (tipoNegocio === "veterinaria" && datos.raza) subtitulo += ` · ${datos.raza}`
            if (tipoNegocio === "taller" && datos.marca) subtitulo += ` · ${datos.marca} ${datos.color ? `· ${datos.color}` : ''}`

            return (
              <Link
                key={f.id}
                href={`/fichas/${f.id}`}
                className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 p-4 hover:border-[#1E3A6E] hover:shadow-sm transition-all"
              >
                <span className="text-2xl">{dicc.icono}</span>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{f.nombre}</p>
                  <p className="text-sm text-gray-500 capitalize">{subtitulo}</p>
                </div>
                <span className="ml-auto text-gray-400 text-sm shrink-0">Ver →</span>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}