import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
authorize: async (credentials) => {
        const email = credentials?.email as string | undefined
        const password = credentials?.password as string | undefined

        if (!email || !password) return null

        console.log(`🔍 Intentando login para: ${email}`)
        
        // Traemos al usuario INCLUYENDO los datos de su Negocio (SaaS)
        const usuario = await prisma.usuario.findUnique({
          where: { email },
          include: { negocio: true } 
        })

        if (!usuario) {
          console.log("❌ ERROR: Usuario no encontrado en la BD")
          return null
        }
        
        if (!usuario.activo) {
          console.log("❌ ERROR: El usuario está inactivo")
          return null
        }
        
        if (!usuario.negocio) {
          console.log("❌ ERROR: El usuario no tiene un negocio asociado")
          return null
        }

        console.log("✅ Usuario y negocio validados. Revisando clave...")
        
        const passwordValida = await bcrypt.compare(password, usuario.passwordHash)
        
        if (!passwordValida) {
          console.log("❌ ERROR: La contraseña no coincide")
          return null
        }

        console.log("✅ ¡LOGIN EXITOSO!")

        // Retornamos también la info del negocio
        return {
          id: usuario.id,
          email: usuario.email,
          name: usuario.nombre,
          rol: usuario.rol,
          negocioId: usuario.negocioId,
          tipoNegocio: usuario.negocio.tipoNegocio,
          modulosActivos: usuario.negocio.modulosActivos,
        }
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.rol = user.rol
        token.negocioId = user.negocioId
        token.tipoNegocio = user.tipoNegocio
        token.modulosActivos = user.modulosActivos
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.rol = token.rol as import("@/generated/prisma/client").Rol
      session.user.negocioId = token.negocioId as string
      session.user.tipoNegocio = token.tipoNegocio as string
      session.user.modulosActivos = token.modulosActivos as string[]
      return session
    },
  },
})