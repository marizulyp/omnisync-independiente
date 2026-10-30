import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { NuevaDesparaForm } from "./NuevaDesparaForm"
import { requirePermisoPagina } from "@/lib/permisos-server"

export default async function NuevaDesparaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requirePermisoPagina("vacunas", "editar")
  const { id } = await params
  const mascota = await prisma.mascota.findUnique({ where: { id }, select: { nombre: true } })
  if (!mascota) notFound()
  return <NuevaDesparaForm mascotaId={id} mascotaNombre={mascota.nombre} />
}
