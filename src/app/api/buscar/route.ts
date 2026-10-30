import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { tienePermiso } from "@/lib/permisos"
import type { GrupoBusqueda } from "@/lib/busqueda"

const ESPECIE: Record<string, string> = {
  perro: "Perro", gato: "Gato", ave: "Ave", conejo: "Conejo", reptil: "Reptil", otro: "Otro",
}

function cop(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n)
}

// Búsqueda global del encabezado: pacientes, clientes, facturas y productos.
// Solo devuelve los grupos que el rol del usuario puede ver.
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const rol = session.user.rol

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80)
  if (q.length < 2) return NextResponse.json({ grupos: [] })

  const texto = { contains: q, mode: "insensitive" as const }
  const numero = /^\d+$/.test(q) ? Number(q) : null

  const [mascotas, clientes, facturas, productos] = await Promise.all([
    tienePermiso(rol, "mascotas", "ver")
      ? prisma.mascota.findMany({
          where: { OR: [{ nombre: texto }, { raza: texto }, { cliente: { nombre: texto } }] },
          include: { cliente: { select: { nombre: true } } },
          orderBy: { nombre: "asc" },
          take: 6,
        })
      : [],
    tienePermiso(rol, "clientes", "ver")
      ? prisma.cliente.findMany({
          where: { OR: [{ nombre: texto }, { identificacion: texto }, { telefono: texto }, { email: texto }] },
          include: { _count: { select: { mascotas: true } } },
          orderBy: { nombre: "asc" },
          take: 6,
        })
      : [],
    tienePermiso(rol, "facturas", "ver")
      ? prisma.factura.findMany({
          where: {
            OR: [
              ...(numero !== null ? [{ numero }] : []),
              { cliente: { nombre: texto } },
              { mascota: { nombre: texto } },
            ],
          },
          include: { cliente: { select: { nombre: true } } },
          orderBy: { numero: "desc" },
          take: 5,
        })
      : [],
    tienePermiso(rol, "inventario", "ver")
      ? prisma.producto.findMany({
          where: { OR: [{ nombre: texto }, { proveedor: texto }] },
          orderBy: { nombre: "asc" },
          take: 5,
        })
      : [],
  ])

  const grupos: GrupoBusqueda[] = [
    {
      titulo: "Pacientes",
      items: mascotas.map((m) => ({
        href: `/mascotas/${m.id}`,
        titulo: m.nombre,
        detalle: [ESPECIE[m.especie] ?? m.especie, m.raza, m.cliente.nombre].filter(Boolean).join(" · "),
        icono: "pets",
      })),
    },
    {
      titulo: "Clientes",
      items: clientes.map((c) => ({
        href: `/clientes/${c.id}`,
        titulo: c.nombre,
        detalle: [c.identificacion, c.telefono, `${c._count.mascotas} mascota${c._count.mascotas === 1 ? "" : "s"}`]
          .filter(Boolean).join(" · "),
        icono: "person",
      })),
    },
    {
      titulo: "Facturas",
      items: facturas.map((f) => ({
        href: `/facturas/${f.id}`,
        titulo: `Factura No. ${String(f.numero).padStart(4, "0")}`,
        detalle: [f.cliente?.nombre, cop(f.total)].filter(Boolean).join(" · "),
        icono: "receipt_long",
      })),
    },
    {
      titulo: "Inventario",
      items: productos.map((p) => ({
        href: `/inventario/${p.id}`,
        titulo: p.nombre,
        detalle: `Stock: ${p.stock} ${p.unidad}${p.stockMinimo > 0 && p.stock <= p.stockMinimo ? " · stock bajo" : ""}`,
        icono: "inventory_2",
      })),
    },
  ].filter((g) => g.items.length > 0)

  return NextResponse.json({ grupos })
}
