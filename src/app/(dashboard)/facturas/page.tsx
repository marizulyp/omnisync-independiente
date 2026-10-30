import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { BtnEliminar } from "@/components/ui/BtnEliminar"
import { Icon } from "@/components/ui/Icon"
import { eliminarFactura } from "./actions"
import { requirePermisoPagina, rolActual } from "@/lib/permisos-server"
import { tienePermiso } from "@/lib/permisos"
import { auth } from "@/auth"

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n)
}

const NOMBRES_COLUMNA: Record<string, string> = {
  veterinaria: "Mascota",
  taller: "Vehículo",
  barberia: "Ficha",
}

export default async function FacturasPage() {
  const session = await auth()
  const email = session?.user?.email ?? ""
  
  // Extracción segura del Negocio ID
  const usuarioDb = await prisma.usuario.findUnique({
    where: { email },
    select: { negocioId: true, negocio: { select: { tipoNegocio: true } } }
  })
  
  const negocioId = usuarioDb?.negocioId || null
  const tipoNegocio = usuarioDb?.negocio?.tipoNegocio || (session?.user as any)?.tipoNegocio || "veterinaria"
  const nombreFicha = NOMBRES_COLUMNA[tipoNegocio] || "Registro"

  const rol = await rolActual()
  const puedeEditar = tienePermiso(rol, "facturas", "editar")
  const puedeEliminar = tienePermiso(rol, "facturas", "eliminar")
  await requirePermisoPagina("facturas", "ver")
  
  // EL MURO DE CONTENCIÓN: where { negocioId }
  const facturas = await prisma.factura.findMany({
    where: { negocioId }, // Aislamiento estricto
    orderBy: { numero: "desc" },
    include: {
      cliente: { select: { nombre: true } },
      ficha: { select: { nombre: true } },
    },
  })

  const totalMes = facturas
    .filter((f) => {
      const hoy = new Date()
      return f.fecha.getFullYear() === hoy.getFullYear() && f.fecha.getMonth() === hoy.getMonth()
    })
    .reduce((s, f) => s + f.total, 0)

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-[18px]">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.015em] text-[#0F1720]">Facturas de venta</h1>
          <p className="mt-[5px] font-mono text-[11.5px] tracking-[0.04em] text-[#64748B] uppercase">
            {facturas.length} {facturas.length === 1 ? "comprobante" : "comprobantes"}
            {totalMes > 0 && (
              <span className="ml-2">· {formatCOP(totalMes)} este mes</span>
            )}
          </p>
        </div>
        {puedeEditar && (
          <Link
            href="/facturas/nueva"
            className="flex items-center gap-[7px] rounded-[7px] bg-[#1E3A6E] px-[15px] py-[9px] text-[13px] font-semibold text-white hover:bg-[#162D57] transition-colors"
          >
            <Icon name="add" size={17} className="text-white" />
            Nueva factura
          </Link>
        )}
      </div>

      <div className="mb-5 flex items-start gap-2 rounded-[8px] border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-3">
        <Icon name="info" size={15} className="mt-[1px] shrink-0 text-[#94A3B8]" />
        <p className="text-[12px] text-[#64748B]">
          Comprobantes de venta para control administrativo interno. No son facturas electrónicas con validez tributaria ante la DIAN.
        </p>
      </div>

      {facturas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#94A3B8]">
          <Icon name="receipt_long" size={48} className="mb-3 opacity-40" />
          <p className="text-[12.5px]">No hay facturas registradas en este negocio</p>
          {puedeEditar && (
            <Link href="/facturas/nueva" className="mt-2 text-[13px] text-[#1E3A6E] hover:underline">
              Crear primera factura →
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div
                className="grid gap-3 border-b border-[#EEF2F6] bg-[#F8FAFC] px-[18px] py-[9px] font-mono text-[10.5px] tracking-[0.08em] text-[#7C8CA0] uppercase"
                style={{ gridTemplateColumns: "80px 110px minmax(0,1.4fr) minmax(0,1fr) 90px 110px 90px" }}
              >
                <span>N°</span>
                <span>Fecha</span>
                <span>Cliente</span>
                <span>{nombreFicha}</span>
                <span>Condición</span>
                <span className="text-right">Total</span>
                <span className="text-right">Acciones</span>
              </div>

              {facturas.map((f) => {
                const deleteAction = eliminarFactura.bind(null, f.id)
                return (
                  <div
                    key={f.id}
                    className="grid gap-3 items-center border-b border-[#F1F5F9] px-[18px] py-[11px] hover:bg-[#F8FAFC] transition-colors last:border-0"
                    style={{ gridTemplateColumns: "80px 110px minmax(0,1.4fr) minmax(0,1fr) 90px 110px 90px" }}
                  >
                    <span className="font-mono text-[13px] font-semibold text-[#1E3A6E]">
                      #{f.numero}
                    </span>
                    <span className="font-mono text-[12px] text-[#475569]">
                      {f.fecha.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "2-digit" })}
                    </span>
                    <span className="truncate text-[13px] text-[#334155]">
                      {f.cliente?.nombre ?? "—"}
                    </span>
                    <span className="truncate text-[13px] text-[#64748B]">
                      {f.ficha?.nombre ?? "—"}
                    </span>
                    <span className="text-[12.5px] text-[#64748B]">{f.condicion}</span>
                    <span className="text-right font-mono text-[13px] font-semibold text-[#0F1720]">
                      {formatCOP(f.total)}
                    </span>
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/facturas/${f.id}`}
                        title="Ver / Imprimir"
                        className="flex items-center justify-center rounded p-1 text-[#94A3B8] hover:text-[#1E3A6E] transition-colors"
                      >
                        <Icon name="print" size={18} />
                      </Link>
                      {puedeEliminar && (
                        <BtnEliminar action={deleteAction} mensaje={`¿Eliminar factura #${f.numero}?`} />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}