import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import * as XLSX from "xlsx"
import { CLINICA_ARCHIVO } from "@/config/clinica"

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const clientes = await prisma.cliente.findMany({
    orderBy: { nombre: "asc" },
    include: {
      _count: { select: { mascotas: true } },
      mascotas: { select: { nombre: true, especie: true }, orderBy: { nombre: "asc" } },
    },
  })

  const ESPECIE_LABEL: Record<string, string> = {
    perro: "Perro", gato: "Gato", ave: "Ave",
    conejo: "Conejo", reptil: "Reptil", otro: "Otro",
  }

  const filas = clientes.map((c) => ({
    Nombre: c.nombre,
    Identificación: c.identificacion ?? "",
    Teléfono: c.telefono ?? "",
    Email: c.email ?? "",
    Dirección: c.direccion ?? "",
    "N° mascotas": c._count.mascotas,
    Mascotas: c.mascotas
      .map((m) => `${m.nombre} (${ESPECIE_LABEL[m.especie] ?? m.especie})`)
      .join(", "),
    "Registrado el": c.creadoEn
      ? c.creadoEn.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" })
      : "",
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(filas)
  ws["!cols"] = [
    { wch: 28 }, { wch: 16 }, { wch: 14 }, { wch: 28 },
    { wch: 30 }, { wch: 12 }, { wch: 40 }, { wch: 14 },
  ]
  XLSX.utils.book_append_sheet(wb, ws, "Clientes")

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
  const ahora = new Date()
  const ddmmaaaa = `${String(ahora.getDate()).padStart(2, "0")}${String(ahora.getMonth() + 1).padStart(2, "0")}${ahora.getFullYear()}`
  const hhmm = `${String(ahora.getHours()).padStart(2, "0")}${String(ahora.getMinutes()).padStart(2, "0")}`
  const nombreArchivo = `Clientes_${CLINICA_ARCHIVO}_${ddmmaaaa}_${hhmm}.xlsx`

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
    },
  })
}
