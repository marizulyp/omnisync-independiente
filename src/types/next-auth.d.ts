import "next-auth"
import { DefaultSession } from "next-auth"
import type { Rol } from "@/generated/prisma/client"

declare module "next-auth" {
  interface User {
    rol?: Rol
    negocioId?: string
    tipoNegocio?: string
    modulosActivos?: string[]
  }
  interface Session {
    user: {
      id: string
      rol: Rol
      negocioId: string
      tipoNegocio: string
      modulosActivos: string[]
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string
    rol?: Rol
    negocioId?: string
    tipoNegocio?: string
    modulosActivos?: string[]
  }
}