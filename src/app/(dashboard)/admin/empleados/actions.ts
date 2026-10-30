"use server"

import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"

export type ActionState = { error?: string }

async function requireAdmin() {
  const session = await auth()
  if (session?.user.rol !== "admin") throw new Error("No autorizado")
}

export async function guardarEmpleado(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try { await requireAdmin() } catch { return { error: "No autorizado" } }
  const usuarioId = formData.get("usuarioId") as string
  const diasLaborales = formData.getAll("diasLaborales") as string[]

  const data = {
    cargo: (formData.get("cargo") as string)?.trim() || null,
    telefono: (formData.get("telefono") as string)?.trim() || null,
    direccion: (formData.get("direccion") as string)?.trim() || null,
    horaEntrada: (formData.get("horaEntrada") as string)?.trim() || null,
    horaSalida: (formData.get("horaSalida") as string)?.trim() || null,
    diasLaborales,
  }

  try {
    await prisma.empleado.upsert({
      where: { usuarioId },
      create: { usuarioId, ...data },
      update: data,
    })
  } catch {
    return { error: "Error al guardar el perfil del empleado" }
  }
  redirect("/admin/empleados")
}
