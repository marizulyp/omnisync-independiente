import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import * as XLSX from "xlsx"
import { CLINICA_ARCHIVO } from "@/config/clinica"

const ESPECIE_LABEL: Record<string, string> = {
  perro: "Perro", gato: "Gato", ave: "Ave",
  conejo: "Conejo", reptil: "Reptil", otro: "Otro",
}

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const mascotas = await prisma.mascota.findMany({
    orderBy: { nombre: "asc" },
    include: {
      cliente: { select: { nombre: true, telefono: true, email: true } },
      consultas: { orderBy: { fecha: "desc" }, take: 1, select: { fecha: true } },
      vacunas: { orderBy: { fecha: "desc" }, take: 1, select: { fecha: true, nombre: true } },
    },
  })

  const filas = mascotas.map((m) => {
    let edad = "—"
    if (m.fechaNacimiento) {
      const hoy = new Date()
      let años = hoy.getFullYear() - m.fechaNacimiento.getFullYear()
      const meses = hoy.getMonth() - m.fechaNacimiento.getMonth()
      if (meses < 0 || (meses === 0 && hoy.getDate() < m.fechaNacimiento.getDate())) años--
      if (años === 0) {
        const m2 = meses < 0 ? 12 + meses : meses
        edad = `${m2} ${m2 === 1 ? "mes" : "meses"}`
      } else {
        edad = `${años} ${años === 1 ? "año" : "años"}`
      }
    }
    return {
      Nombre: m.nombre,
      Especie: ESPECIE_LABEL[m.especie] ?? m.especie,
      Raza: m.raza ?? "",
      Edad: edad,
      "Fecha nacimiento": m.fechaNacimiento
        ? m.fechaNacimiento.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" })
        : "",
      "Dueño": m.cliente.nombre,
      "Tel. dueño": m.cliente.telefono ?? "",
      "Email dueño": m.cliente.email ?? "",
      "Última consulta": m.consultas[0]?.fecha
        ? m.consultas[0].fecha.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" })
        : "Sin consultas",
      "Última vacuna": m.vacunas[0]?.nombre ?? "Sin vacunas",
      "Fecha última vacuna": m.vacunas[0]?.fecha
        ? m.vacunas[0].fecha.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" })
        : "",
    }
  })

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(filas)
  ws["!cols"] = [
    { wch: 20 }, { wch: 10 }, { wch: 18 }, { wch: 12 }, { wch: 16 },
    { wch: 25 }, { wch: 14 }, { wch: 25 }, { wch: 16 }, { wch: 20 }, { wch: 18 },
  ]
  XLSX.utils.book_append_sheet(wb, ws, "Pacientes")

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
  const ahora = new Date()
  const ddmmaaaa = `${String(ahora.getDate()).padStart(2, "0")}${String(ahora.getMonth() + 1).padStart(2, "0")}${ahora.getFullYear()}`
  const hhmm = `${String(ahora.getHours()).padStart(2, "0")}${String(ahora.getMinutes()).padStart(2, "0")}`
  const nombreArchivo = `Pacientes_${CLINICA_ARCHIVO}_${ddmmaaaa}_${hhmm}.xlsx`

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
    },
  })
}
