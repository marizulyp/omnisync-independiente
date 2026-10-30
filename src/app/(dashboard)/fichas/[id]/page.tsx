import Link from "next/link"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { puedeEliminarAdjunto, tienePermiso } from "@/lib/permisos"
import { BtnEliminar } from "@/components/ui/BtnEliminar"
import { AdjuntosSection } from "@/components/ui/AdjuntosSection"
import { eliminarMascota } from "../actions"
import { eliminarCita } from "../../agenda/actions"
import { fechaLocalISO } from "@/lib/fechas"

const DICCIONARIO: Record<string, any> = {
  veterinaria: { icono: "🐾", tituloAtenciones: "Consultas", tituloControles: "Controles Preventivos", btnAtencion: "+ Nueva consulta", btnControl: "+ Registrar control" },
  taller: { icono: "🚗", tituloAtenciones: "Órdenes de Trabajo", tituloControles: "Mantenimientos", btnAtencion: "+ Nueva orden", btnControl: "+ Registrar mantenimiento" },
  barberia: { icono: "✂️", tituloAtenciones: "Historial de Servicios", tituloControles: "Tratamientos", btnAtencion: "+ Nuevo servicio", btnControl: "+ Registrar tratamiento" },
}

function calcularEdad(fechaStr: string | null): string {
  if (!fechaStr) return "Desconocida"
  const fecha = new Date(fechaStr)
  const hoy = new Date()
  const años = hoy.getFullYear() - fecha.getFullYear()
  const meses = hoy.getMonth() - fecha.getMonth()
  if (años === 0) {
    const m = meses < 0 ? 12 + meses : meses
    return `${m} ${m === 1 ? "mes" : "meses"}`
  }
  if (años === 1 && meses < 0) return `${12 + meses} meses`
  return `${años} ${años === 1 ? "año" : "años"}`
}

function fmt(date: Date) {
  return date.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })
}

export default async function FichaDetallePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()
  const rol = session?.user.rol
  const tipoNegocio = (session?.user as any)?.tipoNegocio || "veterinaria"
  const dicc = DICCIONARIO[tipoNegocio] || DICCIONARIO["veterinaria"]

  const puedeEditar = tienePermiso(rol, "fichas", "editar")
  const puedeEliminar = tienePermiso(rol, "fichas", "eliminar")
  const puedeEditarConsultas = tienePermiso(rol, "atenciones", "editar")
  const puedeEditarControles = tienePermiso(rol, "controles", "editar")

  const ficha = await prisma.ficha.findUnique({
    where: { id },
    include: {
      cliente: true,
      atenciones: { orderBy: { fecha: "desc" }, include: { especialista: { select: { nombre: true } } } },
      controles: { orderBy: { fecha: "desc" }, include: { especialista: { select: { nombre: true } } } },
      citas: {
        where: { fecha: { gte: new Date() }, estado: { notIn: ["cancelada", "atendida"] } },
        orderBy: { fecha: "asc" },
        include: { especialista: { select: { nombre: true } } },
      },
      adjuntos: { orderBy: { creadoEn: "desc" } },
    },
  })
  
  if (!ficha) notFound()

  const datos = (ficha.datosGenerales as any) || {}
  const deleteAction = eliminarMascota.bind(null, id, ficha.clienteId)

  // Cargar especificaciones dinámicas según el negocio
  const especificaciones = []
  if (tipoNegocio === "taller") {
    especificaciones.push({ label: "Marca", value: datos.marca })
    especificaciones.push({ label: "Color", value: datos.color })
  } else if (tipoNegocio === "veterinaria") {
    especificaciones.push({ label: "Raza", value: datos.raza })
    especificaciones.push({ label: "Peso", value: datos.peso ? `${datos.peso} kg` : null })
    especificaciones.push({ label: "Fecha Nacimiento", value: datos.fechaNacimiento })
    especificaciones.push({ label: "Edad", value: calcularEdad(datos.fechaNacimiento) })
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <Link href={`/clientes/${ficha.clienteId}`} className="text-sm text-gray-500 hover:text-gray-700">
        ← Volver al cliente
      </Link>

      {/* Encabezado */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{dicc.icono}</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{ficha.nombre}</h1>
            <p className="text-sm text-gray-500 capitalize">{ficha.tipo}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {puedeEditar && (
            <Link
              href={`/fichas/${id}/editar`}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Editar
            </Link>
          )}
          {puedeEliminar && (
            <BtnEliminar action={deleteAction} mensaje={`¿Eliminar registro de ${ficha.nombre}?`} />
          )}
        </div>
      </div>

      {/* Datos básicos dinámicos */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="grid grid-cols-2 gap-y-4 gap-x-6">
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Dueño / Cliente</p>
            <Link href={`/clientes/${ficha.clienteId}`} className="text-sm text-[#1E3A6E] hover:text-[#162D57] mt-0.5 block">
              {ficha.cliente.nombre}
            </Link>
          </div>
          {especificaciones.map((esp, i) => (
            <div key={i}>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{esp.label}</p>
              <p className="text-sm text-gray-900 mt-0.5">{esp.value || "—"}</p>
            </div>
          ))}
        </div>
        {ficha.notas && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Notas</p>
            <p className="text-sm text-gray-700 mt-0.5 whitespace-pre-wrap">{ficha.notas}</p>
          </div>
        )}
      </div>

      {/* Próximas citas */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">Próximas citas ({ficha.citas.length})</h2>
          <Link
            href={`/agenda/nueva?fichaId=${id}`}
            className="bg-[#1E3A6E] text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-[#162D57] transition-colors"
          >
            + Agendar cita
          </Link>
        </div>
        {ficha.citas.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">Sin citas próximas</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {ficha.citas.map((cita) => (
              <div key={cita.id} className="px-5 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {cita.fecha.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                      {" · "}
                      {cita.fecha.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    <p className="text-sm text-gray-700">{cita.motivo}</p>
                    {cita.especialista && (
                      <p className="text-xs text-gray-400 mt-0.5">👤 {cita.especialista.nombre}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Link href={`/agenda/${cita.id}/editar`} className="text-sm text-gray-500 hover:text-gray-700">Editar</Link>
                    <BtnEliminar action={eliminarCita.bind(null, cita.id, fechaLocalISO(cita.fecha))} mensaje="¿Eliminar esta cita?" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Atenciones (Historia Clínica / Órdenes) */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{dicc.tituloAtenciones} ({ficha.atenciones.length})</h2>
          {puedeEditarConsultas && (
            <Link href={`/atenciones/nueva?fichaId=${id}`} className="bg-[#1E3A6E] text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-[#162D57] transition-colors">
              {dicc.btnAtencion}
            </Link>
          )}
        </div>
        {ficha.atenciones.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">Sin registros previos</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {ficha.atenciones.map((a) => (
              <div key={a.id} className="px-5 py-4 flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs text-gray-400">{fmt(a.fecha)}</span>
                    {a.especialista && <span className="text-xs text-gray-400">· {a.especialista.nombre}</span>}
                  </div>
                  <p className="text-sm font-medium text-gray-900">{a.motivo}</p>
                </div>
                <Link href={`/atenciones/${a.id}`} className="text-sm text-[#1E3A6E] hover:text-[#162D57]">Ver</Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Controles Preventivos (Vacunas / Mantenimientos) */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{dicc.tituloControles} ({ficha.controles.length})</h2>
          {puedeEditarControles && (
            <Link href={`/controles/nuevo?fichaId=${id}`} className="bg-[#1E3A6E] text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-[#162D57] transition-colors">
              {dicc.btnControl}
            </Link>
          )}
        </div>
        {ficha.controles.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">Sin controles registrados</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {ficha.controles.map((c) => (
              <div key={c.id} className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs capitalize bg-green-50 text-green-700 px-2 py-0.5 rounded font-medium">{c.tipo}</span>
                    <p className="text-sm font-medium text-gray-900">{c.nombre}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-400">Fecha: {fmt(c.fecha)}</span>
                    {c.proximaFecha && <span className="text-xs text-amber-600">Próxima: {fmt(c.proximaFecha)}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Documentos adjuntos */}
      <AdjuntosSection
        mascotaId={id}
        adjuntos={ficha.adjuntos}
        puedeEliminar={puedeEliminarAdjunto(rol)}
      />
    </div>
  )
}