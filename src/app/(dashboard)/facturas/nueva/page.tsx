import { prisma } from "@/lib/prisma"
import { NuevaFacturaForm } from "./NuevaFacturaForm"
import { requirePermisoPagina } from "@/lib/permisos-server"
import { auth } from "@/auth"

export default async function NuevaFacturaPage() {
  await requirePermisoPagina("facturas", "editar")
  const session = await auth()
  
  // 1. EXTRACCIÓN SEGURA DEL NEGOCIO
  const email = session?.user?.email ?? ""
  const usuarioDB = await prisma.usuario.findUnique({
    where: { email },
    select: { negocioId: true, negocio: { select: { tipoNegocio: true } } }
  })
  
  const negocioId = usuarioDB?.negocioId
  const tipoNegocio = usuarioDB?.negocio?.tipoNegocio || "veterinaria"

  if (!negocioId) {
    return <div className="p-8 text-center text-red-500">Error: Usuario sin negocio asignado.</div>
  }

  // 2. EL MURO DE CONTENCIÓN: Solo traemos clientes y productos de ESTE negocio
  const [clientes, productos] = await Promise.all([
    prisma.cliente.findMany({
      where: { negocioId }, // ¡CANDADO APLICADO AQUÍ!
      orderBy: { nombre: "asc" },
      select: {
        id: true,
        nombre: true,
        identificacion: true,
        direccion: true,
        fichas: { select: { id: true, nombre: true }, orderBy: { nombre: "asc" } },
      },
    }),
    prisma.producto.findMany({
      where: { negocioId }, // ¡CANDADO APLICADO AQUÍ!
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, unidad: true, stock: true, precioVenta: true },
    })
  ])

  return <NuevaFacturaForm clientes={clientes} productos={productos} tipoNegocio={tipoNegocio} />
}