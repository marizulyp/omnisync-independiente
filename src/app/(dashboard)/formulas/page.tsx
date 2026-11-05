import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { BtnEliminar } from "@/components/ui/BtnEliminar"
import { Icon } from "@/components/ui/Icon"
import { eliminarFormula } from "./actions"
import { rolActual } from "@/lib/permisos-server"
import { tienePermiso } from "@/lib/permisos"

export default async function FormulasPage() {
  const rol = await rolActual()
  const puedeEditar = tienePermiso(rol, "recomendaciones", "editar")
  const puedeEliminar = tienePermiso(rol, "recomendaciones", "eliminar")
  
  const recomendaciones = await prisma.recomendacion.findMany({
    orderBy: { creadoEn: "desc" },
    include: {
      ficha: { include: { cliente: { select: { nombre: true } } } },
      especialista: { select: { nombre: true } },
      items: { orderBy: { orden: "asc" }, take: 1 },
    },
  })

  return (
    <div>
      {/* Encabezado */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-[18px]">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.015em] text-[#0F1720]">Fórmulas y Recomendaciones</h1>
          <p className="mt-[5px] font-mono text-[11.5px] tracking-[0.04em] text-[#64748B] uppercase">
            {recomendaciones.length} {recomendaciones.length === 1 ? "receta" : "recetas"} registrada{recomendaciones.length !== 1 ? "s" : ""}
          </p>
        </div>
        {puedeEditar && (
          <Link
            href="/formulas/nueva"
            className="flex items-center gap-[7px] rounded-[7px] bg-[#1E3A6E] px-[15px] py-[9px] text-[13px] font-semibold text-white hover:bg-[#162D57] transition-colors"
          >
            <Icon name="add" size={17} className="text-white" />
            Nueva fórmula
          </Link>
        )}
      </div>

      {recomendaciones.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#94A3B8]">
          <Icon name="prescriptions" size={48} className="mb-3 opacity-40" />
          <p className="text-[12.5px]">No hay fórmulas registradas</p>
          {puedeEditar && (
            <Link
              href="/formulas/nueva"
              className="mt-2 text-[13px] text-[#1E3A6E] hover:underline"
            >
              Crear primera fórmula →
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Encabezado tabla */}
              <div
                className="grid gap-3 border-b border-[#EEF2F6] bg-[#F8FAFC] px-[18px] py-[9px] font-mono text-[10.5px] tracking-[0.08em] text-[#7C8CA0] uppercase"
                style={{ gridTemplateColumns: "110px minmax(0,1fr) minmax(0,1fr) minmax(0,1.3fr) minmax(0,1fr) 90px" }}
              >
                <span>Fecha</span>
                <span>Paciente</span>
                <span>Propietario</span>
                <span>Primera recomendación</span>
                <span>Profesional</span>
                <span className="text-right">Acciones</span>
              </div>

              {/* Filas */}
              {recomendaciones.map((r) => {
                const deleteAction = eliminarFormula.bind(null, r.id)
                return (
                  <div
                    key={r.id}
                    className="grid gap-3 items-center border-b border-[#F1F5F9] px-[18px] py-[11px] hover:bg-[#F8FAFC] transition-colors last:border-0"
                    style={{ gridTemplateColumns: "110px minmax(0,1fr) minmax(0,1fr) minmax(0,1.3fr) minmax(0,1fr) 90px" }}
                  >
                    <span className="font-mono text-[12px] text-[#475569]">
                      {r.fecha.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "2-digit" })}
                    </span>
                    <span className="truncate text-[13.5px] font-semibold text-[#0F1720]">
                      {r.ficha?.nombre ?? "—"}
                    </span>
                    <span className="truncate text-[13px] text-[#475569]">
                      {r.ficha?.cliente?.nombre ?? "—"}
                    </span>
                    <span className="truncate text-[12.5px] text-[#64748B]">
                      {r.items[0]?.item ?? "—"}
                    </span>
                    <span className="truncate text-[12.5px] text-[#64748B]">
                      {r.especialista?.nombre ?? "—"}
                    </span>
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/formulas/${r.id}`}
                        title="Ver / Imprimir"
                        className="flex items-center justify-center rounded p-1 text-[#94A3B8] hover:text-[#1E3A6E] transition-colors"
                      >
                        <Icon name="print" size={18} />
                      </Link>
                      {puedeEliminar && (
                        <BtnEliminar
                          action={deleteAction}
                          mensaje="¿Eliminar esta fórmula médica?"
                        />
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
};