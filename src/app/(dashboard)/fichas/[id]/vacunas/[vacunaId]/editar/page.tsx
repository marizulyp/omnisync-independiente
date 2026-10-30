import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { EditarVacunaForm } from "./EditarVacunaForm"
import { requirePermisoPagina } from "@/lib/permisos-server"

export default async function EditarVacunaPage({
  params,
}: {
  params: Promise<{ id: string; vacunaId: string }>
}) {
  await requirePermisoPagina("vacunas", "editar")
  const { id: mascotaId, vacunaId } = await params
  const vacuna = await prisma.vacuna.findUnique({ where: { id: vacunaId } })
  if (!vacuna || vacuna.mascotaId !== mascotaId) notFound()
  return <EditarVacunaForm vacuna={vacuna} mascotaId={mascotaId} />
}
