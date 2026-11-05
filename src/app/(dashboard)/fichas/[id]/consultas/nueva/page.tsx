import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { NuevaConsultaForm } from "./NuevaConsultaForm"
import { requirePermisoPagina } from "@/lib/permisos-server"

export default async function NuevaConsultaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  // 1. Validamos permisos usando el módulo real: "atenciones"
  await requirePermisoPagina("atenciones", "editar")
  
  // 2. Extraemos el id asumiendo que representa la ficha médica
  const { id: fichaId } = await params
  
  // 3. Buscamos en la tabla Ficha, no en mascota
  const ficha = await prisma.ficha.findUnique({
    where: { id: fichaId },
    include: { cliente: { select: { nombre: true } } },
  })
  
  if (!ficha) notFound()
    
  // 4. Mantenemos los nombres de las props (mascotaId, mascotaNombre) 
  // para no romper el componente NuevaConsultaForm que está adentro.
  return <NuevaConsultaForm mascotaId={ficha.id} mascotaNombre={ficha.nombre} />
};