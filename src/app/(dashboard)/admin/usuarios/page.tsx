import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Icon } from "@/components/ui/Icon"
import { BtnEliminar } from "@/components/ui/BtnEliminar"
import { eliminarUsuario } from "./actions"

const ROL_LABEL: Record<string, string> = {
  admin: "Administrador",
  especialista: "Especialista",
  recepcionista: "Recepción",
  asistente: "Asistente",
  // Mantenemos los antiguos por compatibilidad si tienes usuarios viejos
  veterinario: "Veterinario/a",
  enfermero: "Enfermero/a",
}

const ROL_STYLE: Record<string, { bg: string; text: string }> = {
  admin: { bg: "#EDE9FE", text: "#7C3AED" },
  especialista: { bg: "#DBEAFE", text: "#2563EB" },
  recepcionista: { bg: "#D1FAE5", text: "#059669" },
  asistente: { bg: "#FEF3C7", text: "#B45309" },
  veterinario: { bg: "#DBEAFE", text: "#2563EB" },
  enfermero: { bg: "#FEF3C7", text: "#B45309" },
}

function getIniciales(nombre: string) {
  return nombre.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("")
}

export default async function EquipoPage() {
  const session = await auth()
  if (session?.user.rol !== "admin") redirect("/")
  
  const sesionId = session.user.id
  
  // EXTRACCIÓN SEGURA DEL NEGOCIO ACTUAL
  const usuarioActual = await prisma.usuario.findUnique({
    where: { id: sesionId },
    select: { negocioId: true }
  })
  
  const negocioId = usuarioActual?.negocioId

  if (!negocioId) {
    return <div className="p-8 text-center text-red-500">Error: Tu usuario no tiene un negocio asignado.</div>
  }

  // EL MURO DE CONTENCIÓN: Solo traemos usuarios que pertenezcan a ESTE negocio
  const usuarios = await prisma.usuario.findMany({
    where: { negocioId },
    orderBy: { nombre: "asc" },
    include: { empleado: true },
  })

  return (
    <div>
      {/* Encabezado */}
      <div className="flex flex-wrap items-end justify-between gap-4 mb-[18px]">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.015em] text-[#0F1720]">Equipo y usuarios</h1>
          <p className="mt-[5px] font-mono text-[11.5px] tracking-[0.04em] text-[#64748B] uppercase">
            {usuarios.length} {usuarios.length === 1 ? "miembro" : "miembros"} del equipo
          </p>
        </div>
        <Link
          href="/admin/usuarios/nuevo"
          className="flex items-center gap-[7px] rounded-[7px] bg-[#1E3A6E] px-[15px] py-[9px] text-[13px] font-semibold text-white hover:bg-[#162D57] transition-colors"
        >
          <Icon name="person_add" size={17} className="text-white" />
          Nuevo usuario
        </Link>
      </div>

      {/* Cards */}
      <div className="grid gap-3.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px,1fr))" }}>
        {usuarios.map((u) => {
          const rolStyle = ROL_STYLE[u.rol] ?? { bg: "#F1F5F9", text: "#475569" }
          return (
            <div
              key={u.id}
              className="relative flex flex-col rounded-xl border border-[#E2E8F0] bg-white p-4"
            >
              {/* Estado activo / inactivo */}
              <div
                className={`absolute top-3.5 right-3.5 h-2 w-2 rounded-full ${u.activo ? "bg-[#059669]" : "bg-[#DC2626]"}`}
                title={u.activo ? "Activo" : "Inactivo"}
              />

              {/* Avatar + nombre */}
              <div className="flex items-start gap-3 mb-3">
                <div
                  className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-[10px] text-[15px] font-bold"
                  style={{ backgroundColor: "#E8EEFB", color: "#1E3A6E" }}
                >
                  {getIniciales(u.nombre)}
                </div>
                <div className="min-w-0">
                  <p className="text-[15px] font-semibold text-[#0F1720] truncate">{u.nombre}</p>
                  <p className="text-[12.5px] text-[#64748B] truncate">{u.email}</p>
                </div>
              </div>

              {/* Rol + cargo */}
              <div
                className="grid grid-cols-2 gap-3 pt-3"
                style={{ borderTop: "1px solid #F1F5F9" }}
              >
                <div>
                  <p className="font-mono text-[10px] tracking-[0.1em] text-[#94A3B8] uppercase">Rol</p>
                  <span
                    className="mt-0.5 inline-block rounded-full px-2 py-[2px] font-mono text-[11px] font-medium"
                    style={{ backgroundColor: rolStyle.bg, color: rolStyle.text }}
                  >
                    {ROL_LABEL[u.rol] ?? u.rol}
                  </span>
                </div>
                <div>
                  <p className="font-mono text-[10px] tracking-[0.1em] text-[#94A3B8] uppercase">Cargo</p>
                  <p className="mt-0.5 text-[12.5px] text-[#334155] truncate">
                    {u.empleado?.cargo ?? "—"}
                  </p>
                </div>
              </div>

              {/* Acciones */}
              <div className="mt-3 flex items-center justify-end gap-2">
                <Link
                  href={`/admin/usuarios/${u.id}/editar`}
                  className="flex items-center gap-1.5 rounded-[6px] border border-[#E2E8F0] px-2.5 py-[5px] text-[12px] text-[#475569] hover:bg-[#F8FAFC] transition-colors"
                >
                  <Icon name="edit" size={14} className="text-[#7C8CA0]" />
                  Editar usuario
                </Link>
                {u.empleado ? (
                  <Link
                    href={`/admin/empleados/${u.id}/editar`}
                    className="flex items-center gap-1.5 rounded-[6px] border border-[#E2E8F0] px-2.5 py-[5px] text-[12px] text-[#475569] hover:bg-[#F8FAFC] transition-colors"
                  >
                    <Icon name="badge" size={14} className="text-[#7C8CA0]" />
                    Ficha
                  </Link>
                ) : (
                  <Link
                    href={`/admin/empleados/${u.id}/editar`}
                    className="flex items-center gap-1.5 rounded-[6px] border border-[#E2E8F0] px-2.5 py-[5px] text-[12px] text-[#94A3B8] hover:bg-[#F8FAFC] transition-colors"
                  >
                    <Icon name="badge" size={14} className="text-[#94A3B8]" />
                    Crear ficha
                  </Link>
                )}
                {/* Eliminar — solo si no es el usuario propio */}
                {u.id !== sesionId && (
                  <BtnEliminar
                    action={eliminarUsuario.bind(null, u.id)}
                    mensaje={`¿Eliminar al usuario "${u.nombre}"? Esta acción no se puede deshacer.`}
                  />
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}