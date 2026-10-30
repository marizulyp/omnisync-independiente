"use server"

import { prisma } from "@/lib/prisma"
import { requirePermiso } from "@/lib/permisos-server"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { registrarActividad } from "@/lib/auditoria"
import { auth } from "@/auth"

export type ActionState = { error?: string }

// Helper para extraer el ID del negocio de forma segura
async function getNegocioId(): Promise<string | null> {
  const session = await auth()
  if (!session?.user?.email) return null
  const user = await prisma.usuario.findUnique({
    where: { email: session.user.email },
    select: { negocioId: true }
  })
  return user?.negocioId || null
}

export async function crearMascota(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requirePermiso("fichas", "editar")
  
  const clienteId = (formData.get("clienteId") as string)?.trim()
  const nombre = (formData.get("nombre") as string)?.trim()
  const tipo = (formData.get("tipo") as string)?.trim() || "otro"
  const notas = (formData.get("notas") as string)?.trim() || null
  const tipoNegocio = (formData.get("tipoNegocio") as string)?.trim() || "veterinaria"
  const negocioId = await getNegocioId()

  if (!nombre) return { error: "El nombre/placa es obligatorio" }
  if (!clienteId) return { error: "Debe seleccionar un cliente" }
  if (!negocioId) return { error: "Error de sesión: Negocio no identificado" }

  // Armar el JSON dinámico
  const datosGenerales: Record<string, any> = {}
  if (tipoNegocio === "taller") {
    datosGenerales.marca = formData.get("marca") || null
    datosGenerales.color = formData.get("color") || null
  } else if (tipoNegocio === "veterinaria") {
    datosGenerales.raza = formData.get("raza") || null
    datosGenerales.peso = formData.get("peso") || null
    datosGenerales.fechaNacimiento = formData.get("fechaNacimiento") || null
  }

  try {
    // Validamos que el cliente también pertenezca al negocio actual
    const clienteExistente = await prisma.cliente.findFirst({ where: { id: clienteId, negocioId } })
    if (!clienteExistente) return { error: "Cliente inválido o acceso denegado" }

    await prisma.ficha.create({ 
      data: { negocioId, nombre, tipo, notas, clienteId, datosGenerales } // SELLO DE AISLAMIENTO INYECTADO
    })
  } catch {
    return { error: "Error al guardar el registro" }
  }
  
  await registrarActividad({ accion: "Crear", modulo: "Fichas", entidad: nombre })
  redirect(`/clientes/${clienteId}?toast=created`)
}

export async function actualizarMascota(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requirePermiso("fichas", "editar")
  const id = formData.get("id") as string
  const nombre = (formData.get("nombre") as string)?.trim()
  const negocioId = await getNegocioId()

  if (!nombre) return { error: "El nombre es obligatorio" }
  
  const fichaExistente = await prisma.ficha.findFirst({ where: { id, negocioId } })
  if (!fichaExistente) return { error: "Acceso denegado o registro no encontrado" }

  try {
    await prisma.ficha.update({ where: { id }, data: { nombre } }) 
  } catch {
    return { error: "Error al actualizar" }
  }
  redirect(`/fichas/${id}?toast=updated`)
}

export async function eliminarMascota(id: string, clienteId: string) {
  await requirePermiso("fichas", "eliminar")
  const negocioId = await getNegocioId()

  const ficha = await prisma.ficha.findFirst({ where: { id, negocioId } })
  if (!ficha) redirect(`/clientes/${clienteId}`)

  await prisma.ficha.delete({ where: { id } })
  revalidatePath(`/clientes/${clienteId}`)
  redirect(`/clientes/${clienteId}?toast=deleted`)
}