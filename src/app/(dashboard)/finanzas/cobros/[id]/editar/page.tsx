import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { EditarCobroForm } from "./EditarCobroForm"
import { requirePermisoPagina } from "@/lib/permisos-server"

export default async function EditarCobroPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  await requirePermisoPagina("cobros", "editar")
  const { id } = await params

  const [cobro, clientes] = await Promise.all([
    prisma.cobro.findUnique({ where: { id } }),
    prisma.cliente.findMany({
      orderBy: { nombre: "asc" },
      // Cambiamos mascotas por fichas para que coincida con el nuevo esquema
      include: { fichas: { select: { id: true, nombre: true } } },
    }),
  ])

  if (!cobro) notFound()

  return <EditarCobroForm cobro={cobro} clientes={clientes} />
};