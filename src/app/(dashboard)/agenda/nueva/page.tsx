import { prisma } from "@/lib/prisma"
import { NuevaCitaForm } from "./NuevaCitaForm"
import { auth } from "@/auth"

export default async function NuevaCitaPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string; fichaId?: string }>
}) {
  const { fecha, fichaId } = await searchParams
  const session = await auth()
  const tipoNegocio = (session?.user as any)?.tipoNegocio || "veterinaria"

  const [fichas, especialistas] = await Promise.all([
    prisma.ficha.findMany({
      orderBy: { nombre: "asc" },
      include: { cliente: { select: { nombre: true } } },
    }),
    prisma.usuario.findMany({
      where: { rol: "especialista", activo: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
  ])

  return (
    <NuevaCitaForm
      fichas={fichas}
      especialistas={especialistas}
      defaultFecha={fecha}
      defaultFichaId={fichaId}
      tipoNegocio={tipoNegocio}
    />
  )
}