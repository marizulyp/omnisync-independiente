"use client"
import { useActionState } from "react"
import Link from "next/link"
import { actualizarVacuna } from "../../../../../atenciones/actions"
import type { ControlPreventivo } from "@/generated/prisma/client"
import { fechaLocalISO } from "@/lib/fechas"

function toDateInput(date: Date): string {
  return fechaLocalISO(date)
}

export function EditarVacunaForm({
  vacuna,
  mascotaId,
}: {
  vacuna: ControlPreventivo
  mascotaId: string
}) {
  const [state, action, pending] = useActionState(actualizarVacuna, {})

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="mb-6">
        <Link href={`/fichas/${mascotaId}`} className="text-sm text-gray-500 hover:text-gray-700">
          ← Volver a la ficha
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Editar vacuna</h1>
      </div>

      <form action={action} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <input type="hidden" name="id" value={vacuna.id} />
        <input type="hidden" name="mascotaId" value={mascotaId} />
        {/* Forzamos que el tipo siempre sea vacuna para este formulario */}
        <input type="hidden" name="tipo" value="vacuna" />

        {state.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {state.error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Vacuna <span className="text-red-500">*</span>
          </label>
          <input
            name="nombre"
            type="text"
            required
            defaultValue={vacuna.nombre}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha de aplicación <span className="text-red-500">*</span>
            </label>
            <input
              name="fecha"
              type="date"
              required
              defaultValue={toDateInput(vacuna.fecha)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Próxima dosis</label>
            <input
              name="proximaDosis"
              type="date"
              defaultValue={vacuna.proximaFecha ? toDateInput(vacuna.proximaFecha) : ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas / Lote</label>
            <textarea
              name="notas"
              rows={2}
              defaultValue={vacuna.notas ?? ""}
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
            href={`/fichas/${mascotaId}`}
            className="px-6 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
};