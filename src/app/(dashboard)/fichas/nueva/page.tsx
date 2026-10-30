import { prisma } from "@/lib/prisma"
import { NuevaMascotaForm } from "./NuevaMascotaForm"
import { requirePermisoPagina } from "@/lib/permisos-server"
import { auth } from "@/auth"

export default async function NuevaMascotaPage({
  searchParams,
}: {
  searchParams: Promise<{ clienteId?: string }>
}) {
  await requirePermisoPagina("fichas", "editar")
  
  const session = await auth()
  const email = session?.user?.email ?? ""
  
  // EXTRACCIÓN SEGURA: Consultamos la BD real, no confiamos solo en la sesión temporal
  const usuarioDb = await prisma.usuario.findUnique({
    where: { email },
    select: { negocio: { select: { tipoNegocio: true } } }
  })
  
  // Si no encuentra nada, ahí sí usa veterinaria por defecto
  const tipoNegocio = usuarioDb?.negocio?.tipoNegocio || (session?.user as any)?.tipoNegocio || "veterinaria"
  
  const { clienteId } = await searchParams
  
  const clientes = await prisma.cliente.findMany({
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true },
  })
  
  return <NuevaMascotaForm clientes={clientes} defaultClienteId={clienteId} tipoNegocio={tipoNegocio} />
}