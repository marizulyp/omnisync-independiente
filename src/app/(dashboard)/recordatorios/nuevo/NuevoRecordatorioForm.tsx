"use client"
import { useActionState, useState } from "react"
import Link from "next/link"
import { crearRecordatorio } from "../actions"
import { SelectField } from "@/components/ui/SelectField"
import { fechaLocalISO } from "@/lib/fechas"

type MascotaOpt = { id: string; nombre: string }
type ClienteOpt = { id: string; nombre: string; mascotas: MascotaOpt[] }

function hoyISO() {
  return fechaLocalISO()
}

export function NuevoRecordatorioForm({ clientes }: { clientes: ClienteOpt[] }) {
  const [state, formAction, pending] = useActionState(crearRecordatorio, {})
  const [clienteId, setClienteId] = useState("")

  const mascotas = clientes.find((c) => c.id === clienteId)?.mascotas ?? []

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="mb-6">
        <Link href="/recordatorios" className="text-sm text-gray-500 hover:text-gray-700">
          ← Volver a recordatorios
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Nuevo recordatorio</h1>
      </div>

      <form action={formAction} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        {state.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {state.error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Mensaje <span className="text-red-500">*</span>
          </label>
          <input
            name="mensaje"
            type="text"
            required
            autoFocus
            placeholder="Ej: Llamar para confirmar cirugía, recoger pedido de proveedor..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha <span className="text-red-500">*</span>
          </label>
          <input
            name="fecha"
            type="date"
            required
            defaultValue={hoyISO()}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
            <SelectField
              name="clienteId"
              value={clienteId}
              onChange={(val) => setClienteId(val)}
              options={[
                { value: "", label: "Sin asociar" },
                ...clientes.map((c) => ({ value: c.id, label: c.nombre })),
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mascota</label>
            <SelectField
              key={clienteId}
              name="mascotaId"
              defaultValue=""
              disabled={!clienteId}
              options={[
                { value: "", label: "Sin asociar" },
                ...mascotas.map((m) => ({ value: m.id, label: m.nombre })),
              ]}
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={pending}
            className="bg-[#1E3A6E] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#162D57] disabled:opacity-50 transition-colors"
          >
            {pending ? "Guardando..." : "Crear recordatorio"}
          </button>
          <Link
            href="/recordatorios"
            className="px-6 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
