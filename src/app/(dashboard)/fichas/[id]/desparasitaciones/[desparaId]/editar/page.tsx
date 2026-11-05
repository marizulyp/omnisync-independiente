import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { EditarDesparaForm } from "./EditarDesparaForm"
import { requirePermisoPagina } from "@/lib/permisos-server"

export default async function EditarDesparaPage({
  params,
}: {
  params: Promise<{ id: string; desparaId: string }>
}) {
  // 1. Validamos el permiso con el módulo unificado correcto: "controles"
  await requirePermisoPagina("controles", "editar")
  
  // 2. Extraemos el id de la URL, que en realidad es la ficha médica
  const { id: fichaId, desparaId } = await params
  
  // 3. Buscamos usando el modelo correcto: controlPreventivo
  const despara = await prisma.controlPreventivo.findUnique({ 
    where: { id: desparaId } 
  })
  
  // 4. Validamos la seguridad contra fichaId
  if (!despara || despara.fichaId !== fichaId) notFound()
    
  // Le pasamos la fichaId al prop mascotaId para que el formulario hijo funcione perfecto
  return <EditarDesparaForm despara={despara} mascotaId={fichaId} />
}