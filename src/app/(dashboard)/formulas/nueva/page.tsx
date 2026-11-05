import { prisma } from "@/lib/prisma"
import { NuevaFormulaForm } from "./NuevaFormulaForm"
import { requirePermisoPagina } from "@/lib/permisos-server"

export default async function NuevaFormulaPage() {
  await requirePermisoPagina("recomendaciones", "editar")
  
  const [fichas, especialistas] = await Promise.all([
    prisma.ficha.findMany({
      orderBy: { nombre: "asc" },
      select: {
        id: true,
        nombre: true,
        tipo: true,
        datosGenerales: true,
        cliente: { select: { nombre: true } },
      },
    }),
    prisma.usuario.findMany({
      where: { activo: true, rol: { in: ["especialista", "admin"] } },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
  ])

  return <NuevaFormulaForm fichas={fichas} especialistas={especialistas} />
}