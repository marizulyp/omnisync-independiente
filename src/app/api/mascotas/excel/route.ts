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

  const fichas = await prisma.ficha.findMany({
    orderBy: { nombre: "asc" },
    include: {
      cliente: { select: { nombre: true, telefono: true, email: true } },
      atenciones: { orderBy: { fecha: "desc" }, take: 1, select: { fecha: true } },
    },
  })

  const filas = fichas.map((f) => {
    // Manejamos datosGenerales como un registro tipado sin forzar any
    const datos = f.datosGenerales && typeof f.datosGenerales === 'object' && !Array.isArray(f.datosGenerales)
      ? (f.datosGenerales as Record<string, any>) 
      : {}

    let edad = "—"
    let fechaNacimientoStr = ""
    
    if (datos.fechaNacimiento) {
      const fechaNacimiento = new Date(datos.fechaNacimiento)
      if (!isNaN(fechaNacimiento.getTime())) {
        fechaNacimientoStr = fechaNacimiento.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" })
        
        const hoy = new Date()
        let años = hoy.getFullYear() - fechaNacimiento.getFullYear()
        const meses = hoy.getMonth() - fechaNacimiento.getMonth()
        if (meses < 0 || (meses === 0 && hoy.getDate() < fechaNacimiento.getDate())) años--
        
        if (años === 0) {
          const m2 = meses < 0 ? 12 + meses : meses
          edad = `${m2} ${m2 === 1 ? "mes" : "meses"}`
        } else {
          edad = `${años} ${años === 1 ? "año" : "años"}`
        }
      }
    }

    return {
      Nombre: f.nombre,
      Tipo: ESPECIE_LABEL[f.tipo] ?? f.tipo,
      Raza: datos.raza ?? "",
      Edad: edad,
      "Fecha nacimiento": fechaNacimientoStr,
      "Dueño": f.cliente.nombre,
      "Tel. dueño": f.cliente.telefono ?? "",
      "Email dueño": f.cliente.email ?? "",
      "Última atención": f.atenciones[0]?.fecha
        ? f.atenciones[0].fecha.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" })
        : "Sin atenciones",
      "Última vacuna": "—",
      "Fecha última vacuna": "",
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
};