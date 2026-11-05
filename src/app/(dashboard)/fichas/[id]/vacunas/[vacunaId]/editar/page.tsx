import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { EditarVacunaForm } from "./EditarVacunaForm"
import { requirePermisoPagina } from "@/lib/permisos-server"

export default async function EditarVacunaPage({
  params,
}: {
  params: Promise<{ id: string; vacunaId: string }>
}) {
  await requirePermisoPagina("controles", "editar")
  
  const { id: fichaId, vacunaId } = await params
  
  const vacuna = await prisma.controlPreventivo.findUnique({ 
    where: { id: vacunaId } 
  })
  
  if (!vacuna || vacuna.fichaId !== fichaId) notFound()
    
  return <EditarVacunaForm vacuna={vacuna} mascotaId={fichaId} />
};