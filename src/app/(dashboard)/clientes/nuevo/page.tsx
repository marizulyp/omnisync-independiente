import { auth } from "@/auth"
import { NuevoClienteForm } from "./NuevoClienteForm"
import { requirePermisoPagina } from "@/lib/permisos-server"

export default async function NuevoClientePage() {
  await requirePermisoPagina("clientes", "editar")
  const session = await auth()
  const tipoNegocio = (session?.user as any)?.tipoNegocio || "veterinaria"

  return <NuevoClienteForm tipoNegocio={tipoNegocio} />
}