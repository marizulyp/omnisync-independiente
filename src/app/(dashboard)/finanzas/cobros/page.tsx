import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { BtnEliminar } from "@/components/ui/BtnEliminar"
import { eliminarCobro } from "../actions"
import type { MetodoPago } from "@/generated/prisma/client"
import { requirePermisoPagina, rolActual } from "@/lib/permisos-server"
import { tienePermiso } from "@/lib/permisos"

const METODO_LABEL: Record<MetodoPago, string> = {
  efectivo: "Efectivo",
  tarjeta: "Tarjeta",
  transferencia: "Transferencia",
  otro: "Otro",
}

function fmtCOP(n: number) {
  return `$${n.toLocaleString("es-CO", { maximumFractionDigits: 0 })}`
}

export default async function CobrosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const rol = await rolActual()
  const verFinanzas = tienePermiso(rol, "finanzas", "ver")
  const puedeEditar = tienePermiso(rol, "cobros", "editar")
  const puedeEliminar = tienePermiso(rol, "cobros", "eliminar")
  await requirePermisoPagina("cobros", "ver")
  const { q } = await searchParams
  const busqueda = q?.trim() ?? ""

  const cobros = await prisma.cobro.findMany({
    where: busqueda
      ? {
          OR: [
            { concepto: { contains: busqueda, mode: "insensitive" } },
            { cliente: { nombre: { contains: busqueda, mode: "insensitive" } } },
          ],
        }
      : undefined,
    orderBy: { fecha: "desc" },
    include: { cliente: { select: { nombre: true } }, mascota: { select: { nombre: true } } },
  })

  const total = cobros.reduce((acc, c) => acc + c.monto, 0)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {verFinanzas && (
        <Link href="/finanzas" className="text-sm text-gray-500 hover:text-gray-700">
          ← Volver a Finanzas
        </Link>
      )}

      <div className="flex items-center justify-between mt-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ingresos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {cobros.length} ingreso{cobros.length !== 1 ? "s" : ""} · Total: <span className="font-medium text-green-600">{fmtCOP(total)}</span>
          </p>
        </div>
        {puedeEditar && (
          <div className="flex flex-wrap gap-2">
          <Link
            href="/finanzas/cobros/nuevo"
            className="bg-white border border-[#E2E8F0] text-[#334155] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors"
          >
            + Registrar ingreso
          </Link>
          <Link
            href="/facturas/nueva"
            className="bg-[#1E3A6E] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#162D57] transition-colors"
          >
            Nueva venta
          </Link>
          </div>
        )}
      </div>

      <form method="get" className="mb-5">
        <div className="relative max-w-sm">
          <input
            name="q"
            type="search"
            defaultValue={busqueda}
            placeholder="Buscar por concepto o cliente..."
            className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]"
          />
          <button type="submit" className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 text-base">
            🔍
          </button>
        </div>
      </form>

      {cobros.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-3">🧾</p>
          <p className="text-lg font-medium text-gray-500">
            {busqueda ? "No se encontraron ingresos" : "Aún no hay ingresos registrados"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">N°</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Fecha</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Concepto</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Cliente / Mascota</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Método</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Monto</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {cobros.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500">#{c.numero}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {c.fecha.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{c.concepto}</td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                    {c.cliente?.nombre ?? "—"}
                    {c.mascota && <span className="text-gray-400"> · {c.mascota.nombre}</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{METODO_LABEL[c.metodoPago]}</td>
                  <td className="px-4 py-3 text-right font-medium text-green-600">{fmtCOP(c.monto)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 justify-end">
                      {puedeEditar && (
                        <Link href={`/finanzas/cobros/${c.id}/editar`} className="text-gray-600 hover:text-gray-800 font-medium">
                          Editar
                        </Link>
                      )}
                      {puedeEliminar && (
                        <BtnEliminar
                          action={eliminarCobro.bind(null, c.id)}
                          mensaje={`¿Eliminar el ingreso #${c.numero}?`}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
