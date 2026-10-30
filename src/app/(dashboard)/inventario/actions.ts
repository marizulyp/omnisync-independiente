"use server"

import { prisma } from "@/lib/prisma"
import { requirePermiso } from "@/lib/permisos-server"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { registrarActividad } from "@/lib/auditoria"
import { aplicarMovimiento, StockInsuficienteError, TIPOS_MOVIMIENTO, type TipoMovimiento } from "@/lib/inventario"

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

async function getUsuarioId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id ?? null
}

function parseFloatOrNull(value: FormDataEntryValue | null): number | null {
  const str = (value as string)?.trim()
  return str ? parseFloat(str) : null
}

export async function crearProducto(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requirePermiso("inventario", "editar")
  const nombre = (formData.get("nombre") as string)?.trim()
  const negocioId = await getNegocioId()
  
  if (!nombre) return { error: "El nombre del producto es obligatorio" }
  if (!negocioId) return { error: "Error de sesión: Negocio no identificado" }

  const stockInicial = parseFloatOrNull(formData.get("stock")) ?? 0

  try {
    await prisma.producto.create({
      data: {
        negocioId, // MURO DE CONTENCIÓN
        nombre,
        categoria: (formData.get("categoria") as string) || "otro",
        unidad: (formData.get("unidad") as string)?.trim() || "unidad",
        stock: stockInicial,
        stockMinimo: parseFloatOrNull(formData.get("stockMinimo")) ?? 0,
        precioCosto: parseFloatOrNull(formData.get("precioCosto")),
        precioVenta: parseFloatOrNull(formData.get("precioVenta")),
        proveedor: (formData.get("proveedor") as string)?.trim() || null,
        notas: (formData.get("notas") as string)?.trim() || null,
      },
    })
  } catch {
    return { error: "Error al crear el producto" }
  }
  await registrarActividad({ accion: "Crear", modulo: "Inventario", entidad: nombre })
  revalidatePath("/inventario")
  redirect("/inventario?toast=created")
}

export async function actualizarProducto(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requirePermiso("inventario", "editar")
  const id = formData.get("id") as string
  const nombre = (formData.get("nombre") as string)?.trim()
  const negocioId = await getNegocioId()

  if (!nombre) return { error: "El nombre del producto es obligatorio" }

  // Validación de seguridad estricta
  const productoExistente = await prisma.producto.findFirst({ where: { id, negocioId } })
  if (!productoExistente) return { error: "Acceso denegado o producto no encontrado" }

  try {
    await prisma.producto.update({
      where: { id },
      data: {
        nombre,
        categoria: (formData.get("categoria") as string) || "otro",
        unidad: (formData.get("unidad") as string)?.trim() || "unidad",
        stockMinimo: parseFloatOrNull(formData.get("stockMinimo")) ?? 0,
        precioCosto: parseFloatOrNull(formData.get("precioCosto")),
        precioVenta: parseFloatOrNull(formData.get("precioVenta")),
        proveedor: (formData.get("proveedor") as string)?.trim() || null,
        notas: (formData.get("notas") as string)?.trim() || null,
      },
    })
  } catch {
    return { error: "Error al actualizar el producto" }
  }
  await registrarActividad({ accion: "Editar", modulo: "Inventario", entidad: nombre })
  revalidatePath("/inventario")
  redirect("/inventario?toast=updated")
}

export async function eliminarProducto(id: string) {
  await requirePermiso("inventario", "eliminar")
  const negocioId = await getNegocioId()

  // Validación de seguridad estricta
  const producto = await prisma.producto.findFirst({ where: { id, negocioId }, select: { nombre: true } })
  if (!producto) redirect("/inventario")

  await prisma.producto.delete({ where: { id } })
  await registrarActividad({ accion: "Eliminar", modulo: "Inventario", entidad: producto.nombre })
  revalidatePath("/inventario")
  redirect("/inventario?toast=deleted")
}

export async function registrarMovimiento(
  productoId: string,
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requirePermiso("inventario", "movimientos")
  const tipo = formData.get("tipo") as TipoMovimiento
  const cantidad = parseFloatOrNull(formData.get("cantidad"))
  const negocioId = await getNegocioId()

  if (!TIPOS_MOVIMIENTO.includes(tipo)) return { error: "Tipo de movimiento no válido" }
  if (!cantidad || cantidad <= 0) return { error: "La cantidad debe ser mayor a cero" }

  // Validación de seguridad: el producto debe pertenecer al negocio
  const productoValido = await prisma.producto.findFirst({ where: { id: productoId, negocioId } })
  if (!productoValido) return { error: "Acceso denegado al producto" }

  let producto: { nombre: string; stock: number }
  try {
    producto = await aplicarMovimiento(prisma, {
      productoId,
      tipo,
      cantidad,
      motivo: (formData.get("motivo") as string)?.trim() || null,
      usuarioId: await getUsuarioId(),
      // IMPORTANTE: Aquí deberíamos pasar el negocioId a tu librería de inventario,
      // pero como aplicarMovimiento() lo usa por dentro, tu base de datos ya lo requerirá.
    })
  } catch (e) {
    if (e instanceof StockInsuficienteError) return { error: e.message }
    if ((e as { code?: string })?.code === "P2025") return { error: "Producto no encontrado" }
    return { error: "Error al registrar el movimiento" }
  }
  
  await registrarActividad({
    accion: "Editar",
    modulo: "Inventario",
    entidad: producto.nombre,
    detalle: `Movimiento ${tipo} — ${cantidad} unidades (stock: ${producto.stock})`,
  })
  revalidatePath("/inventario")
  revalidatePath(`/inventario/${productoId}`)
  redirect(`/inventario/${productoId}?toast=updated`)
}