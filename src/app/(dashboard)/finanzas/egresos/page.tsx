import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { BtnEliminar } from "@/components/ui/BtnEliminar"
import { eliminarEgreso } from "../actions"
import type { CategoriaEgreso } from "@/generated/prisma/client"
import { requirePermisoPagina } from "@/lib/permisos-server"

const CATEGORIA_LABEL: Record<CategoriaEgreso, string> = {
  insumos: "Insumos",
  nomina: "Nómina",
  servicios: "Servicios",
  arriendo: "Arriendo",
  otro: "Otro",
}

function fmtCOP(n: number) {
  return `$${n.toLocaleString("es-CO", { maximumFractionDigits: 0 })}`
}

export default async function EgresosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  await requirePermisoPagina("egresos", "ver")
  const { q } = await searchParams
  const busqueda = q?.trim() ?? ""

  const egresos = await prisma.egreso.findMany({
    where: busqueda
      ? {
          OR: [
            { concepto: { contains: busqueda, mode: "insensitive" } },
            { proveedor: { contains: busqueda, mode: "insensitive" } },
          ],
        }
      : undefined,
    orderBy: { fecha: "desc" },
  })

  const total = egresos.reduce((acc, e) => acc + e.monto, 0)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Link href="/finanzas" className="text-sm text-gray-500 hover:text-gray-700">
        ← Volver a Finanzas
      </Link>

      <div className="flex items-center justify-between mt-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Egresos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {egresos.length} registro{egresos.length !== 1 ? "s" : ""} · Total: <span className="font-medium text-red-600">{fmtCOP(total)}</span>
          </p>
        </div>
        <Link
          href="/finanzas/egresos/nuevo"
          className="bg-[#1E3A6E] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#162D57] transition-colors"
        >
          + Registrar egreso
        </Link>
      </div>

      <form method="get" className="mb-5">
        <div className="relative max-w-sm">
          <input
            name="q"
            type="search"
            defaultValue={busqueda}
            placeholder="Buscar por concepto o proveedor..."
            className="w-full pl-4 pr-10 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]"
          />
          <button type="submit" className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 text-base">
            🔍
          </button>
        </div>
      </form>

      {egresos.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-5xl mb-3">💸</p>
          <p className="text-lg font-medium text-gray-500">
            {busqueda ? "No se encontraron egresos" : "Aún no hay egresos registrados"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Fecha</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Concepto</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Categoría</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden md:table-cell">Proveedor</th>
                <th className="text-right px-4 py-3 font-semibold text-gray-600">Monto</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {egresos.map((e) => (
                <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-600">
                    {e.fecha.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{e.concepto}</td>
                  <td className="px-4 py-3 text-gray-600">{CATEGORIA_LABEL[e.categoria]}</td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{e.proveedor ?? "—"}</td>
                  <td className="px-4 py-3 text-right font-medium text-red-600">{fmtCOP(e.monto)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 justify-end">
                      <Link href={`/finanzas/egresos/${e.id}/editar`} className="text-gray-600 hover:text-gray-800 font-medium">
                        Editar
                      </Link>
                      <BtnEliminar
                        action={eliminarEgreso.bind(null, e.id)}
                        mensaje={`¿Eliminar el egreso "${e.concepto}"?`}
                      />
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
