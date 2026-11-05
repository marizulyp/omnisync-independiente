"use server"

import { prisma } from "@/lib/prisma"
import { requirePermiso } from "@/lib/permisos-server"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"

export type ActionState = { error?: string }

// Ajustamos el tipado para aceptar tanto la estructura vieja como la nueva
type ItemInput = { item?: string; medicamento?: string; instrucciones: string }

export async function crearFormula(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  // 1. El permiso ahora corresponde al módulo unificado: "recomendaciones"
  await requirePermiso("recomendaciones", "editar")
  
  // 2. Extraemos los campos mapeando a los nuevos nombres de tu base de datos
  const fichaIdRaw = formData.get("fichaId") || formData.get("mascotaId")
  const fichaId = fichaIdRaw as string
  
  const especialistaIdRaw = formData.get("especialistaId") || formData.get("veterinarioId")
  const especialistaId = (especialistaIdRaw as string) || null
  
  const itemsJson = formData.get("itemsJson") as string

  if (!fichaId) return { error: "Selecciona un paciente / ficha" }

  let items: ItemInput[] = []
  try {
    items = JSON.parse(itemsJson)
  } catch {
    return { error: "Error en los medicamentos" }
  }

  // Validamos usando 'item' o el antiguo 'medicamento'
  const itemsValidos = items.filter((i) => (i.item || i.medicamento || "").trim())
  if (itemsValidos.length === 0) return { error: "Agrega al menos una recomendación o medicamento" }

  let recomendacionId: string
  try {
    // 3. Guardamos en las nuevas tablas
    const recomendacion = await prisma.recomendacion.create({
      data: { fichaId, especialistaId },
    })
    
    await prisma.recomendacionItem.createMany({
      data: itemsValidos.map((itm, i) => ({
        recomendacionId: recomendacion.id,
        orden: i,
        item: (itm.item || itm.medicamento || "").trim(),
        instrucciones: (itm.instrucciones || "").trim(),
      })),
    })
    
    recomendacionId = recomendacion.id
  } catch (error) {
    console.error("Error al crear recomendación:", error)
    return { error: "Error al guardar la fórmula médica" }
  }

  revalidatePath("/formulas")
  redirect(`/formulas/${recomendacionId}`)
}

export async function eliminarFormula(id: string) {
  await requirePermiso("recomendaciones", "eliminar")
  await prisma.recomendacion.delete({ where: { id } })
  revalidatePath("/formulas")
  redirect("/formulas")
};