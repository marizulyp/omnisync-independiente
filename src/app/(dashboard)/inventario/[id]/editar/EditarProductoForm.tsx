"use client"
import { useActionState } from "react"
import Link from "next/link"
import { actualizarProducto } from "../../actions"
import type { Producto } from "@/generated/prisma/client"
import { SelectField } from "@/components/ui/SelectField"

export function EditarProductoForm({ producto }: { producto: Producto }) {
  const [state, action, pending] = useActionState(actualizarProducto, {})

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="mb-6">
        <Link href={`/inventario/${producto.id}`} className="text-sm text-gray-500 hover:text-gray-700">
          ← Volver al producto
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Editar producto</h1>
      </div>

      <form action={action} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <input type="hidden" name="id" value={producto.id} />

        {state.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {state.error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Nombre <span className="text-red-500">*</span>
          </label>
          <input
            name="nombre"
            type="text"
            required
            defaultValue={producto.nombre}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
            <SelectField
              name="categoria"
              defaultValue={producto.categoria}
              options={[
                { value: "medicamento", label: "Medicamento" },
                { value: "alimento", label: "Alimento" },
                { value: "accesorio", label: "Accesorio" },
                { value: "higiene", label: "Higiene" },
                { value: "otro", label: "Otro" },
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
            <input
              name="unidad"
              type="text"
              defaultValue={producto.unidad}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stock mínimo</label>
            <input
              name="stockMinimo"
              type="number"
              step="any"
              min="0"
              defaultValue={producto.stockMinimo}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]"
            />
          </div>
          <div>
            <p className="text-xs text-gray-400 mt-7">
              El stock actual ({producto.stock} {producto.unidad}) se ajusta desde &ldquo;Registrar movimiento&rdquo;
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Precio de costo</label>
            <input
              name="precioCosto"
              type="number"
              step="any"
              min="0"
              defaultValue={producto.precioCosto ?? ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Precio de venta</label>
            <input
              name="precioVenta"
              type="number"
              step="any"
              min="0"
              defaultValue={producto.precioVenta ?? ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
            <input
              name="proveedor"
              type="text"
              defaultValue={producto.proveedor ?? ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea
              name="notas"
              rows={2}
              defaultValue={producto.notas ?? ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E] resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={pending}
            className="bg-[#1E3A6E] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#162D57] disabled:opacity-50 transition-colors"
          >
            {pending ? "Guardando..." : "Guardar cambios"}
          </button>
          <Link
            href={`/inventario/${producto.id}`}
            className="px-6 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
