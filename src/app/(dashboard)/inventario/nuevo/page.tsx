import { auth } from "@/auth"
import { NuevoProductoForm } from "./NuevoProductoForm"
import { requirePermisoPagina } from "@/lib/permisos-server"

export default async function NuevoProductoPage() {
  await requirePermisoPagina("inventario", "editar")
  
  const session = await auth()
  const tipoNegocio = (session?.user as any)?.tipoNegocio || "veterinaria"

  return <NuevoProductoForm tipoNegocio={tipoNegocio} />
}