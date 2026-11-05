import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import * as XLSX from "xlsx"
import { CLINICA_ARCHIVO } from "@/config/clinica"
import { fechaLocalISO } from "@/lib/fechas"

function primerDiaMes() {
  const d = new Date()
  return fechaLocalISO(new Date(d.getFullYear(), d.getMonth(), 1))
}

function hoyISO() {
  return fechaLocalISO()
}

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n)
}

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (session.user.rol !== "admin") return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const { searchParams } = req.nextUrl
  const desdeParam = searchParams.get("desde") ?? ""
  const hastaParam = searchParams.get("hasta") ?? ""
  const desde = /^\d{4}-\d{2}-\d{2}$/.test(desdeParam) ? desdeParam : primerDiaMes()
  const hasta = /^\d{4}-\d{2}-\d{2}$/.test(hastaParam) ? hastaParam : hoyISO()

  const inicio = new Date(`${desde}T00:00:00`)
  const fin = new Date(`${hasta}T23:59:59.999`)
  const rango = { gte: inicio, lte: fin }

  const [cobros, egresos] = await Promise.all([
    prisma.cobro.findMany({
      where: { fecha: rango },
      orderBy: { fecha: "asc" },
      include: { cliente: { select: { nombre: true } }, ficha: { select: { nombre: true } } },
    }),
    prisma.egreso.findMany({
      where: { fecha: rango },
      orderBy: { fecha: "asc" },
    }),
  ])

  // Combinar y ordenar por fecha
  type Movimiento = {
    fecha: Date
    tipo: "Ingreso" | "Egreso"
    numero: string
    concepto: string
    cliente: string
    referencia: string
    metodo: string
    monto: number
    saldo: number
  }

  const movimientos: Movimiento[] = []

  cobros.forEach((c) => {
    movimientos.push({
      fecha: c.fecha,
      tipo: "Ingreso",
      numero: `ING-${String(c.numero).padStart(4, "0")}`,
      concepto: c.concepto,
      cliente: c.cliente?.nombre ?? "Consumidor final",
      referencia: c.ficha?.nombre ?? "",
      metodo: c.metodoPago,
      monto: c.monto,
      saldo: 0,
    })
  })

  egresos.forEach((e, idx) => {
    movimientos.push({
      fecha: e.fecha,
      tipo: "Egreso",
      numero: `EGR-${String(idx + 1).padStart(4, "0")}`,
      concepto: e.concepto,
      cliente: e.proveedor ?? "",
      referencia: e.categoria ?? "",
      metodo: "",
      monto: e.monto,
      saldo: 0,
    })
  })

  movimientos.sort((a, b) => a.fecha.getTime() - b.fecha.getTime())

  // Calcular saldo acumulado
  let saldo = 0
  movimientos.forEach((m) => {
    saldo += m.tipo === "Ingreso" ? m.monto : -m.monto
    m.saldo = saldo
  })

  const totalIngresos = cobros.reduce((acc, c) => acc + c.monto, 0)
  const totalEgresos = egresos.reduce((acc, e) => acc + e.monto, 0)
  const neto = totalIngresos - totalEgresos

  // ── Hoja 1: Extracto de movimientos ──────────────────────────────────────
  const filaExtracto = movimientos.map((m) => ({
    Fecha: m.fecha.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" }),
    Hora: m.fecha.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" }),
    "N° Documento": m.numero,
    Tipo: m.tipo,
    Concepto: m.concepto,
    "Cliente / Proveedor": m.cliente,
    Referencia: m.referencia,
    "Método de pago": m.metodo,
    "Ingreso (COP)": m.tipo === "Ingreso" ? m.monto : "",
    "Egreso (COP)": m.tipo === "Egreso" ? m.monto : "",
    "Saldo acumulado (COP)": m.saldo,
  }))

  const ingresoPromedio = cobros.length > 0 ? totalIngresos / cobros.length : 0
  const egresoPromedio = egresos.length > 0 ? totalEgresos / egresos.length : 0
  const mayorIngreso = cobros.length > 0 ? Math.max(...cobros.map((c) => c.monto)) : 0
  const mayorEgreso = egresos.length > 0 ? Math.max(...egresos.map((e) => e.monto)) : 0

  // ── Hoja 2: Resumen estilo banco ─────────────────────────────────────────
  const filaResumen = [
    { Concepto: "Período", Valor: `${desde} al ${hasta}` },
    { Concepto: "Generado el", Valor: new Date().toLocaleString("es-CO") },
    { Concepto: "", Valor: "" },
    { Concepto: "TOTAL ABONOS (Ingresos)", Valor: totalIngresos },
    { Concepto: "TOTAL CARGOS (Egresos)", Valor: totalEgresos },
    { Concepto: "SALDO NETO", Valor: neto },
    { Concepto: "", Valor: "" },
    { Concepto: "N° de ingresos", Valor: cobros.length },
    { Concepto: "N° de egresos", Valor: egresos.length },
    { Concepto: "N° movimientos total", Valor: movimientos.length },
    { Concepto: "", Valor: "" },
    { Concepto: "Ingreso promedio", Valor: ingresoPromedio },
    { Concepto: "Egreso promedio", Valor: egresoPromedio },
    { Concepto: "Mayor ingreso", Valor: mayorIngreso },
    { Concepto: "Mayor egreso", Valor: mayorEgreso },
  ]

  const wb = XLSX.utils.book_new()

  const wsExtracto = XLSX.utils.json_to_sheet(filaExtracto)
  wsExtracto["!cols"] = [
    { wch: 12 }, { wch: 8 }, { wch: 14 }, { wch: 10 }, { wch: 40 },
    { wch: 25 }, { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 22 },
  ]
  XLSX.utils.book_append_sheet(wb, wsExtracto, "Extracto")

  const wsResumen = XLSX.utils.json_to_sheet(filaResumen)
  wsResumen["!cols"] = [{ wch: 22 }, { wch: 25 }]
  XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen")

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })

  const nombreArchivo = `Informe_${CLINICA_ARCHIVO}_${desde}_${hasta}.xlsx`

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
    },
  })
};