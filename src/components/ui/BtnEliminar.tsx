"use client"
import { useState } from "react"
import { Icon } from "./Icon"

export function BtnEliminar({
  action,
  mensaje = "¿Eliminar este registro? Esta acción no se puede deshacer.",
}: {
  action: () => Promise<void>
  mensaje?: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        title="Eliminar"
        onClick={() => setOpen(true)}
        className="flex items-center justify-center rounded p-1 text-[#94A3B8] hover:text-[#DC2626] transition-colors"
      >
        <Icon name="delete" size={18} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
        >
          <div className="w-[380px] max-w-[calc(100vw-32px)] rounded-2xl bg-white shadow-2xl overflow-hidden">
            {/* Encabezado */}
            <div className="bg-[#FEF2F2] px-6 pt-6 pb-5 flex items-start gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#DC2626]">
                <Icon name="delete" size={22} className="text-white" />
              </div>
              <div>
                <p className="text-[15px] font-semibold text-[#0F1720]">Eliminar registro</p>
                <p className="mt-1.5 text-[13px] leading-[1.5] text-[#64748B]">{mensaje}</p>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex justify-end gap-2 border-t border-[#F1F5F9] px-6 py-4">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg border border-[#E2E8F0] px-4 py-2 text-[13px] font-medium text-[#475569] hover:bg-[#F8FAFC] transition-colors"
              >
                Cancelar
              </button>
              <form action={action}>
                <button
                  type="submit"
                  className="rounded-lg bg-[#DC2626] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#B91C1C] transition-colors"
                >
                  Eliminar
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
