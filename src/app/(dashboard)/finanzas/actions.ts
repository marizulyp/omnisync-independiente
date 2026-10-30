"use server"

import { prisma } from "@/lib/prisma"
import { requirePermiso } from "@/lib/permisos-server"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import type { MetodoPago, CategoriaEgreso } from "@/generated/prisma/client"
import { registrarActividad } from "@/lib/auditoria"
import { parseFechaLocal } from "@/lib/fechas"

export type ActionState = { error?: string }

const METODOS_PAGO: MetodoPago[] = ["efectivo", "tarjeta", "transferencia", "otro"]
const CATEGORIAS_EGRESO: CategoriaEgreso[] = ["insumos", "nomina", "servicios", "arriendo", "otro"]

function toMetodoPago(v: unknown): MetodoPago {
  return METODOS_PAGO.includes(v as MetodoPago) ? (v as MetodoPago) : "efectivo"
}
function toCategoriaEgreso(v: unknown): CategoriaEgreso {
  return CATEGORIAS_EGRESO.includes(v as CategoriaEgreso) ? (v as CategoriaEgreso) : "otro"
}

async function getUsuarioId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id ?? null
}

// ── Cobros (recibo interno) ──────────────────────────────────────────────────

export async function crearCobro(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requirePermiso("cobros", "editar")
  const concepto = (formData.get("concepto") as string)?.trim()
  if (!concepto) return { error: "El concepto es obligatorio" }

  const montoStr = (formData.get("monto") as string)?.trim()
  const monto = montoStr ? parseFloat(montoStr) : NaN
  if (!monto || monto <= 0) return { error: "El monto debe ser mayor a cero" }

  const clienteId = (formData.get("clienteId") as string) || null
  const mascotaId = (formData.get("mascotaId") as string) || null
  const fechaStr = (formData.get("fecha") as string)?.trim()

  try {
    await prisma.cobro.create({
      data: {
        concepto,
        monto,
        metodoPago: toMetodoPago(formData.get("metodoPago")),
        fecha: fechaStr ? parseFechaLocal(fechaStr) : new Date(),
        clienteId,
        mascotaId,
        usuarioId: await getUsuarioId(),
        notas: (formData.get("notas") as string)?.trim() || null,
      },
    })
  } catch {
    return { error: "Error al registrar el cobro" }
  }
  await registrarActividad({
    accion: "Crear",
    modulo: "Finanzas",
    entidad: concepto,
    detalle: `Ingreso $${monto.toLocaleString("es-CO")}`,
  })
  revalidatePath("/finanzas")
  redirect("/finanzas/cobros?toast=created")
}

export async function actualizarCobro(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requirePermiso("cobros", "editar")
  const id = formData.get("id") as string
  const concepto = (formData.get("concepto") as string)?.trim()
  if (!concepto) return { error: "El concepto es obligatorio" }

  const montoStr = (formData.get("monto") as string)?.trim()
  const monto = montoStr ? parseFloat(montoStr) : NaN
  if (!monto || monto <= 0) return { error: "El monto debe ser mayor a cero" }

  const clienteId = (formData.get("clienteId") as string) || null
  const mascotaId = (formData.get("mascotaId") as string) || null
  const fechaStr = (formData.get("fecha") as string)?.trim()

  try {
    await prisma.cobro.update({
      where: { id },
      data: {
        concepto,
        monto,
        metodoPago: toMetodoPago(formData.get("metodoPago")),
        fecha: fechaStr ? parseFechaLocal(fechaStr) : undefined,
        clienteId,
        mascotaId,
        notas: (formData.get("notas") as string)?.trim() || null,
      },
    })
  } catch {
    return { error: "Error al actualizar el cobro" }
  }
  await registrarActividad({
    accion: "Editar",
    modulo: "Finanzas",
    entidad: concepto,
    detalle: `Ingreso $${monto.toLocaleString("es-CO")}`,
  })
  revalidatePath("/finanzas")
  redirect("/finanzas/cobros?toast=updated")
}

export async function eliminarCobro(id: string) {
  await requirePermiso("cobros", "eliminar")
  const cobro = await prisma.cobro.findUnique({ where: { id }, select: { concepto: true, monto: true } })
  await prisma.cobro.delete({ where: { id } })
  await registrarActividad({
    accion: "Eliminar",
    modulo: "Finanzas",
    entidad: cobro?.concepto ?? id,
    detalle: cobro ? `Ingreso $${cobro.monto.toLocaleString("es-CO")}` : undefined,
  })
  revalidatePath("/finanzas")
  redirect("/finanzas/cobros?toast=deleted")
}

// ── Egresos ───────────────────────────────────────────────────────────────────

export async function crearEgreso(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requirePermiso("egresos", "editar")
  const concepto = (formData.get("concepto") as string)?.trim()
  if (!concepto) return { error: "El concepto es obligatorio" }

  const montoStr = (formData.get("monto") as string)?.trim()
  const monto = montoStr ? parseFloat(montoStr) : NaN
  if (!monto || monto <= 0) return { error: "El monto debe ser mayor a cero" }

  const fechaStr = (formData.get("fecha") as string)?.trim()

  try {
    await prisma.egreso.create({
      data: {
        concepto,
        monto,
        categoria: toCategoriaEgreso(formData.get("categoria")),
        fecha: fechaStr ? parseFechaLocal(fechaStr) : new Date(),
        proveedor: (formData.get("proveedor") as string)?.trim() || null,
        usuarioId: await getUsuarioId(),
        notas: (formData.get("notas") as string)?.trim() || null,
      },
    })
  } catch {
    return { error: "Error al registrar el egreso" }
  }
  await registrarActividad({
    accion: "Crear",
    modulo: "Finanzas",
    entidad: concepto,
    detalle: `Egreso $${monto.toLocaleString("es-CO")}`,
  })
  revalidatePath("/finanzas")
  redirect("/finanzas/egresos?toast=created")
}

export async function actualizarEgreso(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requirePermiso("egresos", "editar")
  const id = formData.get("id") as string
  const concepto = (formData.get("concepto") as string)?.trim()
  if (!concepto) return { error: "El concepto es obligatorio" }

  const montoStr = (formData.get("monto") as string)?.trim()
  const monto = montoStr ? parseFloat(montoStr) : NaN
  if (!monto || monto <= 0) return { error: "El monto debe ser mayor a cero" }

  const fechaStr = (formData.get("fecha") as string)?.trim()

  try {
    await prisma.egreso.update({
      where: { id },
      data: {
        concepto,
        monto,
        categoria: toCategoriaEgreso(formData.get("categoria")),
        fecha: fechaStr ? parseFechaLocal(fechaStr) : undefined,
        proveedor: (formData.get("proveedor") as string)?.trim() || null,
        notas: (formData.get("notas") as string)?.trim() || null,
      },
    })
  } catch {
    return { error: "Error al actualizar el egreso" }
  }
  await registrarActividad({
    accion: "Editar",
    modulo: "Finanzas",
    entidad: concepto,
    detalle: `Egreso $${monto.toLocaleString("es-CO")}`,
  })
  revalidatePath("/finanzas")
  redirect("/finanzas/egresos?toast=updated")
}

export async function eliminarEgreso(id: string) {
  await requirePermiso("egresos", "eliminar")
  const egreso = await prisma.egreso.findUnique({ where: { id }, select: { concepto: true, monto: true } })
  await prisma.egreso.delete({ where: { id } })
  await registrarActividad({
    accion: "Eliminar",
    modulo: "Finanzas",
    entidad: egreso?.concepto ?? id,
    detalle: egreso ? `Egreso $${egreso.monto.toLocaleString("es-CO")}` : undefined,
  })
  revalidatePath("/finanzas")
  redirect("/finanzas/egresos?toast=deleted")
}
