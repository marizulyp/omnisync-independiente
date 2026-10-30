import type { Rol } from "@/generated/prisma/enums"

// ── Matriz de permisos por rol ──────────────────────────────────────────────
// Fuente única de verdad: la usan el menú, las páginas, los botones,
// las server actions y las rutas de la API. Para cambiar quién puede hacer
// qué, se edita solo este objeto.

// Roles universales SaaS
const TODOS: Rol[] = ["admin", "especialista", "asistente", "recepcionista"]

export const PERMISOS = {
  clientes:        { ver: TODOS, editar: ["admin", "especialista", "recepcionista"], eliminar: ["admin"] },
  
  // Módulos genéricos renombrados
  fichas:          { ver: TODOS, editar: ["admin", "especialista", "recepcionista"], eliminar: ["admin"] },
  atenciones:      { ver: TODOS, editar: ["admin", "especialista"], eliminar: ["admin"] },
  controles:       { ver: TODOS, editar: ["admin", "especialista", "asistente"], eliminar: ["admin"] },
  recomendaciones: { ver: TODOS, editar: ["admin", "especialista"], eliminar: ["admin"] },
  
  adjuntos:        { subir: TODOS, eliminar: ["admin", "especialista"] },
  agenda:          { ver: TODOS, editar: TODOS, eliminar: TODOS },
  recordatorios:   { ver: TODOS, editar: TODOS, eliminar: TODOS },
  inventario:      { ver: TODOS, editar: ["admin"], movimientos: ["admin", "especialista", "asistente"], eliminar: ["admin"] },
  facturas:        { ver: ["admin", "especialista", "recepcionista"], editar: ["admin", "recepcionista"], eliminar: ["admin"] },
  cobros:          { ver: ["admin", "especialista", "recepcionista"], editar: ["admin", "recepcionista"], eliminar: ["admin"] },
  egresos:         { ver: ["admin"], editar: ["admin"], eliminar: ["admin"] },
  
  // Panel de finanzas (resumen de ingresos y egresos)
  finanzas:        { ver: ["admin"] },
  informes:        { ver: ["admin"] },
  actividad:       { ver: ["admin"] },
  usuarios:        { ver: ["admin"], editar: ["admin"], eliminar: ["admin"] },
} as const satisfies Record<string, Record<string, readonly Rol[]>>

export type Modulo = keyof typeof PERMISOS
export type Accion<M extends Modulo> = keyof (typeof PERMISOS)[M] & string

export function tienePermiso<M extends Modulo>(
  rol: string | null | undefined,
  modulo: M,
  accion: Accion<M>
): boolean {
  if (!rol) return false
  
  // Red de seguridad por si alguna pantalla vieja pide un módulo que ya no existe
  if (!PERMISOS[modulo] || !PERMISOS[modulo][accion]) return false

  const roles = PERMISOS[modulo][accion] as readonly string[]
  return roles.includes(rol)
}

export function puedeEliminarAdjunto(rol: string | null | undefined) {
  return tienePermiso(rol, "adjuntos", "eliminar")
}