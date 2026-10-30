import { prisma } from "@/lib/prisma"
import { NuevoCobroForm } from "./NuevoCobroForm"
import { requirePermisoPagina } from "@/lib/permisos-server"

export default async function NuevoCobroPage() {
  await requirePermisoPagina("cobros", "editar")
  const clientes = await prisma.cliente.findMany({
    orderBy: { nombre: "asc" },
    include: { mascotas: { select: { id: true, nombre: true } } },
  })

  return <NuevoCobroForm clientes={clientes} />
}
