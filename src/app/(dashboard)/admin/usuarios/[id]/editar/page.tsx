import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { EditarUsuarioForm } from "./EditarUsuarioForm"

export default async function EditarUsuarioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  if (session?.user.rol !== "admin") redirect("/")

  // 1. Averiguamos la industria del administrador actual
  const email = session.user.email ?? ""
  const usuarioDB = await prisma.usuario.findUnique({
    where: { email },
    select: { negocio: { select: { tipoNegocio: true } } }
  })
  const tipoNegocio = usuarioDB?.negocio?.tipoNegocio || "veterinaria"

  // 2. Buscamos el usuario a editar
  const { id } = await params
  const usuario = await prisma.usuario.findUnique({
    where: { id },
    include: { empleado: { select: { cargo: true } } },
  })
  if (!usuario) notFound()

  return <EditarUsuarioForm usuario={usuario} cargo={usuario.empleado?.cargo ?? ""} tipoNegocio={tipoNegocio} />
}