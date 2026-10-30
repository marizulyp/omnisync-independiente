import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { EditarConsultaForm } from "./EditarConsultaForm"
import { requirePermisoPagina } from "@/lib/permisos-server"

export default async function EditarConsultaPage({
  params,
}: {
  params: Promise<{ id: string; consultaId: string }>
}) {
  await requirePermisoPagina("consultas", "editar")
  const { id: mascotaId, consultaId } = await params
  const consulta = await prisma.consulta.findUnique({ where: { id: consultaId } })
  if (!consulta || consulta.mascotaId !== mascotaId) notFound()
  return <EditarConsultaForm consulta={consulta} mascotaId={mascotaId} />
}
