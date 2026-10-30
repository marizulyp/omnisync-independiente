import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import * as XLSX from "xlsx"
import { CLINICA_ARCHIVO } from "@/config/clinica"

function hoyISO() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function lunesDeSemana(iso: string) {
  const d = new Date(`${iso}T12:00:00`)
  const dow = d.getDay()
  const back = dow === 0 ? 6 : dow - 1
  d.setDate(d.getDate() - back)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

function sumarDias(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + n)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { searchParams } = req.nextUrl
  const fechaParam = searchParams.get("fecha") ?? ""
  const vista = searchParams.get("vista") === "dia" ? "dia" : "semana"
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(fechaParam) ? fechaParam : hoyISO()

  let inicio: Date
  let fin: Date
  let etiqueta: string

  if (vista === "dia") {
    inicio = new Date(`${fecha}T00:00:00`)
    fin = new Date(`${fecha}T23:59:59.999`)
    const d = new Date(`${fecha}T12:00:00`)
    etiqueta = d.toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  } else {
    const lunes = lunesDeSemana(fecha)
    const domingo = sumarDias(lunes, 6)
    inicio = new Date(`${lunes}T00:00:00`)
    fin = new Date(`${domingo}T23:59:59.999`)
    const dl = new Date(`${lunes}T12:00:00`)
    const dd = new Date(`${domingo}T12:00:00`)
    etiqueta = `${dl.toLocaleDateString("es-CO", { day: "numeric", month: "short" })} – ${dd.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" })}`
  }

  const citas = await prisma.cita.findMany({
    where: { fecha: { gte: inicio, lte: fin } },
    orderBy: { fecha: "asc" },
    include: {
      mascota: { include: { cliente: { select: { nombre: true, telefono: true } } } },
      veterinario: { select: { nombre: true } },
    },
  })

  const ESTADO_LABEL: Record<string, string> = {
    pendiente: "Pendiente", confirmada: "Confirmada", cancelada: "Cancelada", atendida: "Atendida",
  }
  const TIPO_LABEL: Record<string, string> = {
    consulta: "Consulta", cirugia: "Cirugía", vacunacion: "Vacunación", control: "Control",
  }

  const filas = citas.map((c) => ({
    Fecha: c.fecha.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" }),
    Hora: c.fecha.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
    Paciente: c.mascota.nombre,
    "Dueño": c.mascota.cliente.nombre,
    Teléfono: c.mascota.cliente.telefono ?? "",
    Tipo: TIPO_LABEL[c.tipo] ?? c.tipo,
    Estado: ESTADO_LABEL[c.estado] ?? c.estado,
    Veterinario: c.veterinario?.nombre ?? "Sin asignar",
    Motivo: c.motivo ?? "",
    Notas: c.notas ?? "",
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(filas)
  ws["!cols"] = [
    { wch: 12 }, { wch: 8 }, { wch: 20 }, { wch: 25 }, { wch: 14 },
    { wch: 14 }, { wch: 13 }, { wch: 25 }, { wch: 30 }, { wch: 30 },
  ]
  XLSX.utils.book_append_sheet(wb, ws, `Citas ${vista === "dia" ? "día" : "semana"}`)

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
  const fmt = (iso: string) => iso.split("-").reverse().join("")
  const ahora = new Date()
  const hhmm = `${String(ahora.getHours()).padStart(2, "0")}${String(ahora.getMinutes()).padStart(2, "0")}`
  const nombreArchivo = `Agenda_${CLINICA_ARCHIVO}_${fmt(fecha)}_${hhmm}.xlsx`

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
    },
  })
}
