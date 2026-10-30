"use server"

import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import bcrypt from "bcryptjs"

export async function registrarNegocio(formData: FormData) {
  const nombre = (formData.get("nombre") as string)?.trim()
  const apellido = (formData.get("apellido") as string)?.trim()
  const cc = (formData.get("cc") as string)?.trim()
  
  const nombreNegocio = (formData.get("nombreNegocio") as string)?.trim()
  const tipoNegocio = (formData.get("tipoNegocio") as string)?.trim()
  const email = (formData.get("email") as string)?.trim().toLowerCase()
  const password = formData.get("password") as string
  const modulosActivos = JSON.parse(formData.get("modulosActivos") as string || "[]")

  if (!nombre || !apellido || !nombreNegocio || !tipoNegocio || !email || !password) {
    return { error: "Todos los campos son obligatorios." }
  }

  const usuarioExistente = await prisma.usuario.findUnique({ where: { email } })
  if (usuarioExistente) {
    return { error: "Este correo electrónico ya está registrado en OmniSync." }
  }

  try {
    await prisma.$transaction(async (tx) => {
      
      const nuevoNegocio = await tx.negocio.create({
        data: {
          nombre: nombreNegocio,
          tipoNegocio,
          modulosActivos,
        }
      })

      const passwordHash = await bcrypt.hash(password, 10)
      
      // Unificamos nombre y apellido para el esquema actual de Usuario
      const nombreCompleto = `${nombre} ${apellido}`

      await tx.usuario.create({
        data: {
          nombre: nombreCompleto,
          email,
          passwordHash,
          rol: "admin",
          negocioId: nuevoNegocio.id, 
        }
      })
    })

  } catch (error) {
    console.error("Error en registro:", error)
    return { error: "Ocurrió un error al crear tu sistema. Intenta de nuevo." }
  }

  redirect("/login?toast=registrado")
}