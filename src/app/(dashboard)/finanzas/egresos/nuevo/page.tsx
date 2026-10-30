"use client"
import { useActionState } from "react"
import Link from "next/link"
import { crearEgreso } from "../../actions"
import { SelectField } from "@/components/ui/SelectField"
import { fechaLocalISO } from "@/lib/fechas"

function hoyISO() {
  return fechaLocalISO()
}

export default function NuevoEgresoPage() {
  const [state, formAction, pending] = useActionState(crearEgreso, {})

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="mb-6">
        <Link href="/finanzas/egresos" className="text-sm text-gray-500 hover:text-gray-700">
          ← Volver a egresos
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Registrar egreso</h1>
      </div>

      <form action={formAction} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        {state.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {state.error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Concepto <span className="text-red-500">*</span>
          </label>
          <input
            name="concepto"
            type="text"
            required
            autoFocus
            placeholder="Ej: Compra de insumos, pago de servicios..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monto <span className="text-red-500">*</span>
            </label>
            <input
              name="monto"
              type="number"
              step="any"
              min="0"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
            <input
              name="fecha"
              type="date"
              defaultValue={hoyISO()}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
            <SelectField
              name="categoria"
              defaultValue="otro"
              options={[
                { value: "insumos", label: "Insumos" },
                { value: "nomina", label: "Nómina" },
                { value: "servicios", label: "Servicios" },
                { value: "arriendo", label: "Arriendo" },
                { value: "otro", label: "Otro" },
              ]}
            />
          </div>
          <div>
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
            {pending ? "Guardando..." : "Registrar egreso"}
          </button>
          <Link
            href="/finanzas/egresos"
            className="px-6 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
