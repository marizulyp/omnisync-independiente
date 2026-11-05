"use client"
import { useActionState, useState } from "react"
import Link from "next/link"
import { crearCobro } from "../../actions"
import { SelectField } from "@/components/ui/SelectField"
import { fechaLocalISO } from "@/lib/fechas"

type FichaOpt = { id: string; nombre: string }
type ClienteOpt = { id: string; nombre: string; fichas: FichaOpt[] }

function hoyISO() {
  return fechaLocalISO()
}

export function NuevoCobroForm({ clientes }: { clientes: ClienteOpt[] }) {
  const [state, formAction, pending] = useActionState(crearCobro, {})
  const [clienteId, setClienteId] = useState("")

  const fichas = clientes.find((c) => c.id === clienteId)?.fichas ?? []

  return (
    <div className="sm:p-6 max-w-lg mx-auto">
      <div className="mb-6">
        <Link href="/finanzas/cobros" className="text-sm text-gray-500 hover:text-gray-700">
          ← Volver a ingresos
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Registrar ingreso</h1>
        <p className="text-xs text-gray-400 mt-1">Recibo interno administrativo — no reemplaza factura tributaria</p>
      </div>

      <div className="mb-5 rounded-xl border border-[#C7D5F0] bg-[#E8EEFB] p-4 text-sm text-[#1E3A6E]">
        <p className="font-semibold">¿Es la venta de un producto o servicio?</p>
        <p className="mt-1 text-[#334155]">
          Usa <b>Nueva venta</b>: en un solo paso genera el comprobante para el cliente, descuenta los productos del inventario y registra este ingreso.
        </p>
        <Link
          href="/facturas/nueva"
          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#1E3A6E] px-4 py-2 text-sm font-medium text-white hover:bg-[#162D57]"
        >
          Ir a Nueva venta →
        </Link>
        <p className="mt-3 text-xs text-[#64748B]">Este formulario es para ingresos que no son ventas (abonos, aportes, otros).</p>
      </div>

      <form action={formAction} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
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
            autoFocus
            placeholder="Ej: Anticipo de cirugía, abono a saldo, alquiler de espacio, ingreso atrasado…"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
            <input
              name="fecha"
              type="date"
              defaultValue={hoyISO()}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
            <SelectField
              name="metodoPago"
              defaultValue="efectivo"
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Ficha / Paciente</label>
            <SelectField
              key={clienteId}
              name="fichaId"
              defaultValue=""
              disabled={!clienteId}
              options={[
                { value: "", label: "Sin asociar" },
                ...fichas.map((f) => ({ value: f.id, label: f.nombre })),
              ]}
            />
          </div>

          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea
              name="notas"
              rows={2}
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
            {pending ? "Guardando..." : "Registrar ingreso"}
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
};