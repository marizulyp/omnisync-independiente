import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { NuevaConsultaForm } from "./NuevaConsultaForm"
import { requirePermisoPagina } from "@/lib/permisos-server"

export default async function NuevaConsultaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requirePermisoPagina("consultas", "editar")
  const { id } = await params
  const mascota = await prisma.mascota.findUnique({
    where: { id },
    include: { cliente: { select: { nombre: true } } },
  })
  if (!mascota) notFound()
  return <NuevaConsultaForm mascotaId={id} mascotaNombre={mascota.nombre} />
}
