import type { Prisma, PrismaClient } from "@/generated/prisma/client"

export type TipoMovimiento = "entrada" | "salida" | "ajuste"

export const TIPOS_MOVIMIENTO: TipoMovimiento[] = ["entrada", "salida", "ajuste"]

export class StockInsuficienteError extends Error {
  constructor(producto?: { nombre: string; stock: number; unidad: string }) {
    super(
      producto
        ? `No hay suficiente stock de "${producto.nombre}" (disponible: ${producto.stock} ${producto.unidad})`
        : "No hay suficiente stock para esta salida"
    )
  }
}

type DatosMovimiento = {
  productoId: string
  tipo: TipoMovimiento
  cantidad: number
  motivo: string | null
  usuarioId: string | null
  facturaId?: string | null
}

// Registra un movimiento y actualiza el stock dentro de una transacción ya abierta.
// La suma/resta la hace la base de datos en una sola sentencia (no "leer, calcular
// y guardar"), así dos equipos que registran movimientos del mismo producto al
// mismo tiempo no se pisan. La salida solo se aplica si hay stock suficiente.
export async function aplicarMovimientoTx(tx: Prisma.TransactionClient, datos: DatosMovimiento) {
  const { productoId, tipo, cantidad, motivo, usuarioId, facturaId = null } = datos

  if (tipo === "salida") {
    const { count } = await tx.producto.updateMany({
      where: { id: productoId, stock: { gte: cantidad } },
      data: { stock: { decrement: cantidad } },
    })
    if (count === 0) {
      const producto = await tx.producto.findUnique({
        where: { id: productoId },
        select: { nombre: true, stock: true, unidad: true },
      })
      throw new StockInsuficienteError(producto ?? undefined)
    }
  } else {
    await tx.producto.update({
      where: { id: productoId },
      data: { stock: tipo === "entrada" ? { increment: cantidad } : cantidad },
    })
  }

  await tx.movimientoInventario.create({
    data: { productoId, tipo, cantidad, motivo, usuarioId, facturaId },
  })

  return tx.producto.findUniqueOrThrow({
    where: { id: productoId },
    select: { nombre: true, stock: true },
  })
}

// Igual que aplicarMovimientoTx, en su propia transacción.
export async function aplicarMovimiento(db: PrismaClient, datos: DatosMovimiento) {
  return db.$transaction((tx) => aplicarMovimientoTx(tx, datos))
}
