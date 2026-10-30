"use client"
import { useActionState } from "react"
import Link from "next/link"
import { actualizarMascota } from "../../actions"
import type { Mascota } from "@/generated/prisma/client"
import { SelectField } from "@/components/ui/SelectField"
import { fechaLocalISO } from "@/lib/fechas"

const ESPECIES = [
  { value: "perro", label: "Perro" },
  { value: "gato", label: "Gato" },
  { value: "ave", label: "Ave" },
  { value: "conejo", label: "Conejo" },
  { value: "reptil", label: "Reptil" },
  { value: "otro", label: "Otro" },
]

function toDateInputValue(date: Date | null): string {
  if (!date) return ""
  return fechaLocalISO(date)
}

export function EditarMascotaForm({
  mascota,
  clientes,
}: {
  mascota: Mascota
  clientes: { id: string; nombre: string }[]
}) {
  const [state, action, pending] = useActionState(actualizarMascota, {})

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href={`/mascotas/${mascota.id}`} className="text-sm text-gray-500 hover:text-gray-700">
          ← Volver a la mascota
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Editar mascota</h1>
      </div>

      <form action={action} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <input type="hidden" name="id" value={mascota.id} />

        {state.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {state.error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input
              name="nombre"
              type="text"
              required
              defaultValue={mascota.nombre}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Especie</label>
            <SelectField
              name="especie"
              defaultValue={mascota.especie}
              options={ESPECIES}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Raza</label>
            <input
              name="raza"
              type="text"
              defaultValue={mascota.raza ?? ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
            <input
              name="peso"
              type="number"
              step="0.1"
              min="0"
              defaultValue={mascota.peso ?? ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de nacimiento</label>
            <input
              name="fechaNacimiento"
              type="date"
              defaultValue={toDateInputValue(mascota.fechaNacimiento)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente dueño</label>
            <SelectField
              name="clienteId"
              defaultValue={mascota.clienteId}
              options={clientes.map((c) => ({ value: c.id, label: c.nombre }))}
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea
              name="notas"
              rows={3}
              defaultValue={mascota.notas ?? ""}
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
            href={`/mascotas/${mascota.id}`}
            className="px-6 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
