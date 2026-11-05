import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { BtnEliminar } from "@/components/ui/BtnEliminar"
import { eliminarProducto } from "../actions"
import { RegistrarMovimientoForm } from "./RegistrarMovimientoForm"
import type { TipoMovimiento } from "@/generated/prisma/client"
import { rolActual } from "@/lib/permisos-server"
import { tienePermiso } from "@/lib/permisos"

const TIPO_LABEL: Record<TipoMovimiento, string> = {
  entrada: "Entrada",
  salida: "Salida",
  ajuste: "Ajuste",
}

const TIPO_STYLE: Record<TipoMovimiento, string> = {
  entrada: "bg-green-50 text-green-700",
  salida: "bg-red-50 text-red-700",
  ajuste: "bg-gray-100 text-gray-700",
}

export default async function ProductoDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const rol = await rolActual()
  const puedeEditar = tienePermiso(rol, "inventario", "editar")
  const puedeEliminar = tienePermiso(rol, "inventario", "eliminar")
  const puedeMovimientos = tienePermiso(rol, "inventario", "movimientos")
  const { id } = await params
  const producto = await prisma.producto.findUnique({
    where: { id },
    include: {
      movimientos: {
        orderBy: { fecha: "desc" },
        take: 30,
        include: { usuario: { select: { nombre: true } } },
      },
    },
  })
  if (!producto) notFound()

  const deleteAction = eliminarProducto.bind(null, id)
  const stockBajo = producto.stock <= producto.stockMinimo

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link href="/inventario" className="text-sm text-gray-500 hover:text-gray-700">
        ← Volver al inventario
      </Link>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{producto.nombre}</h1>
          {/* La categoría ahora se imprime directamente al ser un String libre */}
          <p className="text-sm text-gray-500">{producto.categoria}</p>
        </div>
        <div className="flex items-center gap-2">
          {puedeEditar && (
            <Link
              href={`/inventario/${id}/editar`}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Editar
            </Link>
          )}
          {puedeEliminar && (
            <BtnEliminar action={deleteAction} mensaje={`¿Eliminar "${producto.nombre}"?`} />
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="grid grid-cols-2 gap-y-4 gap-x-6">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Stock actual</p>
            <p className={`text-lg font-bold mt-0.5 ${stockBajo ? "text-amber-600" : "text-gray-900"}`}>
              {producto.stock} {producto.unidad} {stockBajo && "⚠️"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Stock mínimo</p>
            <p className="text-sm text-gray-900 mt-0.5">{producto.stockMinimo} {producto.unidad}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Precio de costo</p>
            <p className="text-sm text-gray-900 mt-0.5">
              {producto.precioCosto ? `$${producto.precioCosto.toLocaleString("es-CO")}` : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Precio de venta</p>
            <p className="text-sm text-gray-900 mt-0.5">
              {producto.precioVenta ? `$${producto.precioVenta.toLocaleString("es-CO")}` : "—"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Proveedor</p>
            <p className="text-sm text-gray-900 mt-0.5">{producto.proveedor ?? "—"}</p>
          </div>
        </div>
        {producto.notas && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Notas</p>
            <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{producto.notas}</p>
          </div>
        )}
      </div>

      {puedeMovimientos && (
        <RegistrarMovimientoForm productoId={id} unidad={producto.unidad} />
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Historial de movimientos</h2>
        </div>
        {producto.movimientos.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">Sin movimientos registrados</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {producto.movimientos.map((m) => (
              <div key={m.id} className="px-5 py-3 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-medium px-2 py-1 rounded ${TIPO_STYLE[m.tipo]}`}>
                    {TIPO_LABEL[m.tipo]}
                  </span>
                  <div>
                    <p className="text-sm text-gray-900">
                      {m.tipo === "ajuste" ? "Nuevo stock: " : ""}
                      {m.cantidad} {producto.unidad}
                    </p>
                    {m.motivo && <p className="text-xs text-gray-500">{m.motivo}</p>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-gray-400">
                    {m.fecha.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                  </p>
                  {m.usuario && <p className="text-xs text-gray-400">{m.usuario.nombre}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
};