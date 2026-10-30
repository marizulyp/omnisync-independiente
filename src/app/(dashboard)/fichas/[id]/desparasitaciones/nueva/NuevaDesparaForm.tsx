"use client"
import { useActionState } from "react"
import Link from "next/link"
import { crearDesparasitacion } from "../../../../atenciones/actions"
import { SelectField } from "@/components/ui/SelectField"
import { fechaLocalISO } from "@/lib/fechas"

function hoy() {
  return fechaLocalISO()
}

export function NuevaDesparaForm({
  mascotaId,
  mascotaNombre,
}: {
  mascotaId: string
  mascotaNombre: string
}) {
  const action = crearDesparasitacion.bind(null, mascotaId)
  const [state, formAction, pending] = useActionState(action, {})

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="mb-6">
        <Link href={`/mascotas/${mascotaId}`} className="text-sm text-gray-500 hover:text-gray-700">
          ← Volver a {mascotaNombre}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Registrar desparasitación</h1>
        <p className="text-sm text-gray-500 mt-0.5">Paciente: {mascotaNombre}</p>
      </div>

      <form action={formAction} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        {state.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {state.error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha <span className="text-red-500">*</span>
            </label>
            <input
              name="fecha"
              type="date"
              required
              defaultValue={hoy()}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
            <SelectField
              name="tipo"
              defaultValue="interna"
              options={[
                { value: "interna", label: "Interna" },
                { value: "externa", label: "Externa (pulgas/garrapatas)" },
                { value: "ambas", label: "Ambas" },
              ]}
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Producto</label>
            <input
              name="producto"
              type="text"
              placeholder="Ej: Milbemax, Nexgard, Bravecto..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Próxima dosis</label>
            <input
              name="proximaDosis"
              type="date"
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
            {pending ? "Guardando..." : "Guardar"}
          </button>
          <Link
            href={`/mascotas/${mascotaId}`}
            className="px-6 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
