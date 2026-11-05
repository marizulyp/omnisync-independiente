import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { NuevaDesparaForm } from "./NuevaDesparaForm"
import { requirePermisoPagina } from "@/lib/permisos-server"

export default async function NuevaDesparaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  // 1. Validamos permisos usando el módulo real: "controles"
  await requirePermisoPagina("controles", "editar")
  
  // 2. Extraemos el id asumiendo que representa la ficha médica
  const { id: fichaId } = await params
  
  // 3. Buscamos en la tabla Ficha, no en mascota
  const ficha = await prisma.ficha.findUnique({ 
    where: { id: fichaId }, 
    select: { id: true, nombre: true } 
  })
  
  if (!ficha) notFound()
    
  // 4. Mantenemos los nombres de las props (mascotaId, mascotaNombre) 
  // para no romper el componente NuevaDesparaForm que está adentro.
  return <NuevaDesparaForm mascotaId={ficha.id} mascotaNombre={ficha.nombre} />
};