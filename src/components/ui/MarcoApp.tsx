"use client"
import { useEffect, useState } from "react"
import { Icon } from "./Icon"

// Estructura de la app: menú lateral + encabezado + contenido.
// En pantallas grandes (lg, desde 1024 px) el menú está siempre visible.
// En tablets pequeñas y celulares se oculta y se abre con el botón ☰ como panel
// deslizable; se cierra al elegir una opción, al tocar fuera o con Escape.
export function MarcoApp({
  menu,
  encabezado,
  children,
}: {
  menu: React.ReactNode
  encabezado: React.ReactNode
  children: React.ReactNode
}) {
  const [abierto, setAbierto] = useState(false)

  useEffect(() => {
    if (!abierto) return
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAbierto(false)
    }
    document.addEventListener("keydown", alPresionar)
    return () => document.removeEventListener("keydown", alPresionar)
  }, [abierto])

  return (
    <div className="min-h-screen flex bg-[#F4F6F8] print:bg-white print:block print:min-h-0">
      {/* Fondo oscuro detrás del menú abierto (solo celular/tablet) */}
      {abierto && (
        <div
          className="fixed inset-0 z-40 bg-[#0F1720]/40 lg:hidden print:hidden"
          onClick={() => setAbierto(false)}
          aria-hidden
        />
      )}

      <aside
        id="menu-principal"
        className={`fixed inset-y-0 left-0 z-50 w-[248px] bg-white flex flex-col shadow-xl transition-transform duration-200
          lg:static lg:z-auto lg:w-[232px] lg:shadow-none lg:translate-x-0 shrink-0 print:hidden
          ${abierto ? "translate-x-0" : "-translate-x-full"}`}
        style={{ borderRight: "1px solid #E2E8F0" }}
        onClick={(e) => {
          // Al elegir una opción del menú, cerrarlo
          if ((e.target as HTMLElement).closest("a")) setAbierto(false)
        }}
      >
        {menu}
      </aside>

      <div className="flex flex-1 min-w-0 flex-col print:bg-white print:block">
        <header
          className="sticky top-0 z-30 flex h-[58px] shrink-0 items-center gap-3 bg-white px-4 lg:static lg:gap-4 lg:px-6 print:hidden"
          style={{ borderBottom: "1px solid #E2E8F0" }}
        >
          <button
            type="button"
            onClick={() => setAbierto(true)}
            className="flex items-center justify-center rounded-[7px] border border-[#E2E8F0] p-2 text-[#334155] hover:bg-[#F8FAFC] lg:hidden"
            aria-label="Abrir menú"
            aria-controls="menu-principal"
            aria-expanded={abierto}
          >
            <Icon name="menu" size={20} />
          </button>
          {encabezado}
        </header>

        <main className="flex-1 overflow-y-auto px-4 pt-4 pb-8 lg:px-6 lg:pt-[22px] print:overflow-visible print:p-0 print:flex-none print:block">
          {children}
        </main>
      </div>
    </div>
  )
}
