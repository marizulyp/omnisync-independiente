import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { EditarMascotaForm } from "./EditarMascotaForm"
import { requirePermisoPagina } from "@/lib/permisos-server"

export default async function EditarMascotaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requirePermisoPagina("mascotas", "editar")
  const { id } = await params
  const [mascota, clientes] = await Promise.all([
    prisma.mascota.findUnique({ where: { id } }),
    prisma.cliente.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
  ])
  if (!mascota) notFound()
  return <EditarMascotaForm mascota={mascota} clientes={clientes} />
}
