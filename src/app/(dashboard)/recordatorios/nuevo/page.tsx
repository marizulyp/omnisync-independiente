import { prisma } from "@/lib/prisma"
import { NuevoRecordatorioForm } from "./NuevoRecordatorioForm"

export default async function NuevoRecordatorioPage() {
  const clientes = await prisma.cliente.findMany({
    orderBy: { nombre: "asc" },
    include: { fichas: { select: { id: true, nombre: true } } },
  })

  return <NuevoRecordatorioForm clientes={clientes} />
};