"use server"

import { prisma } from "@/lib/prisma"
import { requirePermiso } from "@/lib/permisos-server"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import type { EstadoCita } from "@/generated/prisma/client"
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

function combinarFechaHora(fecha: string, hora: string): Date {
  return new Date(`${fecha}T${hora || "00:00"}`)
}

export async function crearCita(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requirePermiso("agenda", "editar")
  const fichaId = formData.get("fichaId") as string
  const motivo = (formData.get("motivo") as string)?.trim()
  const fecha = (formData.get("fecha") as string)?.trim()
  const hora = (formData.get("hora") as string)?.trim()
  const negocioId = await getNegocioId()

  if (!fichaId) return { error: "Debes seleccionar un registro" }
  if (!motivo) return { error: "El motivo es obligatorio" }
  if (!fecha) return { error: "La fecha es obligatoria" }
  if (!negocioId) return { error: "Error de sesión: Negocio no identificado" }

  const especialistaId = (formData.get("especialistaId") as string) || null
  const tipo = (formData.get("tipo") as string) || "otro"

  try {
    // Validamos que el cliente/ficha pertenezca al negocio
    const ficha = await prisma.ficha.findFirst({ 
      where: { id: fichaId, negocioId }, 
      select: { nombre: true } 
    })
    
    if (!ficha) return { error: "Registro inválido o sin acceso" }

    await prisma.cita.create({
      data: {
        negocioId, // MURO DE CONTENCIÓN
        fichaId,
        especialistaId,
        motivo,
        tipo,
        fecha: combinarFechaHora(fecha, hora),
        notas: (formData.get("notas") as string)?.trim() || null,
      },
    })
    await registrarActividad({
      accion: "Crear",
      modulo: "Agenda",
      entidad: ficha.nombre,
      detalle: motivo,
    })
  } catch {
    return { error: "Error al crear la cita" }
  }
  revalidatePath("/agenda")
  redirect(`/agenda?fecha=${fecha}&toast=created`)
}

export async function actualizarCita(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requirePermiso("agenda", "editar")
  const id = formData.get("id") as string
  const fichaId = formData.get("fichaId") as string
  const motivo = (formData.get("motivo") as string)?.trim()
  const fecha = (formData.get("fecha") as string)?.trim()
  const hora = (formData.get("hora") as string)?.trim()
  const negocioId = await getNegocioId()

  if (!fichaId) return { error: "Debes seleccionar un registro" }
  if (!motivo) return { error: "El motivo es obligatorio" }
  if (!fecha) return { error: "La fecha es obligatoria" }

  // Seguridad: validar que la cita exista en el negocio
  const citaExistente = await prisma.cita.findFirst({ where: { id, negocioId } })
  if (!citaExistente) return { error: "Acceso denegado o cita no encontrada" }

  const especialistaId = (formData.get("especialistaId") as string) || null
  const tipo = (formData.get("tipo") as string) || "otro"

  try {
    const ficha = await prisma.ficha.findUnique({ where: { id: fichaId }, select: { nombre: true } })
    await prisma.cita.update({
      where: { id },
      data: {
        fichaId,
        especialistaId,
        motivo,
        tipo,
        fecha: combinarFechaHora(fecha, hora),
        notas: (formData.get("notas") as string)?.trim() || null,
      },
    })
    await registrarActividad({
      accion: "Editar",
      modulo: "Agenda",
      entidad: ficha?.nombre ?? fichaId,
      detalle: motivo,
    })
  } catch {
    return { error: "Error al actualizar la cita" }
  }
  revalidatePath("/agenda")
  redirect(`/agenda?fecha=${fecha}&toast=updated`)
}

export async function cambiarEstadoCita(id: string, estado: EstadoCita, fecha: string) {
  await requirePermiso("agenda", "editar")
  const negocioId = await getNegocioId()
  
  const cita = await prisma.cita.findFirst({
    where: { id, negocioId }, // Aislamiento de seguridad
    select: { motivo: true, ficha: { select: { nombre: true } } },
  })
  if (!cita) redirect(`/agenda?fecha=${fecha}&error=denegado`)

  await prisma.cita.update({ where: { id }, data: { estado } })
  await registrarActividad({
    accion: "Editar",
    modulo: "Agenda",
    entidad: cita.ficha?.nombre ?? id,
    detalle: `Estado → ${estado}`,
  })
  revalidatePath("/agenda")
  redirect(`/agenda?fecha=${fecha}&toast=updated`)
}

export async function eliminarCita(id: string, fecha: string) {
  await requirePermiso("agenda", "eliminar")
  const negocioId = await getNegocioId()

  const cita = await prisma.cita.findFirst({
    where: { id, negocioId }, // Aislamiento de seguridad
    select: { motivo: true, ficha: { select: { nombre: true } } },
  })
  if (!cita) redirect(`/agenda?fecha=${fecha}&error=denegado`)

  await prisma.cita.delete({ where: { id } })
  await registrarActividad({
    accion: "Eliminar",
    modulo: "Agenda",
    entidad: cita.ficha?.nombre ?? id,
    detalle: cita.motivo,
  })
  revalidatePath("/agenda")
  redirect(`/agenda?fecha=${fecha}&toast=deleted`)
}