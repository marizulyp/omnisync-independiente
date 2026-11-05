import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { NuevaVacunaForm } from "./NuevaVacunaForm"
import { requirePermisoPagina } from "@/lib/permisos-server"

export default async function NuevaVacunaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requirePermisoPagina("controles", "editar")
  
  const { id: fichaId } = await params
  
  const ficha = await prisma.ficha.findUnique({ 
    where: { id: fichaId }, 
    select: { id: true, nombre: true } 
  })
  
  if (!ficha) notFound()
    
  return <NuevaVacunaForm mascotaId={ficha.id} mascotaNombre={ficha.nombre} />
};