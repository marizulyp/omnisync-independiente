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

export async function crearCliente(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requirePermiso("clientes", "editar")
  const nombre = (formData.get("nombre") as string)?.trim()
  const accionSiguiente = formData.get("accionSiguiente") as string
  const negocioId = await getNegocioId()

  if (!nombre) return { error: "El nombre es obligatorio" }
  if (!negocioId) return { error: "Error de sesión: Negocio no identificado" }

  let nuevoCliente;
  try {
    nuevoCliente = await prisma.cliente.create({
      data: {
        negocioId, // SELLO DE AISLAMIENTO
        nombre,
        identificacion: (formData.get("identificacion") as string)?.trim() || null,
        telefono: (formData.get("telefono") as string)?.trim() || null,
        email: (formData.get("email") as string)?.trim() || null,
        direccion: (formData.get("direccion") as string)?.trim() || null,
        notas: (formData.get("notas") as string)?.trim() || null,
      },
    })
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2002")
      return { error: "Ya existe un cliente con esa identificación" }
    return { error: "Error al guardar el cliente" }
  }

  await registrarActividad({ accion: "Crear", modulo: "Clientes", entidad: nombre })

  if (accionSiguiente === "registrar_ficha") {
    redirect(`/fichas/nueva?clienteId=${nuevoCliente.id}`)
  } else {
    redirect(`/clientes/${nuevoCliente.id}?toast=created`)
  }
}

export async function actualizarCliente(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requirePermiso("clientes", "editar")
  const id = formData.get("id") as string
  const nombre = (formData.get("nombre") as string)?.trim()
  const negocioId = await getNegocioId()
  
  if (!nombre) return { error: "El nombre es obligatorio" }

  // Validación estricta de seguridad
  const clienteExistente = await prisma.cliente.findFirst({ where: { id, negocioId } })
  if (!clienteExistente) return { error: "Acceso denegado o cliente no encontrado" }

  try {
    await prisma.cliente.update({
      where: { id },
      data: {
        nombre,
        identificacion: (formData.get("identificacion") as string)?.trim() || null,
        telefono: (formData.get("telefono") as string)?.trim() || null,
        email: (formData.get("email") as string)?.trim() || null,
        direccion: (formData.get("direccion") as string)?.trim() || null,
        notas: (formData.get("notas") as string)?.trim() || null,
      },
    })
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2002")
      return { error: "Ya existe un cliente con esa identificación" }
    return { error: "Error al actualizar el cliente" }
  }
  await registrarActividad({ accion: "Editar", modulo: "Clientes", entidad: nombre })
  redirect(`/clientes/${id}?toast=updated`)
}

export async function eliminarCliente(id: string) {
  await requirePermiso("clientes", "eliminar")
  const negocioId = await getNegocioId()
  
  // Validación estricta de seguridad
  const cliente = await prisma.cliente.findFirst({ where: { id, negocioId }, select: { nombre: true } })
  if (!cliente) redirect("/clientes")

  await prisma.cliente.delete({ where: { id } })
  await registrarActividad({ accion: "Eliminar", modulo: "Clientes", entidad: cliente.nombre })
  revalidatePath("/clientes")
  redirect("/clientes?toast=deleted")
}