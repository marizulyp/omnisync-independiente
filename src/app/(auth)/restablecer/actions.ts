"use server"

import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function guardarNuevaPassword(formData: FormData) {
  const token = formData.get("token") as string
  const password = formData.get("password") as string

  if (!token || !password) return { error: "Datos incompletos." }
  if (password.length < 6) return { error: "La contraseña es muy corta." }

  try {
    // 1. Buscar si el token existe en la base de datos
    const tokenDb = await prisma.tokenRecuperacion.findUnique({
      where: { token }
    })

    if (!tokenDb) {
      return { error: "El enlace es inválido. Solicita uno nuevo." }
    }

    // 2. Verificar si el token ya se venció (le dimos 1 hora de vida)
    if (new Date() > tokenDb.expiracion) {
      // Si se venció, lo borramos de una vez para limpiar la base de datos
      await prisma.tokenRecuperacion.delete({ where: { token } })
      return { error: "El enlace ha caducado. Por seguridad, solicita uno nuevo." }
    }

    // 3. Todo está bien. Encriptamos la nueva contraseña (nivel bancario)
    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    // 4. Actualizamos la contraseña del usuario usando el email que estaba guardado en el token
    await prisma.usuario.update({
      where: { email: tokenDb.email },
      data: { passwordHash: hashedPassword }
    })

    // 5. Borramos el token usado para que no se pueda usar dos veces
    await prisma.tokenRecuperacion.delete({
      where: { token }
    })

    return { success: true }
  } catch (error) {
    console.error("Error cambiando la contraseña:", error)
    return { error: "Ocurrió un error al guardar tu nueva contraseña." }
  }
}