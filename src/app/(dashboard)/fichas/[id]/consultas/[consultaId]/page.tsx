import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { BtnEliminar } from "@/components/ui/BtnEliminar"
import { eliminarConsulta } from "../../../../atenciones/actions"
import { rolActual } from "@/lib/permisos-server"
import { tienePermiso } from "@/lib/permisos"

export default async function ConsultaDetallePage({
  params,
}: {
  params: Promise<{ id: string; consultaId: string }>
}) {
  const rol = await rolActual()
  const puedeEditar = tienePermiso(rol, "consultas", "editar")
  const puedeEliminar = tienePermiso(rol, "consultas", "eliminar")
  const { id: mascotaId, consultaId } = await params
  const consulta = await prisma.consulta.findUnique({
    where: { id: consultaId },
    include: {
      mascota: { include: { cliente: { select: { nombre: true } } } },
      veterinario: { select: { nombre: true } },
    },
  })
  if (!consulta || consulta.mascotaId !== mascotaId) notFound()

  const deleteAction = eliminarConsulta.bind(null, consultaId, mascotaId)

  const tieneSignos = consulta.peso || consulta.temperatura || consulta.frecuenciaCardiaca ||
    consulta.frecuenciaRespiratoria || consulta.condicionCorporal || consulta.mucosas

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link href={`/mascotas/${mascotaId}`} className="text-sm text-gray-500 hover:text-gray-700">
        ← Volver a {consulta.mascota.nombre}
      </Link>

      <div className="flex items-start justify-between mt-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{consulta.motivo}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {consulta.fecha.toLocaleDateString("es-CO", {
              weekday: "long", day: "numeric", month: "long", year: "numeric",
            })}
            {consulta.veterinario && ` · Dr(a). ${consulta.veterinario.nombre}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/mascotas/${mascotaId}/consultas/${consultaId}/imprimir`}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Imprimir
          </Link>
          {puedeEditar && (
            <Link
              href={`/mascotas/${mascotaId}/consultas/${consultaId}/editar`}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Editar
            </Link>
          )}
          {puedeEliminar && (
            <BtnEliminar action={deleteAction} mensaje="¿Eliminar esta consulta?" />
          )}
        </div>
      </div>

      <div className="space-y-4">
        {/* Signos vitales */}
        {tieneSignos && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-semibold text-[#162D57] uppercase tracking-wide border-b border-[#B8DDE0] pb-2 mb-3">
              Signos vitales
            </p>
            <div className="grid grid-cols-3 gap-4 text-sm">
              {consulta.peso && (
                <div>
                  <p className="text-xs text-gray-400 uppercase">Peso</p>
                  <p className="font-medium text-gray-900">{consulta.peso} kg</p>
                </div>
              )}
              {consulta.temperatura && (
                <div>
                  <p className="text-xs text-gray-400 uppercase">Temperatura</p>
                  <p className="font-medium text-gray-900">{consulta.temperatura} °C</p>
                </div>
              )}
              {consulta.frecuenciaCardiaca && (
                <div>
                  <p className="text-xs text-gray-400 uppercase">FC</p>
                  <p className="font-medium text-gray-900">{consulta.frecuenciaCardiaca} lpm</p>
                </div>
              )}
              {consulta.frecuenciaRespiratoria && (
                <div>
                  <p className="text-xs text-gray-400 uppercase">FR</p>
                  <p className="font-medium text-gray-900">{consulta.frecuenciaRespiratoria} rpm</p>
                </div>
              )}
              {consulta.condicionCorporal && (
                <div>
                  <p className="text-xs text-gray-400 uppercase">Condición corporal</p>
                  <p className="font-medium text-gray-900">{consulta.condicionCorporal}/9</p>
                </div>
              )}
              {consulta.mucosas && (
                <div className="col-span-3">
                  <p className="text-xs text-gray-400 uppercase">Mucosas</p>
                  <p className="font-medium text-gray-900">{consulta.mucosas}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Anamnesis */}
        {consulta.anamnesis && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-semibold text-[#162D57] uppercase tracking-wide border-b border-[#B8DDE0] pb-2 mb-3">
              Anamnesis
            </p>
            <p className="text-sm text-gray-900 whitespace-pre-wrap">{consulta.anamnesis}</p>
          </div>
        )}

        {/* Examen físico */}
        {(consulta.sintomas || consulta.examenFisico) && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <p className="text-xs font-semibold text-[#162D57] uppercase tracking-wide border-b border-[#B8DDE0] pb-2">
              Examen físico
            </p>
            {consulta.sintomas && (
              <div>
                <p className="text-xs text-gray-400 uppercase mb-1">Síntomas / Hallazgos subjetivos</p>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{consulta.sintomas}</p>
              </div>
            )}
            {consulta.examenFisico && (
              <div>
                <p className="text-xs text-gray-400 uppercase mb-1">Hallazgos al examen físico</p>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{consulta.examenFisico}</p>
              </div>
            )}
          </div>
        )}

        {/* Diagnóstico y Plan */}
        {(consulta.diagnostico || consulta.tratamiento || consulta.plan || consulta.observaciones) && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <p className="text-xs font-semibold text-[#162D57] uppercase tracking-wide border-b border-[#B8DDE0] pb-2">
              Diagnóstico y Plan
            </p>
            {consulta.diagnostico && (
              <div>
                <p className="text-xs text-gray-400 uppercase mb-1">Diagnóstico</p>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{consulta.diagnostico}</p>
              </div>
            )}
            {consulta.tratamiento && (
              <div>
                <p className="text-xs text-gray-400 uppercase mb-1">Tratamiento</p>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{consulta.tratamiento}</p>
              </div>
            )}
            {consulta.plan && (
              <div>
                <p className="text-xs text-gray-400 uppercase mb-1">Plan de seguimiento</p>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{consulta.plan}</p>
              </div>
            )}
            {consulta.observaciones && (
              <div>
                <p className="text-xs text-gray-400 uppercase mb-1">Observaciones para el propietario</p>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{consulta.observaciones}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
