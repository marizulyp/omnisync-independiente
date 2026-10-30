"use client"
import { useActionState, useState } from "react"
import Link from "next/link"
import { actualizarCobro } from "../../../actions"
import type { Cobro } from "@/generated/prisma/client"
import { SelectField } from "@/components/ui/SelectField"
import { fechaLocalISO } from "@/lib/fechas"

type MascotaOpt = { id: string; nombre: string }
type ClienteOpt = { id: string; nombre: string; mascotas: MascotaOpt[] }

function toDateInput(date: Date): string {
  return fechaLocalISO(date)
}

export function EditarCobroForm({
  cobro,
  clientes,
}: {
  cobro: Cobro
  clientes: ClienteOpt[]
}) {
  const [state, action, pending] = useActionState(actualizarCobro, {})
  const [clienteId, setClienteId] = useState(cobro.clienteId ?? "")

  const mascotas = clientes.find((c) => c.id === clienteId)?.mascotas ?? []

  return (
    <div className="p-6 max-w-lg mx-auto">
      <div className="mb-6">
        <Link href="/finanzas/cobros" className="text-sm text-gray-500 hover:text-gray-700">
          ← Volver a ingresos
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Editar ingreso #{cobro.numero}</h1>
      </div>

      <form action={action} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <input type="hidden" name="id" value={cobro.id} />

        {state.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {state.error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Concepto <span className="text-red-500">*</span>
          </label>
          <input
            name="concepto"
            type="text"
            required
            defaultValue={cobro.concepto}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monto <span className="text-red-500">*</span>
            </label>
            <input
              name="monto"
              type="number"
              step="any"
              min="0"
              required
              defaultValue={cobro.monto}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
            <input
              name="fecha"
              type="date"
              defaultValue={toDateInput(cobro.fecha)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
            <SelectField
              name="metodoPago"
              defaultValue={cobro.metodoPago}
              options={[
                { value: "efectivo", label: "Efectivo" },
                { value: "tarjeta", label: "Tarjeta" },
                { value: "transferencia", label: "Transferencia" },
                { value: "otro", label: "Otro" },
              ]}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
            <SelectField
              name="clienteId"
              value={clienteId}
              onChange={(val) => setClienteId(val)}
              options={[
                { value: "", label: "Sin asociar" },
                ...clientes.map((c) => ({ value: c.id, label: c.nombre })),
              ]}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mascota</label>
            <SelectField
              key={clienteId}
              name="mascotaId"
              defaultValue={cobro.mascotaId ?? ""}
              disabled={!clienteId}
              options={[
                { value: "", label: "Sin asociar" },
                ...mascotas.map((m) => ({ value: m.id, label: m.nombre })),
              ]}
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea
              name="notas"
              rows={2}
              defaultValue={cobro.notas ?? ""}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E] resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={pending}
            className="bg-[#1E3A6E] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#162D57] disabled:opacity-50 transition-colors"
          >
            {pending ? "Guardando..." : "Guardar cambios"}
          </button>
          <Link
            href="/finanzas/cobros"
            className="px-6 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </div>
  )
}
