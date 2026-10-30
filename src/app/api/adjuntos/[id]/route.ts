import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { registrarActividad } from "@/lib/auditoria"
import { puedeEliminarAdjunto } from "@/lib/permisos"
import { readFile, unlink } from "fs/promises"
import path from "path"

const UPLOADS_DIR = path.join(process.cwd(), "uploads", "adjuntos")
const TIPOS_SERVIBLES = ["image/jpeg", "image/jpg", "image/png", "application/pdf"]

function filePath(id: string, ext: string) {
  const ruta = path.resolve(UPLOADS_DIR, `${id}.${ext}`)
  // Defensa ante extensiones antiguas guardadas sin validar
  if (!ruta.startsWith(UPLOADS_DIR + path.sep)) throw new Error("Ruta inválida")
  return ruta
}

function contentDisposition(nombre: string) {
  const ascii = nombre.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "")
  return `inline; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(nombre)}`
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })

  const { id } = await params
  const adjunto = await prisma.adjunto.findUnique({ where: { id } })
  if (!adjunto) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  try {
    const buffer = await readFile(filePath(adjunto.id, adjunto.extension))
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": TIPOS_SERVIBLES.includes(adjunto.tipo) ? adjunto.tipo : "application/octet-stream",
        "Content-Disposition": contentDisposition(adjunto.nombre),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, max-age=3600",
      },
    })
  } catch {
    return NextResponse.json({ error: "Archivo no encontrado en disco" }, { status: 404 })
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!puedeEliminarAdjunto(session.user.rol)) {
    return NextResponse.json({ error: "No tienes permiso para eliminar documentos" }, { status: 403 })
  }

  const { id } = await params
  const adjunto = await prisma.adjunto.findUnique({
    where: { id },
    include: { mascota: { select: { nombre: true } } },
  })
  if (!adjunto) return NextResponse.json({ error: "No encontrado" }, { status: 404 })

  try { await unlink(filePath(adjunto.id, adjunto.extension)) } catch { /* ya eliminado */ }
  await prisma.adjunto.delete({ where: { id } })

  await registrarActividad({
    accion: "Eliminar",
    modulo: "Adjuntos",
    entidad: adjunto.mascota.nombre,
    detalle: `Archivo: ${adjunto.nombre}`,
  })

  return NextResponse.json({ ok: true })
}
