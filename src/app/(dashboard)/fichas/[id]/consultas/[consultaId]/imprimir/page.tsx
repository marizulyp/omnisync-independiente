import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { BtnImprimir } from "@/components/ui/BtnImprimir"
import Link from "next/link"
import type { Metadata } from "next"
import { CLINICA } from "@/config/clinica"

function normalizar(str: string) {
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "_")
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; consultaId: string }>
}): Promise<Metadata> {
  const { consultaId } = await params
  const c = await prisma.atencion.findUnique({
    where: { id: consultaId },
    select: {
      fecha: true,
      motivo: true,
      ficha: { select: { nombre: true, cliente: { select: { nombre: true } } } },
    },
  })
  if (!c) return {}
  const d = c.fecha
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const yyyy = d.getFullYear()
  const nombreFicha = normalizar(c.ficha.nombre)
  const apellido = normalizar(c.ficha.cliente.nombre.split(" ").slice(-1)[0])
  return { title: `HC_${nombreFicha}_${apellido}_${dd}${mm}${yyyy}` }
}

function calcularEdad(fecha: string | null | undefined): string {
  if (!fecha) return "—"
  const d = new Date(fecha)
  if (isNaN(d.getTime())) return "—"
  const hoy = new Date()
  const años = hoy.getFullYear() - d.getFullYear()
  if (años === 0) {
    const m = Math.abs(hoy.getMonth() - d.getMonth())
    return `${m} ${m === 1 ? "mes" : "meses"}`
  }
  return `${años} ${años === 1 ? "año" : "años"}`
}

function fmt(d: Date) {
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })
}

export default async function ImprimirConsultaPage({
  params,
}: {
  params: Promise<{ id: string; consultaId: string }>
}) {
  const { id: fichaId, consultaId } = await params
  
  // Usamos la tabla correcta "atencion" e incluimos a su "ficha" y "especialista"
  const atencion = await prisma.atencion.findUnique({
    where: { id: consultaId },
    include: {
      ficha: {
        include: { cliente: true },
      },
      especialista: { select: { nombre: true } },
    },
  })
  
  if (!atencion || atencion.fichaId !== fichaId) notFound()

  const m = atencion.ficha
  
  // Extraemos la información del JSON dinámico de forma segura para TypeScript
  const detalles = (atencion.detalles as any) || {}
  const datosFicha = (m.datosGenerales as any) || {}

  const tieneSignos = detalles.peso || detalles.temperatura || detalles.frecuenciaCardiaca ||
    detalles.frecuenciaRespiratoria || detalles.condicionCorporal || detalles.mucosas

  return (
    <>
      {/* Barra superior — solo en pantalla */}
      <div className="print:hidden flex items-center gap-4 p-4 border-b border-gray-200 bg-white">
        <Link
          href={`/fichas/${fichaId}/consultas/${consultaId}`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Volver
        </Link>
        <BtnImprimir />
      </div>

      <style>{`
        @page {
          margin: 0 0 10mm 0;
          @top-left    { content: ""; }
          @top-center  { content: ""; }
          @top-right   { content: ""; }
          @bottom-left { content: ""; }
          @bottom-center { content: ""; }
          @bottom-right {
            content: counter(page) " / " counter(pages);
            font-size: 8pt;
            font-family: system-ui, sans-serif;
            color: #94A3B8;
          }
        }
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          ::-webkit-scrollbar { display: none !important; width: 0 !important; }
          html, body { background: #fff !important; min-height: 0 !important; }
        }
      `}</style>

      {/* Página imprimible */}
      <div className="p-8 max-w-3xl mx-auto print:p-8 print:max-w-none font-sans text-gray-900 text-sm">

        {/* Encabezado con logo */}
        <div className="flex items-center justify-between mb-5 pb-4 border-b-2 border-blue-700">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={CLINICA.logo} alt={CLINICA.nombre} style={{ width: 64, height: 64, objectFit: "contain" }} />
            <div>
              <h1 className="text-xl font-bold text-blue-800 leading-tight">{CLINICA.nombre.toUpperCase()}</h1>
              <p className="text-xs text-gray-500">{CLINICA.nit} · Registro clínico oficial</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Historia Clínica</p>
            <p className="text-lg font-bold text-blue-700">
              {atencion.fecha.toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
            {atencion.especialista && (
              <p className="text-xs text-gray-500">Dr(a). {atencion.especialista.nombre}</p>
            )}
          </div>
        </div>

        {/* Datos del paciente */}
        <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Datos del paciente</p>
          <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs">
            <div><span className="text-gray-500">Paciente:</span> <span className="font-semibold">{m.nombre}</span></div>
            <div><span className="text-gray-500">Especie/Tipo:</span> <span className="font-medium">{datosFicha.especie || m.tipo}</span></div>
            <div><span className="text-gray-500">Raza:</span> <span className="font-medium">{datosFicha.raza ?? "—"}</span></div>
            <div><span className="text-gray-500">Edad:</span> <span className="font-medium">{calcularEdad(datosFicha.fechaNacimiento)}</span></div>
            <div><span className="text-gray-500">Propietario:</span> <span className="font-medium">{m.cliente.nombre}</span></div>
            <div><span className="text-gray-500">Teléfono:</span> <span className="font-medium">{m.cliente.telefono ?? "—"}</span></div>
          </div>
        </div>

        {/* Motivo */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide border-b border-blue-100 pb-1 mb-2">
            Motivo de consulta
          </p>
          <p className="font-medium">{atencion.motivo}</p>
        </div>

        {/* Signos vitales */}
        {tieneSignos && (
          <div className="mb-4" style={{ breakInside: "avoid" }}>
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide border-b border-blue-100 pb-1 mb-2">
              Signos vitales
            </p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {detalles.peso && <div><span className="text-gray-500">Peso:</span> <strong>{detalles.peso} kg</strong></div>}
              {detalles.temperatura && <div><span className="text-gray-500">T°:</span> <strong>{detalles.temperatura} °C</strong></div>}
              {detalles.frecuenciaCardiaca && <div><span className="text-gray-500">FC:</span> <strong>{detalles.frecuenciaCardiaca} lpm</strong></div>}
              {detalles.frecuenciaRespiratoria && <div><span className="text-gray-500">FR:</span> <strong>{detalles.frecuenciaRespiratoria} rpm</strong></div>}
              {detalles.condicionCorporal && <div><span className="text-gray-500">CC:</span> <strong>{detalles.condicionCorporal}/9</strong></div>}
              {detalles.mucosas && <div className="col-span-3"><span className="text-gray-500">Mucosas:</span> <strong>{detalles.mucosas}</strong></div>}
            </div>
          </div>
        )}

        {/* Anamnesis */}
        {detalles.anamnesis && (
          <div className="mb-4" style={{ breakInside: "avoid" }}>
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide border-b border-blue-100 pb-1 mb-2">
              Anamnesis
            </p>
            <p className="whitespace-pre-wrap">{detalles.anamnesis}</p>
          </div>
        )}

        {/* Síntomas */}
        {detalles.sintomas && (
          <div className="mb-4" style={{ breakInside: "avoid" }}>
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide border-b border-blue-100 pb-1 mb-2">
              Síntomas
            </p>
            <p className="whitespace-pre-wrap">{detalles.sintomas}</p>
          </div>
        )}

        {/* Examen físico */}
        {detalles.examenFisico && (
          <div className="mb-4" style={{ breakInside: "avoid" }}>
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide border-b border-blue-100 pb-1 mb-2">
              Examen físico
            </p>
            <p className="whitespace-pre-wrap">{detalles.examenFisico}</p>
          </div>
        )}

        {/* Diagnóstico */}
        {detalles.diagnostico && (
          <div className="mb-4" style={{ breakInside: "avoid" }}>
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide border-b border-blue-100 pb-1 mb-2">
              Diagnóstico
            </p>
            <p className="whitespace-pre-wrap">{detalles.diagnostico}</p>
          </div>
        )}

        {/* Tratamiento */}
        {detalles.tratamiento && (
          <div className="mb-4" style={{ breakInside: "avoid" }}>
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide border-b border-blue-100 pb-1 mb-2">
              Tratamiento
            </p>
            <p className="whitespace-pre-wrap">{detalles.tratamiento}</p>
          </div>
        )}

        {/* Plan */}
        {detalles.plan && (
          <div className="mb-4" style={{ breakInside: "avoid" }}>
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide border-b border-blue-100 pb-1 mb-2">
              Plan de seguimiento
            </p>
            <p className="whitespace-pre-wrap">{detalles.plan}</p>
          </div>
        )}

        {/* Observaciones */}
        {detalles.observaciones && (
          <div className="mb-4" style={{ breakInside: "avoid" }}>
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide border-b border-blue-100 pb-1 mb-2">
              Observaciones para el propietario
            </p>
            <p className="whitespace-pre-wrap">{detalles.observaciones}</p>
          </div>
        )}

        {/* Firma */}
        <div className="mt-10 pt-6 border-t border-gray-300" style={{ breakInside: "avoid" }}>
          <div className="flex justify-end">
            <div className="text-center w-52">
              <div className="border-t-2 border-gray-700 pt-2 mt-10">
                {atencion.especialista ? (
                  <>
                    <p className="font-semibold text-sm">{atencion.especialista.nombre}</p>
                    <p className="text-xs text-gray-500">Médico Veterinario</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold text-sm">Médico Veterinario</p>
                    <p className="text-xs text-gray-500">{CLINICA.nombre}</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Pie de página */}
        <div
          className="mt-6 pt-3 border-t border-blue-200 text-xs text-white text-center"
          style={{ backgroundColor: "#1e3a8a", padding: "8px 12px", marginTop: "24px" }}
        >
          {CLINICA.nombre} · {CLINICA.nit} · Documento confidencial · {fmt(new Date())}
        </div>
      </div>
    </>
  )
};