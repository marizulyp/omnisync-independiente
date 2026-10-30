"use server"

import { prisma } from "@/lib/prisma"
import { Resend } from "resend"
import crypto from "crypto"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function solicitarRecuperacion(formData: FormData) {
  const email = formData.get("email") as string
  if (!email) return { error: "El correo es obligatorio" }

  try {
    const usuario = await prisma.usuario.findUnique({ where: { email } })
    
    // REGLA DE SEGURIDAD: Si el correo no existe, no hacemos nada pero decimos que sí
    if (!usuario) return { success: true }

    const token = crypto.randomUUID()
    const expiracion = new Date(Date.now() + 1000 * 60 * 60) // 1 hora de validez

    // Borramos el token anterior si existía y creamos el nuevo
    await prisma.tokenRecuperacion.deleteMany({ where: { email } })
    await prisma.tokenRecuperacion.create({ data: { email, token, expiracion } })

    const urlBase = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001"
    const enlaceRecuperacion = `${urlBase}/restablecer?token=${token}`
    
    // ENVIAMOS EL CORREO CON EL DISEÑO FINAL DE OMNISYNC
    await resend.emails.send({
      from: "OmniSync Seguridad <onboarding@resend.dev>", // En producción cambiará a tu dominio
      to: email, 
      subject: "Restablece tu contraseña de OmniSync",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; padding: 40px 20px; background-color: #f4f4f5; text-align: center;">
          <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            
            <div style="background-color: #18181b; padding: 24px; text-align: center; border-bottom: 2px solid #10b981;">
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">Omni<span style="color: #10b981;">Sync</span></h1>
            </div>
            
            <div style="padding: 32px 24px; text-align: left; color: #3f3f46;">
              <h2 style="font-size: 20px; font-weight: 700; color: #18181b; margin-top: 0;">Recuperación de contraseña</h2>
              <p style="font-size: 15px; line-height: 1.6; margin-bottom: 24px;">Hola <strong>${usuario.nombre}</strong>,</p>
              <p style="font-size: 15px; line-height: 1.6; margin-bottom: 32px;">Hemos recibido una solicitud para cambiar la contraseña de tu cuenta. Haz clic en el siguiente botón para crear una nueva. Por tu seguridad, este enlace expirará en 1 hora.</p>
              
              <div style="text-align: center; margin-bottom: 32px;">
                <a href="${enlaceRecuperacion}" style="background-color: #10b981; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">Restablecer mi contraseña</a>
              </div>
              
              <p style="font-size: 13px; color: #71717a; line-height: 1.5; margin-bottom: 0;">Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:</p>
              <p style="font-size: 13px; color: #10b981; word-break: break-all; margin-top: 4px;">${enlaceRecuperacion}</p>
            </div>
            
            <div style="background-color: #f4f4f5; padding: 16px; text-align: center;">
              <p style="font-size: 12px; color: #a1a1aa; margin: 0;">Si no solicitaste este cambio, puedes ignorar este correo de forma segura. Tu cuenta está protegida.</p>
            </div>

          </div>
        </div>
      `
    })

    return { success: true }
  } catch (error) {
    console.error("Error al enviar correo:", error)
    return { error: "Ocurrió un error en el servidor. Intenta de nuevo más tarde." }
  }
}