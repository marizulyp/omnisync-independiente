"use client"
import { useActionState } from "react"
import Link from "next/link"
import { guardarEmpleado } from "../../actions"
import type { Usuario, Empleado } from "@/generated/prisma/client"

const DIAS = [
  "lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo",
]

export function EditarEmpleadoForm({
  usuario,
  empleado,
}: {
  usuario: Usuario
  empleado: Empleado | null
}) {
  const [state, action, pending] = useActionState(guardarEmpleado, {})

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="mb-6">
        <Link href="/admin/empleados" className="text-sm text-gray-500 hover:text-gray-700">
          ← Volver a empleados
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">
          {empleado ? "Editar" : "Crear"} perfil de empleado
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">{usuario.nombre} · {usuario.email}</p>
      </div>

      <form action={action} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <input type="hidden" name="usuarioId" value={usuario.id} />

        {state.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {state.error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
          <input
            name="cargo"
            type="text"
            defaultValue={empleado?.cargo ?? ""}
            placeholder="Ej: Médico veterinario, Auxiliar..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono personal</label>
          <input
            name="telefono"
            type="tel"
            defaultValue={empleado?.telefono ?? ""}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
          <input
            name="direccion"
            type="text"
            defaultValue={empleado?.direccion ?? ""}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hora entrada</label>
            <input
              name="horaEntrada"
              type="time"
              defaultValue={empleado?.horaEntrada ?? ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Hora salida</label>
            <input
              name="horaSalida"
              type="time"
              defaultValue={empleado?.horaSalida ?? ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Días laborales</label>
          <div className="grid grid-cols-4 gap-2">
            {DIAS.map((dia) => (
              <label key={dia} className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  name="diasLaborales"
                  value={dia}
                  defaultChecked={empleado?.diasLaborales.includes(dia) ?? false}
                  className="rounded border-gray-300 text-[#1E3A6E] focus:ring-[#1E3A6E]"
                />
                <span className="text-sm text-gray-700 capitalize">{dia.slice(0, 3)}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={pending}
            className="bg-[#1E3A6E] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#162D57] disabled:opacity-50 transition-colors"
          >
            {pending ? "Guardando..." : "Guardar perfil"}
          </button>
          <Link
            href="/admin/empleados"
            className="px-6 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
