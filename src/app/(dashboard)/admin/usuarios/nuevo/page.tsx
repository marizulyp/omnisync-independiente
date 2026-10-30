import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { NuevoUsuarioForm } from "./NuevoUsuarioForm"

export default async function NuevoUsuarioPage() {
  const session = await auth()
  if (session?.user.rol !== "admin") redirect("/")
  
  // Averiguamos la industria del administrador actual
  const email = session.user.email ?? ""
  const usuarioDB = await prisma.usuario.findUnique({
    where: { email },
    select: { negocio: { select: { tipoNegocio: true } } }
  })
  
  const tipoNegocio = usuarioDB?.negocio?.tipoNegocio || "veterinaria"

  return <NuevoUsuarioForm tipoNegocio={tipoNegocio} />
}