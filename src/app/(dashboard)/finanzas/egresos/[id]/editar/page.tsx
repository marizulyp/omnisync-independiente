import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { EditarEgresoForm } from "./EditarEgresoForm"
import { requirePermisoPagina } from "@/lib/permisos-server"

export default async function EditarEgresoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requirePermisoPagina("egresos", "editar")
  const { id } = await params
  const egreso = await prisma.egreso.findUnique({ where: { id } })
  if (!egreso) notFound()
  return <EditarEgresoForm egreso={egreso} />
}
