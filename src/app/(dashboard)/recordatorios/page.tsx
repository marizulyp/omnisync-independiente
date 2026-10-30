import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { BtnEliminar } from "@/components/ui/BtnEliminar"
import { Icon } from "@/components/ui/Icon"
import { completarRecordatorio, eliminarRecordatorio } from "./actions"
import { auth } from "@/auth"

const DICCIONARIO: Record<string, any> = {
  veterinaria: {
    tituloControles: "Vacunas y controles próximos",
    vacioControles: "Sin vacunas ni controles pendientes en los próximos 7 días",
    iconControles: "vaccines"
  },
  taller: {
    tituloControles: "Mantenimientos o revisiones próximas",
    vacioControles: "Sin mantenimientos pendientes en los próximos 7 días",
    iconControles: "build"
  },
  barberia: {
    tituloControles: "Tratamientos y retoques próximos",
    vacioControles: "Sin tratamientos o retoques pendientes en los próximos 7 días",
    iconControles: "face_retouching_natural"
  },
}

function fmt(date: Date) {
  return date.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })
}

export default async function RecordatoriosPage() {
  const session = await auth()
  const email = session?.user?.email ?? ""
  
  // EXTRACCIÓN SEGURA DE LA INDUSTRIA Y EL NEGOCIO
  const usuarioDb = await prisma.usuario.findUnique({
    where: { email },
    select: { negocioId: true, negocio: { select: { tipoNegocio: true } } }
  })
  
  const negocioId = usuarioDb?.negocioId || null
  const tipoNegocio = usuarioDb?.negocio?.tipoNegocio || (session?.user as any)?.tipoNegocio || "veterinaria"
  const dicc = DICCIONARIO[tipoNegocio] || DICCIONARIO["veterinaria"]

  const ahora = new Date()
  const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
  const finHoy = new Date(inicioHoy.getTime() + 24 * 60 * 60 * 1000 - 1)
  const en7dias = new Date(inicioHoy.getTime() + 7 * 24 * 60 * 60 * 1000)

  // MURO DE CONTENCIÓN APLICADO: Todo filtrado estrictamente por negocioId
  const [citasHoy, controlesProximos, todosLosProductos, recordatorios] =
    await Promise.all([
      prisma.cita.findMany({
        where: { negocioId, fecha: { gte: inicioHoy, lte: finHoy }, estado: { notIn: ["cancelada", "atendida"] } },
        orderBy: { fecha: "asc" },
        include: { ficha: { include: { cliente: { select: { nombre: true } } } } },
      }),
      prisma.controlPreventivo.findMany({
        where: { ficha: { negocioId }, proximaFecha: { lte: en7dias, not: null } },
        orderBy: { proximaFecha: "asc" },
        include: { ficha: { include: { cliente: { select: { nombre: true } } } } },
      }),
      prisma.producto.findMany({ 
        where: { negocioId }, 
        orderBy: { nombre: "asc" } 
      }),
      prisma.recordatorio.findMany({
        where: { negocioId },
        orderBy: [{ completado: "asc" }, { fecha: "asc" }],
        include: { cliente: { select: { nombre: true } }, ficha: { select: { nombre: true } } },
      }),
    ])

  const productosStockBajo = todosLosProductos.filter(
    (p) => p.stockMinimo > 0 && p.stock <= p.stockMinimo
  )

  const totalAlertas = citasHoy.length + controlesProximos.length + productosStockBajo.length
  const recordatoriosPendientes = recordatorios.filter((r) => !r.completado).length

  return (
    <div>
      {/* Encabezado */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.015em] text-[#0F1720]">Recordatorios</h1>
          <p className="mt-[5px] font-mono text-[11.5px] tracking-[0.04em] text-[#64748B] uppercase">
            {totalAlertas} alerta{totalAlertas !== 1 ? "s" : ""} activa{totalAlertas !== 1 ? "s" : ""}
            {recordatoriosPendientes > 0 && (
              <span className="ml-2 text-[#B45309]">· {recordatoriosPendientes} recordatorio{recordatoriosPendientes !== 1 ? "s" : ""} pendiente{recordatoriosPendientes !== 1 ? "s" : ""}</span>
            )}
          </p>
        </div>
        <Link
          href="/recordatorios/nuevo"
          className="flex items-center gap-[7px] rounded-[7px] bg-[#1E3A6E] px-[15px] py-[9px] text-[13px] font-semibold text-white hover:bg-[#162D57] transition-colors"
        >
          <Icon name="add" size={17} className="text-white" />
          Nuevo recordatorio
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Citas de hoy */}
        <SeccionAlerta
          titulo={`Citas de hoy`}
          count={citasHoy.length}
          icon="calendar_month"
          vacio="No hay citas programadas para hoy"
        >
          {citasHoy.map((c) => (
            <FilaAlerta key={c.id}>
              <p className="text-[13.5px] font-medium text-[#0F1720]">
                {c.fecha.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: true })}{" "}
                · {c.ficha?.nombre}
              </p>
              <p className="text-[12px] text-[#64748B]">
                {c.ficha?.cliente?.nombre} {c.motivo ? `· ${c.motivo}` : ""}
              </p>
            </FilaAlerta>
          ))}
        </SeccionAlerta>

        {/* Stock bajo */}
        <SeccionAlerta
          titulo="Productos con stock bajo"
          count={productosStockBajo.length}
          icon="inventory_2"
          vacio="Todo el inventario está en niveles normales"
          amber={productosStockBajo.length > 0}
        >
          {productosStockBajo.map((p) => (
            <FilaAlerta key={p.id} href={`/inventario/${p.id}`}>
              <p className="text-[13.5px] font-medium text-[#0F1720]">{p.nombre}</p>
              <p className="font-mono text-[12px] text-[#B45309]">
                Stock: {p.stock} {p.unidad} · mínimo: {p.stockMinimo}
              </p>
            </FilaAlerta>
          ))}
        </SeccionAlerta>

        {/* Controles Dinámicos (Vacunas / Tratamientos / Mantenimientos) */}
        <SeccionAlerta
          titulo={dicc.tituloControles}
          count={controlesProximos.length}
          icon={dicc.iconControles}
          vacio={dicc.vacioControles}
          amber={controlesProximos.some((c) => c.proximaFecha! < inicioHoy)}
        >
          {controlesProximos.map((c) => {
            const vencida = c.proximaFecha! < inicioHoy
            return (
              <FilaAlerta key={c.id} href={`/fichas/${c.fichaId}`}>
                <p className="text-[13.5px] font-medium text-[#0F1720] capitalize">
                  {c.nombre} · {c.ficha?.nombre}
                </p>
                <p className={`font-mono text-[12px] ${vencida ? "text-[#DC2626]" : "text-[#B45309]"}`}>
                  {vencida ? "Vencido: " : "Próximo: "}
                  {fmt(c.proximaFecha!)} · {c.ficha?.cliente?.nombre}
                </p>
              </FilaAlerta>
            )
          })}
        </SeccionAlerta>
      </div>

      {/* Recordatorios manuales */}
      <div className="mt-5 rounded-xl border border-[#E2E8F0] bg-white">
        <div
          className="flex items-center justify-between px-[18px] py-[13px]"
          style={{ borderBottom: "1px solid #EEF2F6" }}
        >
          <div className="flex items-center gap-2">
            <Icon name="notifications" size={18} className="text-[#7C8CA0]" />
            <p className="text-[14px] font-semibold text-[#0F1720]">Recordatorios manuales</p>
          </div>
          <span className="rounded bg-[#F1F5F9] px-2 font-mono text-[12px] text-[#475569]">
            {recordatorios.length}
          </span>
        </div>
        {recordatorios.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-[#94A3B8]">
            <Icon name="notifications_none" size={36} className="mb-2 opacity-40" />
            <p className="text-[12.5px]">Sin recordatorios registrados</p>
          </div>
        ) : (
          <div>
            {recordatorios.map((r, i) => (
              <div
                key={r.id}
                className="flex items-start gap-3 px-[18px] py-3 hover:bg-[#F8FAFC] transition-colors"
                style={{ borderTop: i > 0 ? "1px solid #F1F5F9" : "none" }}
              >
                {/* Checkbox */}
                <form action={completarRecordatorio.bind(null, r.id, !r.completado)} className="mt-[2px]">
                  <button
                    type="submit"
                    title={r.completado ? "Marcar pendiente" : "Marcar completado"}
                    className={`flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${
                      r.completado
                        ? "border-[#059669] bg-[#059669] text-white"
                        : "border-[#CBD5E1] hover:border-[#1E3A6E]"
                    }`}
                  >
                    {r.completado && <Icon name="check" size={12} className="text-white" />}
                  </button>
                </form>

                {/* Contenido */}
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-[13.5px] font-medium ${
                      r.completado ? "text-[#94A3B8] line-through" : "text-[#0F1720]"
                    }`}
                  >
                    {r.mensaje}
                  </p>
                  <p className="font-mono text-[11.5px] text-[#94A3B8]">
                    {fmt(r.fecha)}
                    {r.cliente && ` · ${r.cliente.nombre}`}
                    {r.ficha && ` · ${r.ficha.nombre}`}
                  </p>
                </div>

                <BtnEliminar
                  action={eliminarRecordatorio.bind(null, r.id)}
                  mensaje="¿Eliminar este recordatorio?"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SeccionAlerta({
  titulo,
  count,
  icon,
  vacio,
  amber = false,
  children,
}: {
  titulo: string
  count: number
  icon: string
  vacio: string
  amber?: boolean
  children: React.ReactNode
}) {
  const tieneContenido = Array.isArray(children) ? children.length > 0 : !!children
  return (
    <div
      className={`rounded-xl border bg-white ${
        amber && tieneContenido ? "border-[#FDE68A]" : "border-[#E2E8F0]"
      }`}
    >
      <div
        className="flex items-center gap-2.5 px-[18px] py-[13px]"
        style={{ borderBottom: "1px solid #EEF2F6" }}
      >
        <Icon
          name={icon}
          size={17}
          className={amber && tieneContenido ? "text-[#B45309]" : "text-[#7C8CA0]"}
        />
        <p className="text-[13.5px] font-semibold text-[#0F1720]">{titulo}</p>
        <span className="ml-auto rounded bg-[#F1F5F9] px-2 font-mono text-[12px] text-[#475569]">
          {count}
        </span>
      </div>
      {!tieneContenido ? (
        <div className="py-6 text-center text-[12px] text-[#94A3B8]">{vacio}</div>
      ) : (
        <div>{children}</div>
      )}
    </div>
  )
}

function FilaAlerta({ children, href }: { children: React.ReactNode; href?: string }) {
  const inner = <div className="flex flex-col gap-[2px]">{children}</div>
  if (href) {
    return (
      <Link
        href={href}
        className="block border-t border-[#F1F5F9] px-[18px] py-2.5 hover:bg-[#F8FAFC] transition-colors first:border-0"
      >
        {inner}
      </Link>
    )
  }
  return (
    <div className="border-t border-[#F1F5F9] px-[18px] py-2.5 first:border-0">{inner}</div>
  )
}