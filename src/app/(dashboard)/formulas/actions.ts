"use server"

import { prisma } from "@/lib/prisma"
import { requirePermiso } from "@/lib/permisos-server"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

export type ActionState = { error?: string }

type ItemInput = { medicamento: string; instrucciones: string }

export async function crearFormula(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requirePermiso("formulas", "editar")
  const mascotaId = formData.get("mascotaId") as string
  const veterinarioId = (formData.get("veterinarioId") as string) || null
  const itemsJson = formData.get("itemsJson") as string

  if (!mascotaId) return { error: "Selecciona una mascota" }

  let items: ItemInput[] = []
  try {
    items = JSON.parse(itemsJson)
  } catch {
    return { error: "Error en los medicamentos" }
  }

  const itemsValidos = items.filter((i) => i.medicamento.trim())
  if (itemsValidos.length === 0) return { error: "Agrega al menos un medicamento" }

  let formulaId: string
  try {
    const formula = await prisma.formulaMedica.create({
      data: { mascotaId, veterinarioId },
    })
    await prisma.formulaMedicaItem.createMany({
      data: itemsValidos.map((item, i) => ({
        formulaId: formula.id,
        orden: i,
        medicamento: item.medicamento.trim(),
        instrucciones: item.instrucciones.trim(),
      })),
    })
    formulaId = formula.id
  } catch {
    return { error: "Error al guardar la fórmula médica" }
  }

  revalidatePath("/formulas")
  redirect(`/formulas/${formulaId}`)
}

export async function eliminarFormula(id: string) {
  await requirePermiso("formulas", "eliminar")
  await prisma.formulaMedica.delete({ where: { id } })
  revalidatePath("/formulas")
  redirect("/formulas")
}
