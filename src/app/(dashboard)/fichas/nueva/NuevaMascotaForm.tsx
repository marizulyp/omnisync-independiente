"use client"
import { useActionState } from "react"
import Link from "next/link"
import { crearMascota } from "../actions"
import { SelectField } from "@/components/ui/SelectField"

const DICCIONARIO: Record<string, any> = {
  veterinaria: {
    titulo: "Nuevo paciente", labelNombre: "Nombre del paciente", labelTipo: "Especie", labelCliente: "Dueño / Propietario",
    opcionesTipo: [{ value: "perro", label: "Perro" }, { value: "gato", label: "Gato" }, { value: "ave", label: "Ave" }, { value: "otro", label: "Otro" }],
    volver: "/fichas"
  },
  taller: {
    titulo: "Nuevo vehículo", labelNombre: "Placa", labelTipo: "Tipo de vehículo", labelCliente: "Propietario",
    opcionesTipo: [{ value: "carro", label: "Carro" }, { value: "moto", label: "Moto" }, { value: "bicicleta", label: "Bicicleta" }, { value: "otro", label: "Otro" }],
    volver: "/fichas"
  },
  barberia: {
    titulo: "Nuevo historial de belleza", 
    labelNombre: "Referencia (Ej: Corte clásico de Juan)", // Cambiamos la redundancia del nombre
    labelTipo: "Servicio frecuente", 
    labelCliente: "Selecciona el Cliente", // Adiós al texto robótico de "Vincular"
    opcionesTipo: [{ value: "corte", label: "Corte" }, { value: "color", label: "Color" }, { value: "barba", label: "Barba" }, { value: "otro", label: "Otro" }],
    volver: "/fichas"
  },
}

export function NuevaMascotaForm({
  clientes,
  defaultClienteId,
  tipoNegocio = "veterinaria"
}: {
  clientes: { id: string; nombre: string }[]
  defaultClienteId?: string
  tipoNegocio?: string
}) {
  const [state, action, pending] = useActionState(crearMascota, {})
  const dicc = DICCIONARIO[tipoNegocio] || DICCIONARIO["veterinaria"]

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href={defaultClienteId ? `/clientes/${defaultClienteId}` : dicc.volver} className="text-sm text-gray-500 hover:text-gray-700">
          ← Volver
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">{dicc.titulo}</h1>
      </div>

      <form action={action} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        {state.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {state.error}
          </div>
        )}

        {/* Campo oculto para pasar el tipo de negocio al servidor */}
        <input type="hidden" name="tipoNegocio" value={tipoNegocio} />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {dicc.labelNombre} <span className="text-red-500">*</span>
            </label>
            <input name="nombre" type="text" required autoFocus className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {dicc.labelTipo} <span className="text-red-500">*</span>
            </label>
            <SelectField name="tipo" defaultValue={dicc.opcionesTipo[0].value} options={dicc.opcionesTipo} />
          </div>

          {/* CAMPOS DINÁMICOS SEGÚN INDUSTRIA */}
          {tipoNegocio === "taller" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Marca / Modelo</label>
                <input name="marca" type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <input name="color" type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]" />
              </div>
            </>
          )}

          {tipoNegocio === "veterinaria" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Raza</label>
                <input name="raza" type="text" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Peso (kg)</label>
                <input name="peso" type="number" step="0.1" min="0" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de nacimiento</label>
                <input name="fechaNacimiento" type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]" />
              </div>
            </>
          )}

          {/* El selector de clientes ahora es dinámico (Vincular a cliente vs Propietario) */}
          <div className={tipoNegocio === "veterinaria" ? "" : "col-span-2"}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {dicc.labelCliente} <span className="text-red-500">*</span>
            </label>
            <SelectField
              name="clienteId"
              defaultValue={defaultClienteId ?? ""}
              required
              placeholder="Seleccionar..."
              options={clientes.map((c) => ({ value: c.id, label: c.nombre }))}
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea name="notas" rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E] resize-none" />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={pending} className="bg-[#1E3A6E] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#162D57] disabled:opacity-50 transition-colors">
            {pending ? "Guardando..." : "Guardar registro"}
          </button>
          <Link href={defaultClienteId ? `/clientes/${defaultClienteId}` : dicc.volver} className="px-6 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}