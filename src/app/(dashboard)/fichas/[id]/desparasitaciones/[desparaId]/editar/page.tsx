import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { EditarDesparaForm } from "./EditarDesparaForm"
import { requirePermisoPagina } from "@/lib/permisos-server"

export default async function EditarDesparaPage({
  params,
}: {
  params: Promise<{ id: string; desparaId: string }>
}) {
  await requirePermisoPagina("vacunas", "editar")
  const { id: mascotaId, desparaId } = await params
  const despara = await prisma.desparasitacion.findUnique({ where: { id: desparaId } })
  if (!despara || despara.mascotaId !== mascotaId) notFound()
  return <EditarDesparaForm despara={despara} mascotaId={mascotaId} />
}
