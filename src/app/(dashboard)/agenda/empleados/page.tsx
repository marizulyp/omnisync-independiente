import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { Icon } from "@/components/ui/Icon"

const DIAS = [
  { key: "lunes",      label: "Lun" },
  { key: "martes",     label: "Mar" },
  { key: "miércoles",  label: "Mié" },
  { key: "jueves",     label: "Jue" },
  { key: "viernes",    label: "Vie" },
  { key: "sábado",     label: "Sáb" },
  { key: "domingo",    label: "Dom" },
]

export default async function HorarioEmpleadosPage() {
  const empleados = await prisma.empleado.findMany({
    orderBy: { usuario: { nombre: "asc" } },
    include: { usuario: { select: { id: true, nombre: true, rol: true } } },
  })

  return (
    <div>
      {/* Encabezado */}
      <div className="flex items-center justify-between mb-[18px]">
        <div>
          <Link
            href="/agenda"
            className="mb-1 flex items-center gap-1 text-[13px] text-[#94A3B8] hover:text-[#475569] transition-colors"
          >
            <Icon name="chevron_left" size={15} />
            Volver a la agenda
          </Link>
          <h1 className="text-[22px] font-semibold tracking-[-0.015em] text-[#0F1720]">
            Horario del personal
          </h1>
        </div>
        <Link
          href="/admin/usuarios"
          className="flex items-center gap-[7px] rounded-[7px] bg-[#1E3A6E] px-[15px] py-[9px] text-[13px] font-semibold text-white hover:bg-[#162D57] transition-colors"
        >
          <Icon name="manage_accounts" size={17} className="text-white" />
          Gestionar personal
        </Link>
      </div>

      {empleados.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[#E2E8F0] bg-white py-20 text-[#94A3B8]">
          <Icon name="badge" size={48} className="mb-3 opacity-30" />
          <p className="text-[14px] font-medium text-[#64748B]">No hay empleados registrados</p>
          <p className="mt-1 text-[12.5px]">
            Ve a{" "}
            <Link href="/admin/usuarios" className="text-[#1E3A6E] hover:underline">
              Administración → Equipo y usuarios
            </Link>{" "}
            para configurar el personal
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-[#E2E8F0] bg-white overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid #E2E8F0", background: "#F8FAFC" }}>
                <th className="text-left px-5 py-3 text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide">
                  Empleado
                </th>
                <th className="text-left px-4 py-3 text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide">
                  Horario
                </th>
                {DIAS.map((d) => (
                  <th key={d.key} className="text-center px-2 py-3 text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide">
                    {d.label}
                  </th>
                ))}
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {empleados.map((e, i) => (
                <tr
                  key={e.id}
                  style={{ borderBottom: i < empleados.length - 1 ? "1px solid #F1F5F9" : undefined }}
                >
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-[#0F1720] text-[13.5px]">{e.usuario.nombre}</p>
                    <p className="text-[11.5px] text-[#94A3B8] capitalize">{e.cargo ?? e.usuario.rol}</p>
                  </td>
                  <td className="px-4 py-3.5 text-[13px] text-[#475569] font-mono">
                    {e.horaEntrada && e.horaSalida
                      ? `${e.horaEntrada} – ${e.horaSalida}`
                      : <span className="text-[#CBD5E1]">Sin horario</span>}
                  </td>
                  {DIAS.map((d) => (
                    <td key={d.key} className="text-center px-2 py-3.5">
                      {e.diasLaborales.includes(d.key) ? (
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: "#22C55E" }}
                          title="Labora"
                        />
                      ) : (
                        <span
                          className="inline-block w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: "#E2E8F0" }}
                          title="No labora"
                        />
                      )}
                    </td>
                  ))}
                  <td className="px-4 py-3.5 text-right">
                    <Link
                      href={`/admin/empleados/${e.usuario.id}/editar`}
                      className="inline-flex items-center gap-1.5 rounded-[7px] border border-[#E2E8F0] bg-white px-3 py-1.5 text-[12px] font-medium text-[#475569] hover:bg-[#F8FAFC] transition-colors"
                    >
                      <Icon name="edit" size={14} className="text-[#94A3B8]" />
                      Editar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Nota informativa */}
      <p className="mt-4 text-[12px] text-[#94A3B8]">
        Solo aparecen usuarios con perfil de empleado configurado. Para agregar personal ve a{" "}
        <Link href="/admin/usuarios" className="text-[#1E3A6E] hover:underline">
          Equipo y usuarios
        </Link>.
      </p>
    </div>
  )
}
