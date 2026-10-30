import { prisma } from "@/lib/prisma"
import { NuevaFormulaForm } from "./NuevaFormulaForm"
import { requirePermisoPagina } from "@/lib/permisos-server"

export default async function NuevaFormulaPage() {
  await requirePermisoPagina("formulas", "editar")
  const [mascotas, veterinarios] = await Promise.all([
    prisma.mascota.findMany({
      orderBy: { nombre: "asc" },
      select: {
        id: true,
        nombre: true,
        especie: true,
        raza: true,
        fechaNacimiento: true,
        peso: true,
        cliente: { select: { nombre: true } },
      },
    }),
    prisma.usuario.findMany({
      where: { activo: true, rol: { in: ["veterinario", "admin"] } },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    }),
  ])

  return <NuevaFormulaForm mascotas={mascotas} veterinarios={veterinarios} />
}
