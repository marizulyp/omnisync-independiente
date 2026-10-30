"use client"
import { useActionState } from "react"
import { registrarMovimiento } from "../actions"
import { SelectField } from "@/components/ui/SelectField"

export function RegistrarMovimientoForm({
  productoId,
  unidad,
}: {
  productoId: string
  unidad: string
}) {
  const action = registrarMovimiento.bind(null, productoId)
  const [state, formAction, pending] = useActionState(action, {})

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="font-semibold text-gray-900 mb-3">Registrar movimiento</h2>

      {state.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-3">
          {state.error}
        </div>
      )}

      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Tipo</label>
          <SelectField
            name="tipo"
            defaultValue="entrada"
            options={[
              { value: "entrada", label: "Entrada" },
              { value: "salida", label: "Salida" },
              { value: "ajuste", label: "Ajuste (fijar stock)" },
            ]}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">Cantidad ({unidad})</label>
          <input
            name="cantidad"
            type="number"
            step="any"
            min="0"
            required
            className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]"
          />
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-medium text-gray-700 mb-1">Motivo</label>
          <input
            name="motivo"
            type="text"
            placeholder="Opcional: compra, venta, vencido..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="bg-[#1E3A6E] text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-[#162D57] disabled:opacity-50 transition-colors"
        >
          {pending ? "Guardando..." : "Registrar"}
        </button>
      </form>
    </div>
  )
}
