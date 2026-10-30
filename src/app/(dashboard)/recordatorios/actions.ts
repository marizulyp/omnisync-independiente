"use server"

import { prisma } from "@/lib/prisma"
import { requirePermiso } from "@/lib/permisos-server"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { parseFechaLocal } from "@/lib/fechas"

export type ActionState = { error?: string }

async function getUsuarioId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id ?? null
}

export async function crearRecordatorio(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requirePermiso("recordatorios", "editar")
  const mensaje = (formData.get("mensaje") as string)?.trim()
  if (!mensaje) return { error: "El mensaje es obligatorio" }

  const fechaStr = (formData.get("fecha") as string)?.trim()
  if (!fechaStr) return { error: "La fecha es obligatoria" }

  const clienteId = (formData.get("clienteId") as string) || null
  const mascotaId = (formData.get("mascotaId") as string) || null

  try {
    await prisma.recordatorio.create({
      data: {
        mensaje,
        fecha: parseFechaLocal(fechaStr),
        clienteId,
        mascotaId,
        usuarioId: await getUsuarioId(),
      },
    })
  } catch {
    return { error: "Error al crear el recordatorio" }
  }
  revalidatePath("/recordatorios")
  redirect("/recordatorios?toast=created")
}

export async function completarRecordatorio(id: string, completado: boolean) {
  await requirePermiso("recordatorios", "editar")
  await prisma.recordatorio.update({ where: { id }, data: { completado } })
  revalidatePath("/recordatorios")
}

export async function eliminarRecordatorio(id: string) {
  await requirePermiso("recordatorios", "eliminar")
  await prisma.recordatorio.delete({ where: { id } })
  revalidatePath("/recordatorios")
  redirect("/recordatorios?toast=deleted")
}
