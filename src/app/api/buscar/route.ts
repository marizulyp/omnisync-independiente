import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/auth"
import { tienePermiso } from "@/lib/permisos"
import type { GrupoBusqueda } from "@/lib/busqueda"

function cop(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n)
}

// Búsqueda global del encabezado: fichas, clientes, facturas y productos.
// Solo devuelve los grupos que el rol del usuario puede ver.
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: "No autorizado" }, { status: 401 })
  const rol = session.user.rol

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 80)
  if (q.length < 2) return NextResponse.json({ grupos: [] })

  const texto = { contains: q, mode: "insensitive" as const }
  const numero = /^\d+$/.test(q) ? Number(q) : null

  const [fichas, clientes, facturas, productos] = await Promise.all([
    tienePermiso(rol, "fichas", "ver")
      ? prisma.ficha.findMany({
          where: { OR: [{ nombre: texto }, { cliente: { nombre: texto } }] },
          include: { cliente: { select: { nombre: true } } },
          orderBy: { nombre: "asc" },
          take: 6,
        })
      : [],
    tienePermiso(rol, "clientes", "ver")
      ? prisma.cliente.findMany({
          where: { OR: [{ nombre: texto }, { identificacion: texto }, { telefono: texto }, { email: texto }] },
          include: { _count: { select: { fichas: true } } },
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
              { ficha: { nombre: texto } },
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
      titulo: "Fichas / Pacientes",
      items: fichas.map((f) => {
        // Manejamos datosGenerales como un registro tipado sin forzar any o casteos inseguros
        const datos = f.datosGenerales && typeof f.datosGenerales === 'object' && !Array.isArray(f.datosGenerales)
          ? (f.datosGenerales as Record<string, any>) 
          : {}
          
        return {
          href: `/fichas/${f.id}`,
          titulo: f.nombre,
          detalle: [f.tipo, datos.raza, f.cliente.nombre].filter(Boolean).join(" · "),
          icono: "pets",
        }
      }),
    },
    {
      titulo: "Clientes",
      items: clientes.map((c) => ({
        href: `/clientes/${c.id}`,
        titulo: c.nombre,
        detalle: [c.identificacion, c.telefono, `${c._count.fichas} ficha${c._count.fichas === 1 ? "" : "s"}`]
          .filter(Boolean).join(" · "),
        icono: "person",
      })),
    },
    {
      titulo: "Facturas",
      items: facturas.map((fa) => ({
        href: `/facturas/${fa.id}`,
        titulo: `Factura No. ${String(fa.numero).padStart(4, "0")}`,
        detalle: [fa.cliente?.nombre, cop(fa.total)].filter(Boolean).join(" · "),
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
};