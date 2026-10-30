import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import * as XLSX from "xlsx"
import { CLINICA_ARCHIVO } from "@/config/clinica"

const CATEGORIA_LABEL: Record<string, string> = {
  medicamento: "Medicamento", alimento: "Alimento",
  accesorio: "Accesorio", higiene: "Higiene", otro: "Otro",
}

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n)
}

export async function GET() {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const productos = await prisma.producto.findMany({
    orderBy: [{ categoria: "asc" }, { nombre: "asc" }],
  })

  const filas = productos.map((p) => ({
    Nombre: p.nombre,
    Categoría: CATEGORIA_LABEL[p.categoria] ?? p.categoria,
    Notas: p.notas ?? "",
    Proveedor: p.proveedor ?? "",
    Stock: p.stock,
    "Stock mínimo": p.stockMinimo,
    "Alerta stock": p.stockMinimo > 0 && p.stock <= p.stockMinimo ? "⚠ Stock bajo" : "OK",
    "Precio costo (COP)": p.precioCosto ?? "",
    "Precio venta (COP)": p.precioVenta ?? "",
    "Valor en inventario (COP)":
      p.precioCosto != null ? formatCOP(p.stock * p.precioCosto) : "",
    "Última actualización": p.actualizadoEn
      ? p.actualizadoEn.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" })
      : "",
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(filas)
  ws["!cols"] = [
    { wch: 28 }, { wch: 14 }, { wch: 30 }, { wch: 22 }, { wch: 8 },
    { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 20 },
  ]
  XLSX.utils.book_append_sheet(wb, ws, "Inventario")

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
  const ahora = new Date()
  const ddmmaaaa = `${String(ahora.getDate()).padStart(2, "0")}${String(ahora.getMonth() + 1).padStart(2, "0")}${ahora.getFullYear()}`
  const hhmm = `${String(ahora.getHours()).padStart(2, "0")}${String(ahora.getMinutes()).padStart(2, "0")}`
  const nombreArchivo = `Inventario_${CLINICA_ARCHIVO}_${ddmmaaaa}_${hhmm}.xlsx`

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
    },
  })
}
