"use server"

import { prisma } from "@/lib/prisma"
import { requirePermiso } from "@/lib/permisos-server"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import type { MetodoPago } from "@/generated/prisma/client"
import { registrarActividad } from "@/lib/auditoria"
import { aplicarMovimientoTx, StockInsuficienteError } from "@/lib/inventario"

export type ActionState = { error?: string }

type ItemInput = {
  descripcion: string
  cantidad: number
  precioUnit: number
  productoId?: string | null
}

async function getUsuarioId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id ?? null
}

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

function condicionAMetodoPago(condicion: string): MetodoPago {
  if (condicion === "Transferencia" || condicion === "Consignación") return "transferencia"
  if (condicion === "Tarjeta") return "tarjeta"
  if (condicion === "Crédito") return "otro"
  return "efectivo"
}

export async function crearFactura(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  await requirePermiso("facturas", "editar")
  
  const clienteId = (formData.get("clienteId") as string) || null
  let fichaId = (formData.get("fichaId") as string) || null
  if (fichaId === "") fichaId = null 

  const condicion = (formData.get("condicion") as string) || "Contado"
  const observaciones = (formData.get("observaciones") as string)?.trim() || null
  const porcentajeIva = parseFloat((formData.get("porcentajeIva") as string) || "19")
  const itemsJson = formData.get("itemsJson") as string
  const negocioId = await getNegocioId()

  if (!negocioId) return { error: "Error de sesión: Negocio no identificado" }
  if (!Number.isFinite(porcentajeIva) || porcentajeIva < 0 || porcentajeIva > 100) {
    return { error: "El % de IVA debe estar entre 0 y 100" }
  }

  let items: ItemInput[] = []
  try {
    items = JSON.parse(itemsJson)
    if (!Array.isArray(items)) throw new Error()
  } catch {
    return { error: "Error en los ítems de la factura" }
  }

  const itemsValidos = items.filter(
    (i) =>
      i &&
      typeof i.descripcion === "string" && i.descripcion.trim() &&
      typeof i.cantidad === "number" && i.cantidad > 0 && Number.isFinite(i.cantidad) &&
      typeof i.precioUnit === "number" && i.precioUnit >= 0 && Number.isFinite(i.precioUnit)
  )
  if (itemsValidos.length === 0) return { error: "Agrega al menos un ítem con descripción y cantidad" }

  const lineas = itemsValidos.map((item, orden) => ({
    orden,
    descripcion: item.descripcion.trim().slice(0, 300),
    cantidad: item.cantidad,
    precioUnit: item.precioUnit,
    total: item.cantidad * item.precioUnit,
    productoId: typeof item.productoId === "string" && item.productoId ? item.productoId : null,
  }))
  const subtotal = lineas.reduce((acc, l) => acc + l.total, 0)
  const total = subtotal + subtotal * (porcentajeIva / 100)
  const usuarioId = await getUsuarioId()
  const productosVendidos = lineas.filter((l) => l.productoId).length

  let factura: { id: string; numero: number }
  try {
    factura = await prisma.$transaction(async (tx) => {
      const f = await tx.factura.create({
        data: {
          negocioId, // MURO DE CONTENCIÓN EN FACTURA
          clienteId, 
          fichaId,
          condicion, 
          observaciones, 
          porcentajeIva, 
          subtotal, 
          total, 
          usuarioId,
          items: { create: lineas },
        },
        include: { cliente: { select: { nombre: true } } },
      })
      const numeroStr = String(f.numero).padStart(4, "0")

      for (const l of lineas) {
        if (!l.productoId) continue
        await aplicarMovimientoTx(tx, {
          productoId: l.productoId,
          tipo: "salida",
          cantidad: l.cantidad,
          motivo: `Venta — Factura No. ${numeroStr}`,
          usuarioId,
          facturaId: f.id,
        })
      }

      await tx.cobro.create({
        data: {
          negocioId, // MURO DE CONTENCIÓN EN FINANZAS
          concepto: `Factura No. ${numeroStr} — ${f.cliente?.nombre ?? "Consumidor final"}`,
          monto: total,
          metodoPago: condicionAMetodoPago(condicion),
          fecha: f.fecha,
          clienteId,
          fichaId,
          usuarioId,
          facturaId: f.id,
          notas: `Ingreso generado automáticamente desde la Factura No. ${numeroStr}`,
        },
      })
      return { id: f.id, numero: f.numero }
    })
  } catch (e: any) {
    console.error("🔥 ERROR AL GUARDAR FACTURA:", e)
    if (e?.name === "StockInsuficienteError" || e instanceof StockInsuficienteError) return { error: e.message }
    const mensajeReal = e?.message ? e.message.split('\n').pop() : String(e)
    return { error: `🚨 BD Error: ${mensajeReal}` }
  }

  const numeroStr = String(factura.numero).padStart(4, "0")
  await registrarActividad({
    accion: "Crear",
    modulo: "Facturas",
    entidad: `Factura No. ${numeroStr}`,
    detalle: `Total: $${total.toLocaleString("es-CO")}` +
      (productosVendidos ? ` · ${productosVendidos} producto(s) descontado(s) del inventario` : ""),
  })
  revalidatePath("/facturas")
  revalidatePath("/inventario")
  revalidatePath("/finanzas")
  redirect(`/facturas/${factura.id}?toast=created`)
}

export async function eliminarFactura(id: string) {
  await requirePermiso("facturas", "eliminar")
  const usuarioId = await getUsuarioId()
  const negocioId = await getNegocioId()
  
  // Seguridad: Verificamos que la factura exista y pertenezca al negocio actual
  const factura = await prisma.factura.findFirst({ 
    where: { id, negocioId }, 
    include: { items: true } 
  })
  
  if (!factura) redirect("/facturas")
  const numeroStr = String(factura.numero).padStart(4, "0")
  const devueltos = factura.items.filter((i) => i.productoId)

  await prisma.$transaction(async (tx) => {
    for (const item of devueltos) {
      await aplicarMovimientoTx(tx, {
        productoId: item.productoId!,
        tipo: "entrada",
        cantidad: item.cantidad,
        motivo: `Anulación — Factura No. ${numeroStr}`,
        usuarioId,
      })
    }
    await tx.factura.delete({ where: { id } })
  })

  await registrarActividad({
    accion: "Eliminar",
    modulo: "Facturas",
    entidad: `Factura No. ${numeroStr}`,
    detalle: devueltos.length ? `${devueltos.length} producto(s) devuelto(s) al inventario` : undefined,
  })
  revalidatePath("/facturas")
  revalidatePath("/inventario")
  revalidatePath("/finanzas")
  redirect("/facturas?toast=deleted")
}