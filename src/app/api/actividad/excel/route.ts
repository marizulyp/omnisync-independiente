import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import * as XLSX from "xlsx"
import { CLINICA_ARCHIVO } from "@/config/clinica"

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (session.user.rol !== "admin") return NextResponse.json({ error: "No autorizado" }, { status: 403 })

  const { searchParams } = req.nextUrl
  const modulo = searchParams.get("modulo") ?? ""
  const accion = searchParams.get("accion") ?? ""
  const q = searchParams.get("q") ?? ""
  const desde = searchParams.get("desde") ?? ""
  const hasta = searchParams.get("hasta") ?? ""
  const usuario = searchParams.get("usuario") ?? ""

  const desdeDate = /^\d{4}-\d{2}-\d{2}$/.test(desde) ? new Date(`${desde}T00:00:00`) : undefined
  const hastaDate = /^\d{4}-\d{2}-\d{2}$/.test(hasta) ? new Date(`${hasta}T23:59:59.999`) : undefined

  const registros = await prisma.registroActividad.findMany({
    where: {
      ...(modulo ? { modulo } : {}),
      ...(accion ? { accion } : {}),
      ...(usuario ? { usuarioEmail: usuario } : {}),
      ...(q
        ? {
            OR: [
              { usuarioNombre: { contains: q, mode: "insensitive" } },
              { entidad: { contains: q, mode: "insensitive" } },
              { detalle: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
      ...(desdeDate || hastaDate
        ? { fecha: { ...(desdeDate ? { gte: desdeDate } : {}), ...(hastaDate ? { lte: hastaDate } : {}) } }
        : {}),
    },
    orderBy: { fecha: "desc" },
  })

  const ROL_LABEL: Record<string, string> = {
    admin: "Admin", veterinario: "Veterinario/a", recepcionista: "Recepcionista", enfermero: "Enfermero/a",
  }

  const filas = registros.map((r) => ({
    Fecha: r.fecha.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" }),
    Hora: r.fecha.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    Usuario: r.usuarioNombre,
    Email: r.usuarioEmail,
    Perfil: ROL_LABEL[r.usuarioRol] ?? r.usuarioRol,
    Acción: r.accion,
    Módulo: r.modulo,
    "Registro afectado": r.entidad,
    Detalle: r.detalle ?? "",
  }))

  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(filas)
  ws["!cols"] = [
    { wch: 12 }, { wch: 10 }, { wch: 22 }, { wch: 28 }, { wch: 14 },
    { wch: 10 }, { wch: 16 }, { wch: 28 }, { wch: 40 },
  ]
  XLSX.utils.book_append_sheet(wb, ws, "Actividad")

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
  const ahora = new Date()
  const ddmmaaaa = `${String(ahora.getDate()).padStart(2, "0")}${String(ahora.getMonth() + 1).padStart(2, "0")}${ahora.getFullYear()}`
  const hhmm = `${String(ahora.getHours()).padStart(2, "0")}${String(ahora.getMinutes()).padStart(2, "0")}`
  const nombreArchivo = `Actividad_${CLINICA_ARCHIVO}_${ddmmaaaa}_${hhmm}.xlsx`

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${nombreArchivo}"`,
    },
  })
}
