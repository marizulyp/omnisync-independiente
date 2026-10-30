import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { EditarCitaForm } from "./EditarCitaForm"
import { auth } from "@/auth"

export default async function EditarCitaPage({
  params,
}: {
  params: Promise<{ citaId: string }>
}) {
  const { citaId } = await params
  
  const session = await auth()
  const tipoNegocio = (session?.user as any)?.tipoNegocio || "veterinaria"

  const [cita, fichas, especialistas] = await Promise.all([
    prisma.cita.findUnique({ where: { id: citaId } }),
    prisma.ficha.findMany({
      orderBy: { nombre: "asc" },
      include: { cliente: { select: { nombre: true } } },
    }),
    prisma.usuario.findMany({
      where: { rol: "especialista", activo: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
  ])

  if (!cita) notFound()

  return (
    <EditarCitaForm 
      cita={cita} 
      fichas={fichas} 
      especialistas={especialistas} 
      tipoNegocio={tipoNegocio}
    />
  )
}