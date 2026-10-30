"use client"

import { useState, useRef, useEffect } from "react"
import { useActionState } from "react"
import Link from "next/link"
import { crearFactura } from "../actions"
import { SelectField } from "@/components/ui/SelectField"
import { Icon } from "@/components/ui/Icon"

const LABEL_FICHA: Record<string, string> = {
  veterinaria: "Paciente",
  taller: "Vehículo",
  barberia: "Ficha",
}

type ItemFila = { uid: string; descripcion: string; cantidad: string; precioUnit: string; productoId: string | null }
type ClienteOpt = {
  id: string
  nombre: string
  identificacion: string | null
  direccion: string | null
  fichas: { id: string; nombre: string }[]
}
export type ProductoOpt = { id: string; nombre: string; unidad: string; stock: number; precioVenta: number | null }

function fmtCOP(n: number) {
  return `$${n.toLocaleString("es-CO", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

let _uid = 0
function uid() { return String(++_uid) }
const filaVacia = (): ItemFila => ({ uid: uid(), descripcion: "", cantidad: "1", precioUnit: "0", productoId: null })

// Buscador de productos
function AgregarProducto({ productos, onElegir }: { productos: ProductoOpt[]; onElegir: (p: ProductoOpt) => void }) {
  const [texto, setTexto] = useState("")
  const [abierto, setAbierto] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fuera = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener("mousedown", fuera)
    return () => document.removeEventListener("mousedown", fuera)
  }, [])

  const filtro = texto.trim().toLowerCase()
  const lista = productos.filter((p) => !filtro || p.nombre.toLowerCase().includes(filtro)).slice(0, 8)

  return (
    <div ref={ref} className="relative w-full sm:w-[380px]">
      <div className="flex items-center gap-2 rounded-lg border border-[#1E3A6E] bg-white px-3 py-2">
        <Icon name="inventory_2" size={18} className="text-[#1E3A6E] shrink-0" />
        <input
          type="text"
          value={texto}
          onChange={(e) => { setTexto(e.target.value); setAbierto(true) }}
          onFocus={() => setAbierto(true)}
          placeholder="Agregar del inventario…"
          className="flex-1 bg-transparent text-sm focus:outline-none"
        />
      </div>
      {abierto && (
        <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 max-h-72 overflow-y-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
          {lista.length === 0 ? (
            <p className="px-3 py-2 text-sm text-gray-400">Sin coincidencias</p>
          ) : (
            lista.map((p) => (
              <button
                key={p.id}
                type="button"
                disabled={p.stock <= 0}
                onClick={() => { onElegir(p); setTexto(""); setAbierto(false) }}
                className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-[#E8EEFB] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium text-gray-900">{p.nombre}</span>
                  <span className={`block text-xs ${p.stock <= 0 ? "text-red-600" : "text-gray-500"}`}>
                    {p.stock <= 0 ? "Sin stock" : `Disponible: ${p.stock} ${p.unidad}`}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-gray-600">{p.precioVenta != null ? fmtCOP(p.precioVenta) : "Sin precio"}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export function NuevaFacturaForm({ clientes, productos, tipoNegocio = "veterinaria" }: { clientes: ClienteOpt[]; productos: ProductoOpt[], tipoNegocio?: string }) {
  const [state, formAction, pending] = useActionState(crearFactura, {})
  const [clienteId, setClienteId] = useState("")
  const [fichaId, setFichaId] = useState("")
  const [pctIva, setPctIva] = useState("19")
  const [items, setItems] = useState<ItemFila[]>([filaVacia()])

  const clienteSeleccionado = clientes.find((c) => c.id === clienteId)
  const fichas = clienteSeleccionado?.fichas ?? []
  const productoPorId = new Map(productos.map((p) => [p.id, p]))
  const labelFicha = LABEL_FICHA[tipoNegocio] || "Registro"

  function addItem() { setItems((prev) => [...prev, filaVacia()]) }
  function agregarProducto(p: ProductoOpt) {
    setItems((prev) => {
      const existente = prev.find((i) => i.productoId === p.id)
      if (existente) return prev.map((i) => i.uid === existente.uid ? { ...i, cantidad: String((parseFloat(i.cantidad) || 0) + 1) } : i)
      const nueva: ItemFila = { uid: uid(), descripcion: p.nombre, cantidad: "1", precioUnit: String(p.precioVenta ?? 0), productoId: p.id }
      const vacia = prev.length === 1 && !prev[0].descripcion.trim() && !prev[0].productoId
      return vacia ? [nueva] : [...prev, nueva]
    })
  }
  function removeItem(id: string) { setItems((prev) => prev.length > 1 ? prev.filter((i) => i.uid !== id) : [filaVacia()]) }
  function updateItem(id: string, field: "descripcion" | "cantidad" | "precioUnit", value: string) {
    setItems((prev) => prev.map((i) => i.uid === id ? { ...i, [field]: value } : i))
  }

  const subtotal = items.reduce((acc, item) => acc + (parseFloat(item.cantidad) || 0) * (parseFloat(item.precioUnit) || 0), 0)
  const ivaAmount = subtotal * ((parseFloat(pctIva) || 0) / 100)
  const total = subtotal + ivaAmount

  const sinStock = items.filter((i) => {
    const p = i.productoId ? productoPorId.get(i.productoId) : null
    return p && (parseFloat(i.cantidad) || 0) > p.stock
  })
  const conProductos = items.some((i) => i.productoId)

  const itemsData = items.map((item) => ({
    descripcion: item.descripcion,
    cantidad: parseFloat(item.cantidad) || 0,
    precioUnit: parseFloat(item.precioUnit) || 0,
    productoId: item.productoId,
  }))

  return (
    <div className="max-w-5xl mx-auto sm:p-6">
      <div className="mb-6">
        <Link href="/facturas" className="text-sm text-gray-500 hover:text-gray-700">← Volver a facturas</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-2">Nueva factura de venta</h1>
        <p className="mt-1 text-sm text-gray-500">Al guardar se genera el comprobante y se descuentan del inventario los productos vendidos.</p>
      </div>

      <form action={formAction} className="space-y-5">
        <input type="hidden" name="itemsJson" value={JSON.stringify(itemsData)} />

        {state.error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{state.error}</div>}

        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Datos del cliente</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
              <SelectField
                name="clienteId"
                value={clienteId}
                onChange={(val) => { setClienteId(val); setFichaId("") }}
                options={[
                  { value: "", label: "Sin cliente (venta directa)" },
                  ...clientes.map((c) => ({ value: c.id, label: c.nombre })),
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{labelFicha}</label>
              <SelectField
                key={clienteId}
                name="fichaId"
                value={fichaId}
                onChange={setFichaId}
                disabled={!clienteId}
                options={[
                  { value: "", label: `Sin ${labelFicha.toLowerCase()}` },
                  ...fichas.map((f) => ({ value: f.id, label: f.nombre })),
                ]}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Condición de pago</label>
              <SelectField
                name="condicion"
                defaultValue="Contado"
                options={[
                  { value: "Contado", label: "Contado (efectivo)" },
                  { value: "Tarjeta", label: "Tarjeta" },
                  { value: "Transferencia", label: "Transferencia" },
                  { value: "Crédito", label: "Crédito" },
                ]}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">% IVA</label>
              <input name="porcentajeIva" type="number" min="0" max="100" step="0.1" value={pctIva} onChange={(e) => setPctIva(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E]" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-semibold text-gray-800 text-sm uppercase tracking-wide">Productos / Servicios</h2>
            <AgregarProducto productos={productos} onElegir={agregarProducto} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-medium text-gray-500 uppercase">
                  <th className="text-left pb-2 pr-3 w-8">#</th>
                  <th className="text-left pb-2 pr-3">Descripción</th>
                  <th className="text-right pb-2 pr-3 w-24">Cant.</th>
                  <th className="text-right pb-2 pr-3 w-36">Precio unit.</th>
                  <th className="text-right pb-2 pr-3 w-36">Total</th>
                  <th className="w-6"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const qty = parseFloat(item.cantidad) || 0
                  const price = parseFloat(item.precioUnit) || 0
                  const rowTotal = qty * price
                  const producto = item.productoId ? productoPorId.get(item.productoId) : null
                  const excede = producto ? qty > producto.stock : false
                  return (
                    <tr key={item.uid} className="border-b border-gray-100 align-top">
                      <td className="py-2 pr-3 pt-4 text-gray-400 text-xs">{idx + 1}</td>
                      <td className="py-2 pr-3">
                        <input type="text" value={item.descripcion} onChange={(e) => updateItem(item.uid, "descripcion", e.target.value)} placeholder="Ítem libre…" className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-[#1E3A6E]" />
                        {producto && (
                          <p className={`mt-1 flex items-center gap-1 text-xs ${excede ? "text-red-600" : "text-[#1E3A6E]"}`}>
                            <Icon name="inventory_2" size={14} />
                            {excede ? `Solo hay ${producto.stock} disponibles` : `Inventario: ${producto.stock} disponibles`}
                          </p>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <input type="number" min="0" step="0.01" value={item.cantidad} onChange={(e) => updateItem(item.uid, "cantidad", e.target.value)} className={`w-full px-2 py-1.5 border rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-[#1E3A6E] ${excede ? "border-red-400" : "border-gray-200"}`} />
                      </td>
                      <td className="py-2 pr-3">
                        <input type="number" min="0" step="100" value={item.precioUnit} onChange={(e) => updateItem(item.uid, "precioUnit", e.target.value)} className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm text-right focus:outline-none focus:ring-1 focus:ring-[#1E3A6E]" />
                      </td>
                      <td className="py-2 pr-3 pt-4 text-right font-medium text-gray-800">{fmtCOP(rowTotal)}</td>
                      <td className="py-2 pt-3">
                        <button type="button" onClick={() => removeItem(item.uid)} className="text-red-400 hover:text-red-600 text-xl leading-none" title="Eliminar fila">×</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <button type="button" onClick={addItem} className="mt-3 text-sm text-[#1E3A6E] hover:text-[#162D57] font-medium">+ Agregar servicio u otro ítem</button>

          <div className="mt-6 pt-4 border-t border-gray-200 flex justify-end">
            <div className="w-full sm:w-72 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600"><span>Subtotal:</span><span className="font-medium text-gray-900">{fmtCOP(subtotal)}</span></div>
              <div className="flex justify-between text-gray-600"><span>IVA ({pctIva}%):</span><span className="font-medium text-gray-900">{fmtCOP(ivaAmount)}</span></div>
              <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-300"><span>TOTAL:</span><span className="text-[#1E3A6E]">{fmtCOP(total)}</span></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">Observaciones</label>
          <textarea name="observaciones" rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A6E] resize-none" />
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="submit" disabled={pending || sinStock.length > 0} className="bg-[#1E3A6E] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#162D57] disabled:opacity-50 transition-colors">
            {pending ? "Guardando..." : "Crear factura"}
          </button>
          <Link href="/facturas" className="px-6 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors">Cancelar</Link>
        </div>
      </form>
    </div>
  )
}