"use server"

import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import type { Rol } from "@/generated/prisma/client"
import { registrarActividad } from "@/lib/auditoria"

export type ActionState = { error?: string }

function esEmailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

async function requireAdmin() {
  const session = await auth()
  if (session?.user.rol !== "admin") throw new Error("No autorizado")
}

export async function crearUsuario(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try { await requireAdmin() } catch { return { error: "No autorizado" } }
  const nombre = (formData.get("nombre") as string)?.trim()
  const email = (formData.get("email") as string)?.trim().toLowerCase()
  const password = formData.get("password") as string
  const rol = (formData.get("rol") as Rol) || "recepcionista"

  if (!nombre) return { error: "El nombre es obligatorio" }
  if (!email) return { error: "El email es obligatorio" }
  if (!esEmailValido(email)) return { error: "El formato del email no es válido" }
  if (!password || password.length < 6)
    return { error: "La contraseña debe tener al menos 6 caracteres" }

  const passwordHash = await bcrypt.hash(password, 12)

  const cargo = (formData.get("cargo") as string)?.trim() || null

  try {
    const usuario = await prisma.usuario.create({ data: { nombre, email, passwordHash, rol } })
    if (cargo) {
      await prisma.empleado.upsert({
        where: { usuarioId: usuario.id },
        create: { usuarioId: usuario.id, cargo },
        update: { cargo },
      })
    }
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2002")
      return { error: "Ya existe un usuario con ese email" }
    return { error: "Error al crear el usuario" }
  }
  await registrarActividad({
    accion: "Crear",
    modulo: "Usuarios",
    entidad: nombre,
    detalle: `Rol: ${rol} — ${email}`,
  })
  redirect("/admin/usuarios?toast=created")
}

export async function actualizarUsuario(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  try { await requireAdmin() } catch { return { error: "No autorizado" } }
  const id = formData.get("id") as string
  const nombre = (formData.get("nombre") as string)?.trim()
  const email = (formData.get("email") as string)?.trim().toLowerCase()
  const rol = (formData.get("rol") as Rol) || "recepcionista"
  const activo = formData.get("activo") === "true"
  const password = (formData.get("password") as string)?.trim()
  const cargo = (formData.get("cargo") as string)?.trim() || null

  if (!nombre) return { error: "El nombre es obligatorio" }
  if (!email) return { error: "El email es obligatorio" }
  if (!esEmailValido(email)) return { error: "El formato del email no es válido" }

  const data: Record<string, unknown> = { nombre, email, rol, activo }
  if (password) {
    if (password.length < 6)
      return { error: "La contraseña debe tener al menos 6 caracteres" }
    data.passwordHash = await bcrypt.hash(password, 12)
  }

  try {
    await prisma.usuario.update({ where: { id }, data })
    await prisma.empleado.upsert({
      where: { usuarioId: id },
      create: { usuarioId: id, cargo: cargo ?? "" },
      update: { cargo: cargo ?? "" },
    })
  } catch (e: unknown) {
    if ((e as { code?: string })?.code === "P2002")
      return { error: "Ya existe un usuario con ese email" }
    return { error: "Error al actualizar el usuario" }
  }
  await registrarActividad({
    accion: "Editar",
    modulo: "Usuarios",
    entidad: nombre,
    detalle: `Rol: ${rol} — activo: ${activo}`,
  })
  redirect("/admin/usuarios?toast=updated")
}

export async function toggleActivoUsuario(id: string, activo: boolean) {
  const session = await auth()
  if (session?.user.rol !== "admin") throw new Error("No autorizado")
  const usuario = await prisma.usuario.findUnique({ where: { id }, select: { nombre: true } })
  await prisma.usuario.update({ where: { id }, data: { activo } })
  await registrarActividad({
    accion: "Editar",
    modulo: "Usuarios",
    entidad: usuario?.nombre ?? id,
    detalle: activo ? "Usuario activado" : "Usuario desactivado",
  })
  revalidatePath("/admin/usuarios")
}

export async function eliminarUsuario(id: string) {
  const session = await auth()
  if (session?.user.rol !== "admin") throw new Error("No autorizado")
  if (session.user.id === id) throw new Error("No puedes eliminar tu propio usuario")
  const usuario = await prisma.usuario.findUnique({ where: { id }, select: { nombre: true } })
  await prisma.usuario.delete({ where: { id } })
  await registrarActividad({
    accion: "Eliminar",
    modulo: "Usuarios",
    entidad: usuario?.nombre ?? id,
  })
  revalidatePath("/admin/usuarios")
  redirect("/admin/usuarios?toast=deleted")
}
