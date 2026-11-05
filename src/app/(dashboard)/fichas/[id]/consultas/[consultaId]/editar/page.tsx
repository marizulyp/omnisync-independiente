import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { EditarConsultaForm } from "./EditarConsultaForm"
import { requirePermisoPagina } from "@/lib/permisos-server"

export default async function EditarConsultaPage({
  params,
}: {
  params: Promise<{ id: string; consultaId: string }>
}) {
  await requirePermisoPagina("atenciones", "editar")
  const { id: fichaId, consultaId } = await params
  const consulta = await prisma.atencion.findUnique({ where: { id: consultaId } })
  if (!consulta || consulta.fichaId !== fichaId) notFound()
  return <EditarConsultaForm consulta={consulta as any} mascotaId={fichaId} />
}
