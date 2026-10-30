import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { tienePermiso, type Accion, type Modulo } from "@/lib/permisos"

// Para server actions: corta la ejecución si el rol no tiene el permiso.
// Las páginas ya ocultan los botones; esto protege ante llamadas directas.
export async function requirePermiso<M extends Modulo>(modulo: M, accion: Accion<M>) {
  const session = await auth()
  if (!session?.user || !tienePermiso(session.user.rol, modulo, accion)) {
    throw new Error("No autorizado")
  }
  return session
}

// Para páginas: redirige al inicio con un aviso de acceso restringido.
export async function requirePermisoPagina<M extends Modulo>(modulo: M, accion: Accion<M>) {
  const session = await auth()
  if (!session?.user) redirect("/login")
  if (!tienePermiso(session.user.rol, modulo, accion)) redirect("/?toast=denied")
  return session
}

// Para componentes de servidor que solo necesitan saber el rol actual.
export async function rolActual() {
  const session = await auth()
  return session?.user?.rol ?? null
}
