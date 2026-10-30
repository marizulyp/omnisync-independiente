import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { BtnEliminar } from "@/components/ui/BtnEliminar"
import { DownloadLink } from "@/components/ui/DownloadLink"
import { Icon } from "@/components/ui/Icon"
import { eliminarProducto } from "./actions"
import { rolActual } from "@/lib/permisos-server"
import { tienePermiso } from "@/lib/permisos"
import { auth } from "@/auth"

const DICCIONARIO_CATEGORIAS: Record<string, { label: Record<string, string>, icon: Record<string, string> }> = {
  veterinaria: {
    label: { medicamento: "Medicamento", alimento: "Alimento", accesorio: "Accesorio", higiene: "Higiene", otro: "Otro" },
    icon: { medicamento: "vaccines", alimento: "nutrition", accesorio: "pets", higiene: "clean_hands", otro: "inventory_2" }
  },
  taller: {
    label: { repuesto: "Repuesto", insumo: "Insumo / Consumible", accesorio: "Accesorio", herramienta: "Herramienta", otro: "Otro" },
    icon: { repuesto: "settings", insumo: "oil_barrel", accesorio: "directions_car", herramienta: "build", otro: "inventory_2" }
  },
  barberia: {
    label: { capilar: "Producto Capilar", facial: "Cuidado Facial", insumo: "Insumo", accesorio: "Accesorio", otro: "Otro" },
    icon: { capilar: "face_retouching_natural", facial: "spa", insumo: "sanitizer", accesorio: "content_cut", otro: "inventory_2" }
  }
}

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n)
}

export default async function InventarioPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; alerta?: string }>
}) {
  const rol = await rolActual()
  const puedeEditar = tienePermiso(rol, "inventario", "editar")
  const puedeEliminar = tienePermiso(rol, "inventario", "eliminar")
  const { q, alerta } = await searchParams
  const busqueda = q?.trim() ?? ""

  // Extracción segura del Negocio ID y Tipo de Negocio
  const session = await auth()
  const email = session?.user?.email ?? ""
  const usuarioDb = await prisma.usuario.findUnique({
    where: { email },
    select: { negocioId: true, negocio: { select: { tipoNegocio: true } } }
  })
  
  const negocioId = usuarioDb?.negocioId || null
  const tipoNegocio = usuarioDb?.negocio?.tipoNegocio || "veterinaria"
  const diccCategorias = DICCIONARIO_CATEGORIAS[tipoNegocio] || DICCIONARIO_CATEGORIAS["veterinaria"]

  // EL MURO DE CONTENCIÓN: where { negocioId }
  const productos = await prisma.producto.findMany({
    where: {
      negocioId, // Aislamiento estricto
      ...(busqueda
        ? {
            OR: [
              { nombre: { contains: busqueda, mode: "insensitive" } },
              { proveedor: { contains: busqueda, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { nombre: "asc" },
  })

  const conStockBajo = productos.filter(
    (p) => p.stockMinimo > 0 && p.stock <= p.stockMinimo
  )

  const productosMostrados =
    alerta === "1" ? conStockBajo : productos

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4 mb-[18px]">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.015em] text-[#0F1720]">Inventario</h1>
          <p className="mt-[5px] font-mono text-[11.5px] tracking-[0.04em] text-[#64748B] uppercase">
            {productos.length} producto{productos.length !== 1 ? "s" : ""}
            {conStockBajo.length > 0 && (
              <span className="ml-2 text-[#B45309]">
                · {conStockBajo.length} bajo stock mínimo
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <form method="get">
            {alerta && <input type="hidden" name="alerta" value={alerta} />}
            <div className="flex items-center gap-2 rounded-[7px] border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-[7px]">
              <Icon name="search" size={17} className="text-[#94A3B8] shrink-0" />
              <input
                name="q"
                type="search"
                defaultValue={busqueda}
                placeholder="Buscar producto o proveedor…"
                className="w-52 bg-transparent text-[13px] text-[#334155] placeholder:text-[#94A3B8] focus:outline-none"
              />
            </div>
          </form>
          {conStockBajo.length > 0 && (
            <Link
              href={alerta === "1" ? "/inventario" : "/inventario?alerta=1"}
              className={`flex items-center gap-1.5 rounded-[7px] border px-3 py-[7px] text-[12.5px] font-medium transition-colors ${
                alerta === "1"
                  ? "border-[#FDE68A] bg-[#FEF3C7] text-[#B45309]"
                  : "border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC]"
              }`}
            >
              <Icon name="warning" size={15} className={alerta === "1" ? "text-[#B45309]" : "text-[#94A3B8]"} />
              {conStockBajo.length} alertas
            </Link>
          )}
          <DownloadLink
            href="/api/inventario/excel"
            className="flex items-center gap-[7px] rounded-[7px] border border-[#16A34A] bg-[#F0FDF4] px-[13px] py-[7px] text-[13px] font-medium text-[#16A34A] hover:bg-[#DCFCE7] transition-colors"
          >
            <Icon name="table_view" size={16} className="text-[#16A34A]" />
            Descargar Excel
          </DownloadLink>
          {puedeEditar && (
            <Link
              href="/inventario/nuevo"
              className="flex items-center gap-[7px] rounded-[7px] bg-[#1E3A6E] px-[15px] py-[9px] text-[13px] font-semibold text-white hover:bg-[#162D57] transition-colors"
            >
              <Icon name="add" size={17} className="text-white" />
              Nuevo producto
            </Link>
          )}
        </div>
      </div>

      {productosMostrados.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-[#94A3B8]">
          <Icon name="inventory_2" size={48} className="mb-3 opacity-40" />
          <p className="text-[12.5px]">
            {busqueda
              ? "No se encontraron productos"
              : alerta === "1"
              ? "Sin productos con stock bajo"
              : "Aún no hay productos registrados en este negocio"}
          </p>
          {!busqueda && alerta !== "1" && puedeEditar && (
            <Link
              href="/inventario/nuevo"
              className="mt-2 text-[13px] text-[#1E3A6E] hover:underline"
            >
              Registrar primer producto →
            </Link>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#E2E8F0] bg-white">
          <div className="overflow-x-auto">
            <div className="min-w-[860px]">
              <div
                className="grid gap-3 border-b border-[#EEF2F6] bg-[#F8FAFC] px-[18px] py-[9px] font-mono text-[10.5px] tracking-[0.08em] text-[#7C8CA0] uppercase"
                style={{ gridTemplateColumns: "minmax(0,1.6fr) 110px minmax(100px,1fr) 120px 100px 110px" }}
              >
                <span>Producto</span>
                <span>Categoría</span>
                <span>Stock</span>
                <span className="text-right">Precio venta</span>
                <span>Proveedor</span>
                <span className="text-right">Acciones</span>
              </div>

              {productosMostrados.map((p) => {
                const porcentaje =
                  p.stockMinimo > 0
                    ? Math.min(100, Math.round((p.stock / (p.stockMinimo * 2)) * 100))
                    : null
                const stockBajo = p.stockMinimo > 0 && p.stock <= p.stockMinimo
                const deleteAction = eliminarProducto.bind(null, p.id)

                return (
                  <div
                    key={p.id}
                    className={`grid gap-3 items-center border-b border-[#F1F5F9] px-[18px] py-[11px] transition-colors last:border-0 ${
                      stockBajo ? "bg-[#FFFBEB] hover:bg-[#FEF9C3]" : "hover:bg-[#F8FAFC]"
                    }`}
                    style={{ gridTemplateColumns: "minmax(0,1.6fr) 110px minmax(100px,1fr) 120px 100px 110px" }}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {stockBajo && (
                        <Icon name="warning" size={15} className="shrink-0 text-[#B45309]" />
                      )}
                      <Link
                        href={`/inventario/${p.id}`}
                        className="truncate text-[13.5px] font-semibold text-[#0F1720] hover:text-[#1E3A6E]"
                      >
                        {p.nombre}
                      </Link>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Icon
                        name={diccCategorias.icon[p.categoria] || "inventory_2"}
                        size={14}
                        className="text-[#7C8CA0] shrink-0"
                      />
                      <span className="text-[12.5px] text-[#64748B] capitalize">
                        {diccCategorias.label[p.categoria] || p.categoria}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <div className="flex items-baseline gap-1.5">
                        <span
                          className={`font-mono text-[13px] font-semibold ${
                            stockBajo ? "text-[#B45309]" : "text-[#0F1720]"
                          }`}
                        >
                          {p.stock}
                        </span>
                        <span className="font-mono text-[11px] text-[#94A3B8]">{p.unidad}</span>
                        {p.stockMinimo > 0 && (
                          <span className="font-mono text-[10.5px] text-[#94A3B8]">
                            / mín {p.stockMinimo}
                          </span>
                        )}
                      </div>
                      {porcentaje !== null && (
                        <div className="h-[3px] rounded-full bg-[#F1F5F9]">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${porcentaje}%`,
                              backgroundColor: stockBajo ? "#B45309" : "#1E3A6E",
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <span className="text-right font-mono text-[12.5px] text-[#475569]">
                      {p.precioVenta ? formatCOP(p.precioVenta) : "—"}
                    </span>

                    <span className="truncate text-[12.5px] text-[#64748B]">
                      {p.proveedor ?? "—"}
                    </span>

                    <div className="flex items-center justify-end gap-2.5">
                      <Link
                        href={`/inventario/${p.id}`}
                        title="Ver"
                        className="flex items-center justify-center rounded p-1 text-[#94A3B8] hover:text-[#1E3A6E] transition-colors"
                      >
                        <Icon name="visibility" size={18} />
                      </Link>
                      {puedeEditar && (
                        <Link
                          href={`/inventario/${p.id}/editar`}
                          title="Editar"
                          className="flex items-center justify-center rounded p-1 text-[#94A3B8] hover:text-[#334155] transition-colors"
                        >
                          <Icon name="edit" size={18} />
                        </Link>
                      )}
                      {puedeEliminar && (
                        <BtnEliminar
                          action={deleteAction}
                          mensaje={`¿Eliminar "${p.nombre}"? Se perderá su historial de movimientos.`}
                        />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}