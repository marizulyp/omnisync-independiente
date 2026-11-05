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
  // Usamos el módulo correcto para verificar permisos
  const puedeEditar = tienePermiso(rol, "atenciones", "editar")
  const puedeEliminar = tienePermiso(rol, "atenciones", "eliminar")
  
  const { id: fichaId, consultaId } = await params
  
  // Usamos el modelo atencion e incluimos la ficha y el especialista
  const atencion = await prisma.atencion.findUnique({
    where: { id: consultaId },
    include: {
      ficha: { include: { cliente: { select: { nombre: true } } } },
      especialista: { select: { nombre: true } },
    },
  })
  
  if (!atencion || atencion.fichaId !== fichaId) notFound()

  const deleteAction = eliminarConsulta.bind(null, consultaId, fichaId)

  // Extraemos la información del JSON dinámico de forma segura para TypeScript
  const detalles = (atencion.detalles as any) || {}

  const tieneSignos = detalles.peso || detalles.temperatura || detalles.frecuenciaCardiaca ||
    detalles.frecuenciaRespiratoria || detalles.condicionCorporal || detalles.mucosas

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <Link href={`/fichas/${fichaId}`} className="text-sm text-gray-500 hover:text-gray-700">
        ← Volver a {atencion.ficha.nombre}
      </Link>

      <div className="flex items-start justify-between mt-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{atencion.motivo}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {atencion.fecha.toLocaleDateString("es-CO", {
              weekday: "long", day: "numeric", month: "long", year: "numeric",
            })}
            {atencion.especialista && ` · Dr(a). ${atencion.especialista.nombre}`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/fichas/${fichaId}/consultas/${consultaId}/imprimir`}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Imprimir
          </Link>
          {puedeEditar && (
            <Link
              href={`/fichas/${fichaId}/consultas/${consultaId}/editar`}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Editar
            </Link>
          )}
          {puedeEliminar && (
            <BtnEliminar action={deleteAction} mensaje="¿Eliminar esta atención médica?" />
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
              {detalles.peso && (
                <div>
                  <p className="text-xs text-gray-400 uppercase">Peso</p>
                  <p className="font-medium text-gray-900">{detalles.peso} kg</p>
                </div>
              )}
              {detalles.temperatura && (
                <div>
                  <p className="text-xs text-gray-400 uppercase">Temperatura</p>
                  <p className="font-medium text-gray-900">{detalles.temperatura} °C</p>
                </div>
              )}
              {detalles.frecuenciaCardiaca && (
                <div>
                  <p className="text-xs text-gray-400 uppercase">FC</p>
                  <p className="font-medium text-gray-900">{detalles.frecuenciaCardiaca} lpm</p>
                </div>
              )}
              {detalles.frecuenciaRespiratoria && (
                <div>
                  <p className="text-xs text-gray-400 uppercase">FR</p>
                  <p className="font-medium text-gray-900">{detalles.frecuenciaRespiratoria} rpm</p>
                </div>
              )}
              {detalles.condicionCorporal && (
                <div>
                  <p className="text-xs text-gray-400 uppercase">Condición corporal</p>
                  <p className="font-medium text-gray-900">{detalles.condicionCorporal}/9</p>
                </div>
              )}
              {detalles.mucosas && (
                <div className="col-span-3">
                  <p className="text-xs text-gray-400 uppercase">Mucosas</p>
                  <p className="font-medium text-gray-900">{detalles.mucosas}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Anamnesis */}
        {detalles.anamnesis && (
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <p className="text-xs font-semibold text-[#162D57] uppercase tracking-wide border-b border-[#B8DDE0] pb-2 mb-3">
              Anamnesis
            </p>
            <p className="text-sm text-gray-900 whitespace-pre-wrap">{detalles.anamnesis}</p>
          </div>
        )}

        {/* Examen físico */}
        {(detalles.sintomas || detalles.examenFisico) && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <p className="text-xs font-semibold text-[#162D57] uppercase tracking-wide border-b border-[#B8DDE0] pb-2">
              Examen físico
            </p>
            {detalles.sintomas && (
              <div>
                <p className="text-xs text-gray-400 uppercase mb-1">Síntomas / Hallazgos subjetivos</p>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{detalles.sintomas}</p>
              </div>
            )}
            {detalles.examenFisico && (
              <div>
                <p className="text-xs text-gray-400 uppercase mb-1">Hallazgos al examen físico</p>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{detalles.examenFisico}</p>
              </div>
            )}
          </div>
        )}

        {/* Diagnóstico y Plan */}
        {(detalles.diagnostico || detalles.tratamiento || detalles.plan || detalles.observaciones) && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <p className="text-xs font-semibold text-[#162D57] uppercase tracking-wide border-b border-[#B8DDE0] pb-2">
              Diagnóstico y Plan
            </p>
            {detalles.diagnostico && (
              <div>
                <p className="text-xs text-gray-400 uppercase mb-1">Diagnóstico</p>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{detalles.diagnostico}</p>
              </div>
            )}
            {detalles.tratamiento && (
              <div>
                <p className="text-xs text-gray-400 uppercase mb-1">Tratamiento</p>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{detalles.tratamiento}</p>
              </div>
            )}
            {detalles.plan && (
              <div>
                <p className="text-xs text-gray-400 uppercase mb-1">Plan de seguimiento</p>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{detalles.plan}</p>
              </div>
            )}
            {detalles.observaciones && (
              <div>
                <p className="text-xs text-gray-400 uppercase mb-1">Observaciones para el propietario</p>
                <p className="text-sm text-gray-900 whitespace-pre-wrap">{detalles.observaciones}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
};