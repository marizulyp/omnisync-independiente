import { notFound, redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { EditarEmpleadoForm } from "./EditarEmpleadoForm"

export default async function EditarEmpleadoPage({
  params,
}: {
  params: Promise<{ usuarioId: string }>
}) {
  const session = await auth()
  if (session?.user.rol !== "admin") redirect("/")

  const { usuarioId } = await params
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    include: { empleado: true },
  })
  if (!usuario) notFound()

  return <EditarEmpleadoForm usuario={usuario} empleado={usuario.empleado} />
}
