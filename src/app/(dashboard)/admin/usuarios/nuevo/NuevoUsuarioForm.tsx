"use client"
import { useActionState } from "react"
import Link from "next/link"
import { crearUsuario } from "../actions"
import { SelectField } from "@/components/ui/SelectField"

const DICCIONARIO: Record<string, any> = {
  veterinaria: {
    roles: [
      { value: "recepcionista", label: "Recepcionista" },
      { value: "veterinario", label: "Veterinario/a" },
      { value: "enfermero", label: "Enfermero/a" },
      { value: "admin", label: "Administrador" },
    ],
    placeholderCargo: "Ej: Médico Veterinario, Auxiliar, Recepcionista…"
  },
  taller: {
    roles: [
      { value: "recepcionista", label: "Servicio al Cliente / Caja" },
      { value: "veterinario", label: "Mecánico Especialista" },
      { value: "enfermero", label: "Ayudante / Asistente" },
      { value: "admin", label: "Administrador" },
    ],
    placeholderCargo: "Ej: Jefe de Taller, Mecánico, Electricista…"
  },
  barberia: {
    roles: [
      { value: "recepcionista", label: "Recepción / Caja" },
      { value: "veterinario", label: "Especialista / Barbero" },
      { value: "enfermero", label: "Asistente / Aprendiz" },
      { value: "admin", label: "Administrador" },
    ],
    placeholderCargo: "Ej: Barbero Principal, Colorista, Manicurista…"
  }
}

export function NuevoUsuarioForm({ tipoNegocio = "veterinaria" }: { tipoNegocio?: string }) {
  const [state, action, pending] = useActionState(crearUsuario, {})
  const dicc = DICCIONARIO[tipoNegocio] || DICCIONARIO["veterinaria"]

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="mb-6">
        <Link href="/admin/usuarios" className="text-sm text-gray-500 hover:text-gray-700">
          ← Volver a usuarios
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Nuevo usuario</h1>
      </div>

      <form action={action} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        {state.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {state.error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo <span className="text-red-500">*</span></label>
          <input name="nombre" type="text" required autoFocus className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
          <input name="email" type="email" required className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña <span className="text-red-500">*</span></label>
          <input name="password" type="password" required minLength={6} placeholder="Mínimo 6 caracteres" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
          <SelectField name="rol" defaultValue="recepcionista" options={dicc.roles} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
          <input name="cargo" type="text" placeholder={dicc.placeholderCargo} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]" />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={pending} className="bg-[#1E3A6E] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#162D57] disabled:opacity-50 transition-colors">
            {pending ? "Creando..." : "Crear usuario"}
          </button>
          <Link href="/admin/usuarios" className="px-6 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}