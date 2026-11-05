import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { EditarMascotaForm } from "./EditarMascotaForm"
import { requirePermisoPagina } from "@/lib/permisos-server"

export default async function EditarMascotaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  // 1. Validamos permisos usando el módulo real: "fichas"
  await requirePermisoPagina("fichas", "editar")
  
  const { id } = await params
  
  // 2. Buscamos en la tabla ficha y obtenemos los clientes simultáneamente
  const [ficha, clientes] = await Promise.all([
    prisma.ficha.findUnique({ where: { id } }),
    prisma.cliente.findMany({ orderBy: { nombre: "asc" }, select: { id: true, nombre: true } }),
  ])
  
  if (!ficha) notFound()
    
  // 3. Pasamos la ficha al formulario que actualizamos en el paso anterior
  return <EditarMascotaForm ficha={ficha} clientes={clientes} />
};