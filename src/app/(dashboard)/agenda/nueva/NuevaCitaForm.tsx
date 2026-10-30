"use client"
import { useActionState } from "react"
import Link from "next/link"
import { crearCita } from "../actions"
import { SelectField } from "@/components/ui/SelectField"

const DICCIONARIO: Record<string, any> = {
  veterinaria: {
    labelFicha: "Paciente", labelEspecialista: "Veterinario(a)",
    opcionesTipo: [{ value: "consulta", label: "Consulta" }, { value: "cirugia", label: "Cirugía" }, { value: "vacunacion", label: "Vacunación" }, { value: "control", label: "Control" }]
  },
  taller: {
    labelFicha: "Vehículo", labelEspecialista: "Mecánico(a)",
    opcionesTipo: [{ value: "mantenimiento", label: "Mantenimiento" }, { value: "reparacion", label: "Reparación" }, { value: "revision", label: "Revisión" }, { value: "otro", label: "Otro" }]
  },
  barberia: {
    labelFicha: "Cliente / Ficha", labelEspecialista: "Barbero / Estilista",
    opcionesTipo: [{ value: "corte", label: "Corte" }, { value: "color", label: "Color" }, { value: "tratamiento", label: "Tratamiento" }, { value: "otro", label: "Otro" }]
  },
}

function hoyISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

type FichaOpt = { id: string; nombre: string; cliente: { nombre: string } }
type EspOpt = { id: string; nombre: string }

export function NuevaCitaForm({
  fichas,
  especialistas,
  defaultFecha,
  defaultFichaId,
  tipoNegocio = "veterinaria"
}: {
  fichas: FichaOpt[]
  especialistas: EspOpt[]
  defaultFecha?: string
  defaultFichaId?: string
  tipoNegocio?: string
}) {
  const [state, formAction, pending] = useActionState(crearCita, {})
  const fecha = defaultFecha ?? hoyISO()
  const dicc = DICCIONARIO[tipoNegocio] || DICCIONARIO["veterinaria"]

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="mb-6">
        <Link href={`/agenda?fecha=${fecha}`} className="text-sm text-gray-500 hover:text-gray-700">
          ← Volver a la agenda
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Nueva cita</h1>
      </div>

      <form action={formAction} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        {state.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {state.error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {dicc.labelFicha} <span className="text-red-500">*</span>
          </label>
          <SelectField
            name="fichaId"
            required
            defaultValue={defaultFichaId ?? ""}
            placeholder={`Selecciona un ${dicc.labelFicha.toLowerCase()}`}
            options={fichas.map((f) => ({ value: f.id, label: `${f.nombre} — ${f.cliente.nombre}` }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha <span className="text-red-500">*</span>
            </label>
            <input
              name="fecha"
              type="date"
              required
              defaultValue={fecha}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Hora <span className="text-red-500">*</span>
            </label>
            <input
              name="hora"
              type="time"
              required
              defaultValue="09:00"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo de cita <span className="text-red-500">*</span>
            </label>
            <SelectField
              name="tipo"
              defaultValue={dicc.opcionesTipo[0].value}
              options={dicc.opcionesTipo}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motivo <span className="text-red-500">*</span>
            </label>
            <input
              name="motivo"
              type="text"
              required
              placeholder="Breve descripción..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{dicc.labelEspecialista}</label>
          <SelectField
            name="especialistaId"
            defaultValue=""
            options={[
              { value: "", label: "Sin asignar" },
              ...especialistas.map((e) => ({ value: e.id, label: e.nombre })),
            ]}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
          <textarea
            name="notas"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E] resize-none"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={pending}
            className="bg-[#1E3A6E] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#162D57] disabled:opacity-50 transition-colors"
          >
            {pending ? "Guardando..." : "Crear cita"}
          </button>
          <Link
            href={`/agenda?fecha=${fecha}`}
            className="px-6 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}