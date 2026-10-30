"use client"
import { useActionState } from "react"
import Link from "next/link"
import { crearProducto } from "../actions"
import { SelectField } from "@/components/ui/SelectField"

const DICCIONARIO: Record<string, any> = {
  veterinaria: {
    placeholder: "Ej: Amoxicilina 250mg, Concentrado Premium...",
    categorias: [
      { value: "medicamento", label: "Medicamento" },
      { value: "alimento", label: "Alimento" },
      { value: "accesorio", label: "Accesorio" },
      { value: "higiene", label: "Higiene" },
      { value: "otro", label: "Otro" }
    ]
  },
  taller: {
    placeholder: "Ej: Filtro de aceite, Pastillas de freno, Aceite 20W50...",
    categorias: [
      { value: "repuesto", label: "Repuesto" },
      { value: "insumo", label: "Insumo / Consumible" },
      { value: "accesorio", label: "Accesorio" },
      { value: "herramienta", label: "Herramienta" },
      { value: "otro", label: "Otro" }
    ]
  },
  barberia: {
    placeholder: "Ej: Cera mate, Minoxidil, Cuchillas...",
    categorias: [
      { value: "capilar", label: "Producto Capilar" },
      { value: "facial", label: "Cuidado Facial" },
      { value: "insumo", label: "Insumo / Descartable" },
      { value: "accesorio", label: "Accesorio" },
      { value: "otro", label: "Otro" }
    ]
  }
}

export function NuevoProductoForm({ tipoNegocio }: { tipoNegocio: string }) {
  const [state, formAction, pending] = useActionState(crearProducto, {})
  const dicc = DICCIONARIO[tipoNegocio] || DICCIONARIO["veterinaria"]

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="mb-6">
        <Link href="/inventario" className="text-sm text-gray-500 hover:text-gray-700">
          ← Volver al inventario
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Nuevo producto</h1>
      </div>

      <form action={formAction} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
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
            autoFocus
            placeholder={dicc.placeholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
            <SelectField
              name="categoria"
              defaultValue={dicc.categorias[0].value}
              options={dicc.categorias}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
            <input
              name="unidad"
              type="text"
              defaultValue="unidad"
              placeholder="unidad, kit, galón..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stock inicial</label>
            <input
              name="stock"
              type="number"
              step="any"
              min="0"
              defaultValue="0"
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
              defaultValue="0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Precio de costo</label>
            <input
              name="precioCosto"
              type="number"
              step="any"
              min="0"
              placeholder="Opcional"
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
              placeholder="Opcional"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
            <input
              name="proveedor"
              type="text"
              placeholder="Opcional"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea
              name="notas"
              rows={2}
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
            {pending ? "Guardando..." : "Crear producto"}
          </button>
          <Link
            href="/inventario"
            className="px-6 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}