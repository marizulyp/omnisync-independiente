import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { EditarClienteForm } from "./EditarClienteForm"
import { requirePermisoPagina } from "@/lib/permisos-server"

export default async function EditarClientePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requirePermisoPagina("clientes", "editar")
  const { id } = await params
  const cliente = await prisma.cliente.findUnique({ where: { id } })
  if (!cliente) notFound()
  return <EditarClienteForm cliente={cliente} />
}
