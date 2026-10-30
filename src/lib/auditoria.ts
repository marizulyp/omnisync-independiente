import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function registrarActividad({
  accion,
  modulo,
  entidad,
  detalle,
}: {
  accion: "Crear" | "Editar" | "Eliminar"
  modulo: string
  entidad: string
  detalle?: string
}) {
  try {
    const session = await auth()
    await prisma.registroActividad.create({
      data: {
        usuarioNombre: session?.user?.name ?? "Sistema",
        usuarioEmail: session?.user?.email ?? "",
        usuarioRol: session?.user?.rol ?? "",
        accion,
        modulo,
        entidad,
        detalle: detalle ?? null,
      },
    })
  } catch {
    // No bloquear la operación principal si la auditoría falla
  }
}
