"use client"
import { useActionState } from "react"
import Link from "next/link"
import { actualizarUsuario } from "../../actions"
import type { Usuario } from "@/generated/prisma/client"
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

export function EditarUsuarioForm({ 
  usuario, 
  cargo = "", 
  tipoNegocio = "veterinaria" 
}: { 
  usuario: Usuario; 
  cargo?: string;
  tipoNegocio?: string;
}) {
  const [state, action, pending] = useActionState(actualizarUsuario, {})
  const dicc = DICCIONARIO[tipoNegocio] || DICCIONARIO["veterinaria"]

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="mb-6">
        <Link href="/admin/usuarios" className="text-sm text-gray-500 hover:text-gray-700">
          ← Volver a usuarios
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Editar usuario</h1>
      </div>

      <form action={action} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <input type="hidden" name="id" value={usuario.id} />

        {state.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {state.error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre completo <span className="text-red-500">*</span></label>
          <input name="nombre" type="text" required defaultValue={usuario.nombre} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email <span className="text-red-500">*</span></label>
          <input name="email" type="email" required defaultValue={usuario.email} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
          <input name="password" type="password" minLength={6} placeholder="Dejar en blanco para no cambiar" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]" />
          <p className="text-xs text-gray-400 mt-1">Mínimo 6 caracteres. Vacío = sin cambios.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
          <SelectField name="rol" defaultValue={usuario.rol} options={dicc.roles} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
          <input name="cargo" type="text" defaultValue={cargo} placeholder={dicc.placeholderCargo} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
          <SelectField
            name="activo"
            defaultValue={usuario.activo ? "true" : "false"}
            options={[
              { value: "true", label: "Activo" },
              { value: "false", label: "Inactivo (no puede iniciar sesión)" },
            ]}
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={pending} className="bg-[#1E3A6E] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#162D57] disabled:opacity-50 transition-colors">
            {pending ? "Guardando..." : "Guardar cambios"}
          </button>
          <Link href="/admin/usuarios" className="px-6 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}