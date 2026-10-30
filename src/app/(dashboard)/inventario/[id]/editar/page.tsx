import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { EditarProductoForm } from "./EditarProductoForm"
import { requirePermisoPagina } from "@/lib/permisos-server"

export default async function EditarProductoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requirePermisoPagina("inventario", "editar")
  const { id } = await params
  const producto = await prisma.producto.findUnique({ where: { id } })
  if (!producto) notFound()
  return <EditarProductoForm producto={producto} />
}
