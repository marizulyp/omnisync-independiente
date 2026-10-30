"use client"
import { useActionState } from "react"
import Link from "next/link"
import { actualizarConsulta } from "../../../../../atenciones/actions"
import type { Consulta } from "@/generated/prisma/client"
import { fechaLocalISO } from "@/lib/fechas"

function toDateInput(date: Date): string {
  return fechaLocalISO(date)
}

export function EditarConsultaForm({
  consulta,
  mascotaId,
}: {
  consulta: Consulta
  mascotaId: string
}) {
  const [state, action, pending] = useActionState(actualizarConsulta, {})

  const fieldClass = "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]"
  const textareaClass = `${fieldClass} resize-none`
  const labelClass = "block text-sm font-medium text-gray-700 mb-1"
  const sectionClass = "bg-white rounded-xl border border-gray-200 p-5 space-y-4"
  const sectionTitle = "text-sm font-semibold text-[#162D57] uppercase tracking-wide border-b border-[#B8DDE0] pb-2 mb-3"

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="mb-6">
        <Link
          href={`/mascotas/${mascotaId}/consultas/${consulta.id}`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Volver a la consulta
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Editar consulta</h1>
      </div>

      <form action={action} className="space-y-4">
        <input type="hidden" name="id" value={consulta.id} />
        <input type="hidden" name="mascotaId" value={mascotaId} />

        {state.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {state.error}
          </div>
        )}

        {/* ── Signos vitales ── */}
        <div className={sectionClass}>
          <p className={sectionTitle}>Signos vitales</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Fecha</label>
              <input name="fecha" type="date" defaultValue={toDateInput(consulta.fecha)} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Peso (kg)</label>
              <input name="peso" type="number" step="0.1" min="0" defaultValue={consulta.peso ?? ""} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Temperatura (°C)</label>
              <input name="temperatura" type="number" step="0.1" defaultValue={consulta.temperatura ?? ""} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>FC — Frec. cardíaca (lpm)</label>
              <input name="frecuenciaCardiaca" type="number" min="0" defaultValue={consulta.frecuenciaCardiaca ?? ""} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>FR — Frec. respiratoria (rpm)</label>
              <input name="frecuenciaRespiratoria" type="number" min="0" defaultValue={consulta.frecuenciaRespiratoria ?? ""} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Condición corporal (1–9)</label>
              <input name="condicionCorporal" type="number" min="1" max="9" defaultValue={consulta.condicionCorporal ?? ""} className={fieldClass} />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Mucosas</label>
              <input name="mucosas" type="text" defaultValue={consulta.mucosas ?? ""} className={fieldClass} />
            </div>
          </div>
        </div>

        {/* ── Motivo y Anamnesis ── */}
        <div className={sectionClass}>
          <p className={sectionTitle}>Motivo y Anamnesis</p>
          <div>
            <label className={labelClass}>Motivo de consulta <span className="text-red-500">*</span></label>
            <input name="motivo" type="text" required defaultValue={consulta.motivo} className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>Anamnesis</label>
            <textarea name="anamnesis" rows={3} defaultValue={consulta.anamnesis ?? ""} className={textareaClass} />
          </div>
        </div>

        {/* ── Examen físico ── */}
        <div className={sectionClass}>
          <p className={sectionTitle}>Examen físico</p>
          <div>
            <label className={labelClass}>Síntomas / Hallazgos subjetivos</label>
            <textarea name="sintomas" rows={2} defaultValue={consulta.sintomas ?? ""} className={textareaClass} />
          </div>
          <div>
            <label className={labelClass}>Hallazgos al examen físico</label>
            <textarea name="examenFisico" rows={3} defaultValue={consulta.examenFisico ?? ""} className={textareaClass} />
          </div>
        </div>

        {/* ── Diagnóstico y Plan ── */}
        <div className={sectionClass}>
          <p className={sectionTitle}>Diagnóstico y Plan</p>
          <div>
            <label className={labelClass}>Diagnóstico</label>
            <textarea name="diagnostico" rows={2} defaultValue={consulta.diagnostico ?? ""} className={textareaClass} />
          </div>
          <div>
            <label className={labelClass}>Tratamiento</label>
            <textarea name="tratamiento" rows={3} defaultValue={consulta.tratamiento ?? ""} className={textareaClass} />
          </div>
          <div>
            <label className={labelClass}>Plan de seguimiento</label>
            <textarea name="plan" rows={2} defaultValue={consulta.plan ?? ""} className={textareaClass} />
          </div>
          <div>
            <label className={labelClass}>Observaciones para el propietario</label>
            <textarea name="observaciones" rows={2} defaultValue={consulta.observaciones ?? ""} className={textareaClass} />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={pending}
            className="bg-[#1E3A6E] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#162D57] disabled:opacity-50 transition-colors"
          >
            {pending ? "Guardando..." : "Guardar cambios"}
          </button>
          <Link
            href={`/mascotas/${mascotaId}/consultas/${consulta.id}`}
            className="px-6 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
