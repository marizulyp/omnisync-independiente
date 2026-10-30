import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

const DIAS = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo"]

export default async function EmpleadosPage() {
  const session = await auth()
  if (session?.user.rol !== "admin") redirect("/")

  const usuarios = await prisma.usuario.findMany({
    orderBy: { nombre: "asc" },
    include: { empleado: true },
  })

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Empleados</h1>
        <p className="text-sm text-gray-500 mt-0.5">Perfiles laborales del personal</p>
      </div>

      <div className="space-y-3">
        {usuarios.map((u) => (
          <div
            key={u.id}
            className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4"
          >
            <div className="w-10 h-10 rounded-full bg-[#E8EEFB] flex items-center justify-center text-[#162D57] font-semibold text-sm shrink-0">
              {u.nombre.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900">{u.nombre}</p>
              <p className="text-sm text-gray-500">{u.email}</p>
              {u.empleado ? (
                <p className="text-xs text-gray-400 mt-0.5">
                  {u.empleado.cargo ?? "Sin cargo"} ·{" "}
                  {u.empleado.horaEntrada && u.empleado.horaSalida
                    ? `${u.empleado.horaEntrada} – ${u.empleado.horaSalida}`
                    : "Horario no definido"}
                  {u.empleado.diasLaborales.length > 0 && (
                    <> · {u.empleado.diasLaborales.map((d) => d.slice(0, 3)).join(", ")}</>
                  )}
                </p>
              ) : (
                <p className="text-xs text-amber-600 mt-0.5">Sin perfil de empleado</p>
              )}
            </div>
            <Link
              href={`/admin/empleados/${u.id}/editar`}
              className="text-sm text-[#1E3A6E] hover:text-[#162D57] font-medium shrink-0"
            >
              {u.empleado ? "Editar perfil" : "Crear perfil"}
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}
