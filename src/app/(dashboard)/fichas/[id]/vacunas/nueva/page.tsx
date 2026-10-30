import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { NuevaVacunaForm } from "./NuevaVacunaForm"
import { requirePermisoPagina } from "@/lib/permisos-server"

export default async function NuevaVacunaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requirePermisoPagina("vacunas", "editar")
  const { id } = await params
  const mascota = await prisma.mascota.findUnique({ where: { id }, select: { nombre: true } })
  if (!mascota) notFound()
  return <NuevaVacunaForm mascotaId={id} mascotaNombre={mascota.nombre} />
}
