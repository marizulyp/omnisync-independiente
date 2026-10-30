import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { BtnImprimir } from "@/components/ui/BtnImprimir"
import Link from "next/link"
import type { Metadata } from "next"
import { CLINICA } from "@/config/clinica"

function normalizar(str: string) {
  return str.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]/g, "_")
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; consultaId: string }>
}): Promise<Metadata> {
  const { consultaId } = await params
  const c = await prisma.consulta.findUnique({
    where: { id: consultaId },
    select: {
      fecha: true,
      motivo: true,
      mascota: { select: { nombre: true, cliente: { select: { nombre: true } } } },
    },
  })
  if (!c) return {}
  const d = c.fecha
  const dd = String(d.getDate()).padStart(2, "0")
  const mm = String(d.getMonth() + 1).padStart(2, "0")
  const yyyy = d.getFullYear()
  const mascota = normalizar(c.mascota.nombre)
  const apellido = normalizar(c.mascota.cliente.nombre.split(" ").slice(-1)[0])
  return { title: `HC_${mascota}_${apellido}_${dd}${mm}${yyyy}` }
}

const ESPECIE_LABEL: Record<string, string> = {
  perro: "Perro", gato: "Gato", ave: "Ave", conejo: "Conejo", reptil: "Reptil", otro: "Otro",
}

function calcularEdad(fecha: Date | null): string {
  if (!fecha) return "—"
  const hoy = new Date()
  const años = hoy.getFullYear() - fecha.getFullYear()
  if (años === 0) {
    const m = Math.abs(hoy.getMonth() - fecha.getMonth())
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
  const { id: mascotaId, consultaId } = await params
  const consulta = await prisma.consulta.findUnique({
    where: { id: consultaId },
    include: {
      mascota: {
        include: { cliente: true },
      },
      veterinario: { select: { nombre: true } },
    },
  })
  if (!consulta || consulta.mascotaId !== mascotaId) notFound()

  const m = consulta.mascota
  const tieneSignos = consulta.peso || consulta.temperatura || consulta.frecuenciaCardiaca ||
    consulta.frecuenciaRespiratoria || consulta.condicionCorporal || consulta.mucosas

  return (
    <>
      {/* Barra superior — solo en pantalla */}
      <div className="print:hidden flex items-center gap-4 p-4 border-b border-gray-200 bg-white">
        <Link
          href={`/mascotas/${mascotaId}/consultas/${consultaId}`}
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
              {consulta.fecha.toLocaleDateString("es-CO", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
            {consulta.veterinario && (
              <p className="text-xs text-gray-500">Dr(a). {consulta.veterinario.nombre}</p>
            )}
          </div>
        </div>

        {/* Datos del paciente */}
        <div className="mb-4 p-3 bg-gray-50 rounded border border-gray-200">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Datos del paciente</p>
          <div className="grid grid-cols-3 gap-x-4 gap-y-1 text-xs">
            <div><span className="text-gray-500">Paciente:</span> <span className="font-semibold">{m.nombre}</span></div>
            <div><span className="text-gray-500">Especie:</span> <span className="font-medium">{ESPECIE_LABEL[m.especie] ?? m.especie}</span></div>
            <div><span className="text-gray-500">Raza:</span> <span className="font-medium">{m.raza ?? "—"}</span></div>
            <div><span className="text-gray-500">Edad:</span> <span className="font-medium">{calcularEdad(m.fechaNacimiento)}</span></div>
            <div><span className="text-gray-500">Propietario:</span> <span className="font-medium">{m.cliente.nombre}</span></div>
            <div><span className="text-gray-500">Teléfono:</span> <span className="font-medium">{m.cliente.telefono ?? "—"}</span></div>
          </div>
        </div>

        {/* Motivo */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide border-b border-blue-100 pb-1 mb-2">
            Motivo de consulta
          </p>
          <p className="font-medium">{consulta.motivo}</p>
        </div>

        {/* Signos vitales */}
        {tieneSignos && (
          <div className="mb-4" style={{ breakInside: "avoid" }}>
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide border-b border-blue-100 pb-1 mb-2">
              Signos vitales
            </p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              {consulta.peso && <div><span className="text-gray-500">Peso:</span> <strong>{consulta.peso} kg</strong></div>}
              {consulta.temperatura && <div><span className="text-gray-500">T°:</span> <strong>{consulta.temperatura} °C</strong></div>}
              {consulta.frecuenciaCardiaca && <div><span className="text-gray-500">FC:</span> <strong>{consulta.frecuenciaCardiaca} lpm</strong></div>}
              {consulta.frecuenciaRespiratoria && <div><span className="text-gray-500">FR:</span> <strong>{consulta.frecuenciaRespiratoria} rpm</strong></div>}
              {consulta.condicionCorporal && <div><span className="text-gray-500">CC:</span> <strong>{consulta.condicionCorporal}/9</strong></div>}
              {consulta.mucosas && <div className="col-span-3"><span className="text-gray-500">Mucosas:</span> <strong>{consulta.mucosas}</strong></div>}
            </div>
          </div>
        )}

        {/* Anamnesis */}
        {consulta.anamnesis && (
          <div className="mb-4" style={{ breakInside: "avoid" }}>
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide border-b border-blue-100 pb-1 mb-2">
              Anamnesis
            </p>
            <p className="whitespace-pre-wrap">{consulta.anamnesis}</p>
          </div>
        )}

        {/* Síntomas */}
        {consulta.sintomas && (
          <div className="mb-4" style={{ breakInside: "avoid" }}>
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide border-b border-blue-100 pb-1 mb-2">
              Síntomas
            </p>
            <p className="whitespace-pre-wrap">{consulta.sintomas}</p>
          </div>
        )}

        {/* Examen físico */}
        {consulta.examenFisico && (
          <div className="mb-4" style={{ breakInside: "avoid" }}>
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide border-b border-blue-100 pb-1 mb-2">
              Examen físico
            </p>
            <p className="whitespace-pre-wrap">{consulta.examenFisico}</p>
          </div>
        )}

        {/* Diagnóstico */}
        {consulta.diagnostico && (
          <div className="mb-4" style={{ breakInside: "avoid" }}>
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide border-b border-blue-100 pb-1 mb-2">
              Diagnóstico
            </p>
            <p className="whitespace-pre-wrap">{consulta.diagnostico}</p>
          </div>
        )}

        {/* Tratamiento */}
        {consulta.tratamiento && (
          <div className="mb-4" style={{ breakInside: "avoid" }}>
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide border-b border-blue-100 pb-1 mb-2">
              Tratamiento
            </p>
            <p className="whitespace-pre-wrap">{consulta.tratamiento}</p>
          </div>
        )}

        {/* Plan */}
        {consulta.plan && (
          <div className="mb-4" style={{ breakInside: "avoid" }}>
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide border-b border-blue-100 pb-1 mb-2">
              Plan de seguimiento
            </p>
            <p className="whitespace-pre-wrap">{consulta.plan}</p>
          </div>
        )}

        {/* Observaciones */}
        {consulta.observaciones && (
          <div className="mb-4" style={{ breakInside: "avoid" }}>
            <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide border-b border-blue-100 pb-1 mb-2">
              Observaciones para el propietario
            </p>
            <p className="whitespace-pre-wrap">{consulta.observaciones}</p>
          </div>
        )}

        {/* Firma */}
        <div className="mt-10 pt-6 border-t border-gray-300" style={{ breakInside: "avoid" }}>
          <div className="flex justify-end">
            <div className="text-center w-52">
              <div className="border-t-2 border-gray-700 pt-2 mt-10">
                {consulta.veterinario ? (
                  <>
                    <p className="font-semibold text-sm">{consulta.veterinario.nombre}</p>
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
}
