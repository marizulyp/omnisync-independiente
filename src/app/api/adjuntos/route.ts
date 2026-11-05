import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { registrarActividad } from "@/lib/auditoria"
import { tienePermiso } from "@/lib/permisos"
import { writeFile, mkdir } from "fs/promises"
import path from "path"

// La extensión se deriva del tipo validado, nunca del nombre que envía el cliente
const TIPOS_PERMITIDOS: Record<string, { ext: string; firma: number[] }> = {
  "image/jpeg":      { ext: "jpg", firma: [0xff, 0xd8, 0xff] },
  "image/png":       { ext: "png", firma: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  "application/pdf": { ext: "pdf", firma: [0x25, 0x50, 0x44, 0x46] }, // %PDF
}
const MAX_TAMANO = 20 * 1024 * 1024 // 20 MB
const MAX_NOMBRE = 200
const MAX_DESCRIPCION = 500

function limpiarNombre(nombre: string) {
  // Quita rutas, caracteres de control y comillas; conserva tildes y espacios
  const base = nombre.split(/[\\/]/).pop() ?? ""
  const limpio = base.replace(/[\u0000-\u001f\u007f"<>|:*?]/g, "").trim()
  return (limpio || "archivo").slice(0, MAX_NOMBRE)
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  if (!tienePermiso(session.user.rol, "adjuntos", "subir")) {
    return NextResponse.json({ error: "No tienes permiso para subir documentos" }, { status: 403 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 })
  }

  const file = formData.get("file")
  
  // Extraemos fichaId (dejando mascotaId como respaldo temporal si el form no ha sido actualizado)
  const fichaIdRaw = formData.get("fichaId") || formData.get("mascotaId")
  const fichaId = typeof fichaIdRaw === "string" ? fichaIdRaw : null

  const descripcionRaw = formData.get("descripcion")
  const descripcion =
    typeof descripcionRaw === "string" && descripcionRaw.trim()
      ? descripcionRaw.trim().slice(0, MAX_DESCRIPCION)
      : null

  if (!(file instanceof File) || !fichaId) {
    return NextResponse.json({ error: "Faltan datos" }, { status: 400 })
  }

  const tipo = file.type === "image/jpg" ? "image/jpeg" : file.type
  const permitido = TIPOS_PERMITIDOS[tipo]
  if (!permitido) {
    return NextResponse.json({ error: "Solo se permiten imágenes (JPG, PNG) y PDF" }, { status: 400 })
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "El archivo está vacío" }, { status: 400 })
  }
  if (file.size > MAX_TAMANO) {
    return NextResponse.json({ error: "El archivo no puede superar 20 MB" }, { status: 400 })
  }

  // Verificar que el contenido real coincide con el tipo declarado
  const buffer = Buffer.from(await file.arrayBuffer())
  if (!permitido.firma.every((byte, i) => buffer[i] === byte)) {
    return NextResponse.json(
      { error: "El contenido del archivo no corresponde a una imagen JPG/PNG o PDF válido" },
      { status: 400 }
    )
  }

  const ficha = await prisma.ficha.findUnique({ where: { id: fichaId }, select: { id: true, nombre: true } })
  if (!ficha) return NextResponse.json({ error: "Paciente / Ficha no encontrada" }, { status: 404 })

  const nombre = limpiarNombre(file.name)
  const adjunto = await prisma.adjunto.create({
    data: { nombre, tipo, extension: permitido.ext, tamano: file.size, descripcion, fichaId },
  })

  try {
    const uploadsDir = path.join(process.cwd(), "uploads", "adjuntos")
    await mkdir(uploadsDir, { recursive: true })
    await writeFile(path.join(uploadsDir, `${adjunto.id}.${permitido.ext}`), buffer)
  } catch {
    // Sin archivo en disco el registro quedaría huérfano
    await prisma.adjunto.delete({ where: { id: adjunto.id } }).catch(() => {})
    return NextResponse.json({ error: "No se pudo guardar el archivo" }, { status: 500 })
  }

  await registrarActividad({
    accion: "Crear",
    modulo: "Adjuntos",
    entidad: ficha.nombre,
    detalle: `Archivo: ${nombre}`,
  })

  return NextResponse.json({ adjunto })
};