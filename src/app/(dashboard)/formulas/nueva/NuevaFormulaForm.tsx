"use client"

import { useState } from "react"
import { useActionState } from "react"
import Link from "next/link"
import { crearFormula } from "../actions"
import { SelectField } from "@/components/ui/SelectField"

type ItemFila = { uid: string; medicamento: string; instrucciones: string }
type MascotaOpt = {
  id: string
  nombre: string
  especie: string
  raza: string | null
  fechaNacimiento: Date | null
  peso: number | null
  cliente: { nombre: string }
}
type VetOpt = { id: string; nombre: string }

let _uid = 0
function uid() { return String(++_uid) }

export function NuevaFormulaForm({
  mascotas,
  veterinarios,
}: {
  mascotas: MascotaOpt[]
  veterinarios: VetOpt[]
}) {
  const [state, formAction, pending] = useActionState(crearFormula, {})
  const [mascotaId, setMascotaId] = useState("")
  const [items, setItems] = useState<ItemFila[]>([
    { uid: uid(), medicamento: "", instrucciones: "" },
  ])

  const mascotaSeleccionada = mascotas.find((m) => m.id === mascotaId)

  function addItem() {
    setItems((prev) => [...prev, { uid: uid(), medicamento: "", instrucciones: "" }])
  }
  function removeItem(id: string) {
    if (items.length > 1) setItems((prev) => prev.filter((i) => i.uid !== id))
  }
  function updateItem(id: string, field: "medicamento" | "instrucciones", value: string) {
    setItems((prev) => prev.map((i) => i.uid === id ? { ...i, [field]: value } : i))
  }

  const itemsData = items.map((i) => ({ medicamento: i.medicamento, instrucciones: i.instrucciones }))

  const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"]

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/formulas" className="text-sm text-gray-500 hover:text-gray-700">
          ← Volver a fórmulas
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Nueva fórmula médica</h1>
      </div>

      <form action={formAction} className="space-y-5">
        <input type="hidden" name="itemsJson" value={JSON.stringify(itemsData)} />

        {state.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {state.error}
          </div>
        )}

        {/* Paciente y veterinario */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Datos del paciente</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mascota <span className="text-red-500">*</span>
            </label>
            <SelectField
              name="mascotaId"
              value={mascotaId}
              onChange={(val) => setMascotaId(val)}
              required
              placeholder="Selecciona una mascota"
              options={mascotas.map((m) => ({ value: m.id, label: `${m.nombre} — ${m.cliente.nombre}` }))}
            />
          </div>

          {mascotaSeleccionada && (
            <div className="grid grid-cols-3 gap-3 text-sm bg-gray-50 rounded-lg px-4 py-3">
              <div>
                <p className="text-xs text-gray-400 uppercase">Especie / Raza</p>
                <p className="font-medium text-gray-800 capitalize">
                  {mascotaSeleccionada.especie}{mascotaSeleccionada.raza ? ` · ${mascotaSeleccionada.raza}` : ""}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase">Peso</p>
                <p className="font-medium text-gray-800">
                  {mascotaSeleccionada.peso ? `${mascotaSeleccionada.peso} kg` : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase">Propietario</p>
                <p className="font-medium text-gray-800">{mascotaSeleccionada.cliente.nombre}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Veterinario</label>
            <SelectField
              name="veterinarioId"
              defaultValue=""
              options={[
                { value: "", label: "Sin asignar" },
                ...veterinarios.map((v) => ({ value: v.id, label: v.nombre })),
              ]}
            />
          </div>
        </div>

        {/* Medicamentos */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Medicamentos prescritos</h2>

          {items.map((item, idx) => (
            <div key={item.uid} className="border border-gray-200 rounded-lg p-4 space-y-3 relative">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-[#162D57] bg-[#EBF5F6] px-2 py-0.5 rounded">
                  {ROMAN[idx] ?? idx + 1}
                </span>
                {items.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeItem(item.uid)}
                    className="text-red-400 hover:text-red-600 text-sm"
                  >
                    Eliminar
                  </button>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Medicamento <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={item.medicamento}
                  onChange={(e) => updateItem(item.uid, "medicamento", e.target.value)}
                  placeholder="Ej: Antax suspensión · Farmacia uso humano"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Instrucciones de administración</label>
                <textarea
                  value={item.instrucciones}
                  onChange={(e) => updateItem(item.uid, "instrucciones", e.target.value)}
                  rows={3}
                  placeholder="Ej: Suministrar vía oral 1 ml cada 24 horas, 1 vez al día por 5 días a partir de hoy tarde/noche"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E] resize-none"
                />
              </div>
            </div>
          ))}

          {items.length < 10 && (
            <button
              type="button"
              onClick={addItem}
              className="text-sm text-[#1E3A6E] hover:text-[#162D57] font-medium"
            >
              + Agregar medicamento
            </button>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={pending}
            className="bg-[#1E3A6E] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#162D57] disabled:opacity-50 transition-colors"
          >
            {pending ? "Guardando..." : "Crear fórmula"}
          </button>
          <Link
            href="/formulas"
            className="px-6 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
