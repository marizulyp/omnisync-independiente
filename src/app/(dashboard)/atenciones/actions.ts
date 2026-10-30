"use server"

import { prisma } from "@/lib/prisma"
import { requirePermiso } from "@/lib/permisos-server"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { registrarActividad } from "@/lib/auditoria"
import { parseFechaLocal } from "@/lib/fechas"

export type ActionState = { error?: string }

// ── Utilidades y Seguridad ──────────────────────────────────────────────────

function toDate(value: any): Date | null {
  if (!value || typeof value !== "string" || !value.trim()) return null
  const d = parseFechaLocal(value.trim())
  return isNaN(d.getTime()) ? null : d
}

function strInt(formData: FormData, field: string): number | null {
  const v = (formData.get(field) as string)?.trim()
  if (!v) return null
  const n = parseInt(v)
  return isNaN(n) ? null : n
}

async function getUsuarioId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id ?? null
}

async function getNegocioId(): Promise<string | null> {
  const session = await auth()
  if (!session?.user?.email) return null
  const user = await prisma.usuario.findUnique({
    where: { email: session.user.email },
    select: { negocioId: true }
  })
  return user?.negocioId || null
}

// Verifica que la ficha exista y pertenezca al negocio de la sesión
async function validarFichaSegura(fichaId: string, negocioId: string): Promise<string> {
  const f = await prisma.ficha.findFirst({ 
    where: { id: fichaId, negocioId }, 
    select: { nombre: true } 
  })
  if (!f) throw new Error("Acceso denegado o ficha no encontrada")
  return f.nombre
}

// ── Consultas -> Atenciones ─────────────────────────────────────────────────

export async function crearConsulta(
  mascotaId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const fichaId = mascotaId
  await requirePermiso("fichas", "editar") // <-- CORREGIDO
  const motivo = (formData.get("motivo") as string)?.trim()
  const negocioId = await getNegocioId()

  if (!motivo) return { error: "El motivo es obligatorio" }
  if (!negocioId) return { error: "Error de sesión" }

  const pesoStr = (formData.get("peso") as string)?.trim()
  const tempStr = (formData.get("temperatura") as string)?.trim()
  const fechaStr = (formData.get("fecha") as string)?.trim()

  let nombreFicha = ""
  try {
    nombreFicha = await validarFichaSegura(fichaId, negocioId)
    
    const detalles: any = {
      anamnesis: (formData.get("anamnesis") as string)?.trim() || null,
      sintomas: (formData.get("sintomas") as string)?.trim() || null,
      examenFisico: (formData.get("examenFisico") as string)?.trim() || null,
      diagnostico: (formData.get("diagnostico") as string)?.trim() || null,
      tratamiento: (formData.get("tratamiento") as string)?.trim() || null,
      plan: (formData.get("plan") as string)?.trim() || null,
      observaciones: (formData.get("observaciones") as string)?.trim() || null,
      peso: pesoStr ? parseFloat(pesoStr) : null,
      temperatura: tempStr ? parseFloat(tempStr) : null,
      frecuenciaCardiaca: strInt(formData, "frecuenciaCardiaca"),
      frecuenciaRespiratoria: strInt(formData, "frecuenciaRespiratoria"),
      condicionCorporal: strInt(formData, "condicionCorporal"),
      mucosas: (formData.get("mucosas") as string)?.trim() || null,
    }

    await prisma.atencion.create({
      data: {
        negocioId, // MURO DE CONTENCIÓN
        fichaId,
        especialistaId: await getUsuarioId(),
        fecha: fechaStr ? parseFechaLocal(fechaStr) : new Date(),
        motivo,
        detalles, 
      },
    })
  } catch (e: any) {
    return { error: e.message || "Error al guardar el registro" }
  }

  await registrarActividad({
    accion: "Crear", modulo: "Historial", entidad: nombreFicha, detalle: `Atención: ${motivo}`
  })
  redirect(`/fichas/${fichaId}?toast=created`)
}

export async function actualizarConsulta(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requirePermiso("fichas", "editar") // <-- CORREGIDO
  const id = formData.get("id") as string
  const fichaId = formData.get("mascotaId") as string
  const motivo = (formData.get("motivo") as string)?.trim()
  const negocioId = await getNegocioId()

  if (!motivo) return { error: "El motivo es obligatorio" }
  if (!negocioId) return { error: "Error de sesión" }

  const atencionExistente = await prisma.atencion.findFirst({ where: { id, negocioId } })
  if (!atencionExistente) return { error: "Atención no encontrada o sin acceso" }

  const pesoStr = (formData.get("peso") as string)?.trim()
  const tempStr = (formData.get("temperatura") as string)?.trim()
  const fechaStr = (formData.get("fecha") as string)?.trim()

  try {
    const detalles: any = {
      anamnesis: (formData.get("anamnesis") as string)?.trim() || null,
      sintomas: (formData.get("sintomas") as string)?.trim() || null,
      examenFisico: (formData.get("examenFisico") as string)?.trim() || null,
      diagnostico: (formData.get("diagnostico") as string)?.trim() || null,
      tratamiento: (formData.get("tratamiento") as string)?.trim() || null,
      plan: (formData.get("plan") as string)?.trim() || null,
      observaciones: (formData.get("observaciones") as string)?.trim() || null,
      peso: pesoStr ? parseFloat(pesoStr) : null,
      temperatura: tempStr ? parseFloat(tempStr) : null,
      frecuenciaCardiaca: strInt(formData, "frecuenciaCardiaca"),
      frecuenciaRespiratoria: strInt(formData, "frecuenciaRespiratoria"),
      condicionCorporal: strInt(formData, "condicionCorporal"),
      mucosas: (formData.get("mucosas") as string)?.trim() || null,
    }

    await prisma.atencion.update({
      where: { id },
      data: {
        fecha: fechaStr ? parseFechaLocal(fechaStr) : undefined,
        motivo,
        detalles,
      },
    })
  } catch {
    return { error: "Error al actualizar la atención" }
  }
  
  redirect(`/fichas/${fichaId}?toast=updated`)
}

export async function eliminarConsulta(id: string, mascotaId: string) {
  const fichaId = mascotaId
  await requirePermiso("fichas", "eliminar") // <-- CORREGIDO
  const negocioId = await getNegocioId()

  const atencion = await prisma.atencion.findFirst({ 
    where: { id, negocioId }, 
    select: { motivo: true, ficha: { select: { nombre: true } } } 
  })
  
  if (!atencion) redirect(`/fichas/${fichaId}`)
  
  await prisma.atencion.delete({ where: { id } })
  await registrarActividad({
    accion: "Eliminar", modulo: "Historial", entidad: atencion.ficha?.nombre ?? id, detalle: atencion.motivo
  })
  
  revalidatePath(`/fichas/${fichaId}`)
  redirect(`/fichas/${fichaId}?toast=deleted`)
}

// ── Vacunas -> Controles Preventivos ────────────────────────────────────────

export async function crearVacuna(
  mascotaId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const fichaId = mascotaId
  await requirePermiso("fichas", "editar") // <-- CORREGIDO
  const nombre = (formData.get("nombre") as string)?.trim()
  const fechaStr = (formData.get("fecha") as string)?.trim()
  const negocioId = await getNegocioId()

  if (!nombre) return { error: "El nombre es obligatorio" }
  if (!fechaStr) return { error: "La fecha es obligatoria" }
  if (!negocioId) return { error: "Error de sesión" }

  try {
    await validarFichaSegura(fichaId, negocioId)
    
    const lote = (formData.get("lote") as string)?.trim()
    const notasForm = (formData.get("notas") as string)?.trim()
    const notas = lote ? `Lote: ${lote}\n${notasForm || ""}` : notasForm

    await prisma.controlPreventivo.create({
      data: {
        fichaId,
        especialistaId: await getUsuarioId(),
        tipo: "Vacuna",
        nombre,
        fecha: parseFechaLocal(fechaStr),
        proximaFecha: toDate(formData.get("proximaDosis")),
        notas,
      },
    })
  } catch (e: any) {
    return { error: e.message || "Error al guardar el control" }
  }
  redirect(`/fichas/${fichaId}?toast=created`)
}

export async function actualizarVacuna(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requirePermiso("fichas", "editar") // <-- CORREGIDO
  const id = formData.get("id") as string
  const fichaId = formData.get("mascotaId") as string
  const nombre = (formData.get("nombre") as string)?.trim()
  const fechaStr = (formData.get("fecha") as string)?.trim()
  const negocioId = await getNegocioId()

  if (!nombre || !fechaStr || !negocioId) return { error: "Datos incompletos" }

  const controlExistente = await prisma.controlPreventivo.findFirst({
    where: { id, ficha: { negocioId } }
  })
  if (!controlExistente) return { error: "Registro no encontrado o sin acceso" }

  try {
    const lote = (formData.get("lote") as string)?.trim()
    const notasForm = (formData.get("notas") as string)?.trim()
    const notas = lote ? `Lote: ${lote}\n${notasForm || ""}` : notasForm

    await prisma.controlPreventivo.update({
      where: { id },
      data: {
        nombre,
        fecha: parseFechaLocal(fechaStr),
        proximaFecha: toDate(formData.get("proximaDosis")),
        notas,
      },
    })
  } catch {
    return { error: "Error al actualizar" }
  }
  redirect(`/fichas/${fichaId}?toast=updated`)
}

export async function eliminarVacuna(id: string, mascotaId: string) {
  const fichaId = mascotaId
  await requirePermiso("fichas", "eliminar") // <-- CORREGIDO
  const negocioId = await getNegocioId()

  const control = await prisma.controlPreventivo.findFirst({ 
    where: { id, ficha: { negocioId } } 
  })
  if (control) await prisma.controlPreventivo.delete({ where: { id } })
  
  revalidatePath(`/fichas/${fichaId}`)
  redirect(`/fichas/${fichaId}?toast=deleted`)
}

// ── Desparasitaciones -> Controles Preventivos ──────────────────────────────

export async function crearDesparasitacion(
  mascotaId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const fichaId = mascotaId
  await requirePermiso("fichas", "editar") // <-- CORREGIDO
  const fechaStr = (formData.get("fecha") as string)?.trim()
  const negocioId = await getNegocioId()

  if (!fechaStr) return { error: "La fecha es obligatoria" }
  if (!negocioId) return { error: "Error de sesión" }

  const tipoD = (formData.get("tipo") as string) || "interna"
  const producto = (formData.get("producto") as string)?.trim() || "Genérico"

  try {
    await validarFichaSegura(fichaId, negocioId)
    await prisma.controlPreventivo.create({
      data: {
        fichaId,
        especialistaId: await getUsuarioId(),
        tipo: `Desparasitación ${tipoD}`,
        nombre: producto,
        fecha: parseFechaLocal(fechaStr),
        proximaFecha: toDate(formData.get("proximaDosis")),
        notas: (formData.get("notas") as string)?.trim() || null,
      },
    })
  } catch (e: any) {
    return { error: e.message || "Error al guardar" }
  }
  redirect(`/fichas/${fichaId}?toast=created`)
}

export async function actualizarDesparasitacion(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requirePermiso("fichas", "editar") // <-- CORREGIDO
  const id = formData.get("id") as string
  const fichaId = formData.get("mascotaId") as string
  const fechaStr = (formData.get("fecha") as string)?.trim()
  const negocioId = await getNegocioId()

  if (!fechaStr || !negocioId) return { error: "Datos incompletos" }

  const controlExistente = await prisma.controlPreventivo.findFirst({
    where: { id, ficha: { negocioId } }
  })
  if (!controlExistente) return { error: "Registro no encontrado o sin acceso" }

  const tipoD = (formData.get("tipo") as string) || "interna"
  const producto = (formData.get("producto") as string)?.trim() || "Genérico"

  try {
    await prisma.controlPreventivo.update({
      where: { id },
      data: {
        tipo: `Desparasitación ${tipoD}`,
        nombre: producto,
        fecha: parseFechaLocal(fechaStr),
        proximaFecha: toDate(formData.get("proximaDosis")),
        notas: (formData.get("notas") as string)?.trim() || null,
      },
    })
  } catch {
    return { error: "Error al actualizar" }
  }
  redirect(`/fichas/${fichaId}?toast=updated`)
}

export async function eliminarDesparasitacion(id: string, mascotaId: string) {
  const fichaId = mascotaId
  await requirePermiso("fichas", "eliminar") // <-- CORREGIDO
  const negocioId = await getNegocioId()

  const control = await prisma.controlPreventivo.findFirst({ 
    where: { id, ficha: { negocioId } } 
  })
  if (control) await prisma.controlPreventivo.delete({ where: { id } })
  
  revalidatePath(`/fichas/${fichaId}`)
  redirect(`/fichas/${fichaId}?toast=deleted`)
}