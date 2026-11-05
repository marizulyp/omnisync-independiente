"use client"

import { useState } from "react"
import { useActionState } from "react"
import Link from "next/link"
import { crearFormula } from "../actions"
import { SelectField } from "@/components/ui/SelectField"

type ItemFila = { uid: string; item: string; instrucciones: string }
type FichaOpt = {
  id: string
  nombre: string
  tipo: string
  datosGenerales: any
  cliente: { nombre: string }
}
type EspecialistaOpt = { id: string; nombre: string }

let _uid = 0
function uid() { return String(++_uid) }

export function NuevaFormulaForm({
  fichas,
  especialistas,
}: {
  fichas: FichaOpt[]
  especialistas: EspecialistaOpt[]
}) {
  const [state, formAction, pending] = useActionState(crearFormula, {})
  const [fichaId, setFichaId] = useState("")
  const [items, setItems] = useState<ItemFila[]>([
    { uid: uid(), item: "", instrucciones: "" },
  ])

  const fichaSeleccionada = fichas.find((f) => f.id === fichaId)

  function addItem() {
    setItems((prev) => [...prev, { uid: uid(), item: "", instrucciones: "" }])
  }
  function removeItem(id: string) {
    if (items.length > 1) setItems((prev) => prev.filter((i) => i.uid !== id))
  }
  function updateItem(id: string, field: "item" | "instrucciones", value: string) {
    setItems((prev) => prev.map((i) => i.uid === id ? { ...i, [field]: value } : i))
  }

  // Empaquetamos los datos enviando 'item' en el JSON que procesará el Server Action
  const itemsData = items.map((i) => ({ item: i.item, instrucciones: i.instrucciones }))

  const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"]

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <Link href="/formulas" className="text-sm text-gray-500 hover:text-gray-700">
          ← Volver a fórmulas
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Nueva recomendación médica</h1>
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
              Paciente / Ficha <span className="text-red-500">*</span>
            </label>
            <SelectField
              name="fichaId"
              value={fichaId}
              onChange={(val) => setFichaId(val)}
              required
              placeholder="Selecciona un paciente"
              options={fichas.map((f) => ({ value: f.id, label: `${f.nombre} — ${f.cliente.nombre}` }))}
            />
          </div>

          {fichaSeleccionada && (
            <div className="grid grid-cols-3 gap-3 text-sm bg-gray-50 rounded-lg px-4 py-3">
              <div>
                <p className="text-xs text-gray-400 uppercase">Especie / Raza</p>
                <p className="font-medium text-gray-800 capitalize">
                  {fichaSeleccionada.datosGenerales?.especie || fichaSeleccionada.tipo}
                  {fichaSeleccionada.datosGenerales?.raza ? ` · ${fichaSeleccionada.datosGenerales.raza}` : ""}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase">Peso</p>
                <p className="font-medium text-gray-800">
                  {fichaSeleccionada.datosGenerales?.peso ? `${fichaSeleccionada.datosGenerales.peso} kg` : "—"}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-400 uppercase">Propietario</p>
                <p className="font-medium text-gray-800">{fichaSeleccionada.cliente.nombre}</p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Especialista / Veterinario</label>
            <SelectField
              name="especialistaId"
              defaultValue=""
              options={[
                { value: "", label: "Sin asignar" },
                ...especialistas.map((e) => ({ value: e.id, label: e.nombre })),
              ]}
            />
          </div>
        </div>

        {/* Medicamentos */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Recomendaciones y/o Medicamentos</h2>

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
                  Recomendación o Medicamento <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={item.item}
                  onChange={(e) => updateItem(item.uid, "item", e.target.value)}
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
              + Agregar recomendación
            </button>
          )}
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={pending}
            className="bg-[#1E3A6E] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#162D57] disabled:opacity-50 transition-colors"
          >
            {pending ? "Guardando..." : "Crear recomendación"}
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
};