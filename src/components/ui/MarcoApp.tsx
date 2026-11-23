"use client"
import { useEffect, useState } from "react"
import { Icon } from "./Icon"

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
    <div className="omni-dashboard relative min-h-screen flex bg-[#F4F6F8] text-slate-900 dark:bg-zinc-950 dark:text-zinc-100 print:bg-white print:text-slate-900 print:block print:min-h-0 transition-colors duration-200">
      {/* Brillo ambiental esmeralda sutil solo en modo oscuro */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 hidden dark:block bg-[radial-gradient(ellipse_60%_40%_at_70%_0%,rgba(16,185,129,0.08),transparent_70%)] print:hidden"
      />

      {abierto && (
        <div
          className="fixed inset-0 z-40 bg-black/50 dark:bg-black/70 backdrop-blur-xs lg:hidden print:hidden"
          onClick={() => setAbierto(false)}
          aria-hidden
        />
      )}

      <aside
        id="menu-principal"
        className={`fixed inset-y-0 left-0 z-50 w-[248px] bg-white dark:bg-zinc-900/95 backdrop-blur-xl border-r border-slate-200 dark:border-white/10 flex flex-col shadow-xl transition-transform duration-200
          lg:static lg:z-10 lg:w-[236px] lg:shadow-none lg:translate-x-0 shrink-0 print:hidden
          ${abierto ? "translate-x-0" : "-translate-x-full"}`}
        onClick={(e) => {
          if ((e.target as HTMLElement).closest("a")) setAbierto(false)
        }}
      >
        {menu}
      </aside>

      <div className="relative z-10 flex flex-1 min-w-0 flex-col print:bg-white print:block">
        <header className="sticky top-0 z-30 flex h-[60px] shrink-0 items-center gap-3 bg-white/90 dark:bg-zinc-900/80 backdrop-blur-md border-b border-slate-200 dark:border-white/10 px-4 lg:static lg:gap-4 lg:px-6 print:hidden">
          <button
            type="button"
            onClick={() => setAbierto(true)}
            className="flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-700 hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200 dark:hover:bg-white/10 lg:hidden"
            aria-label="Abrir menú"
            aria-controls="menu-principal"
            aria-expanded={abierto}
          >
            <Icon name="menu" size={20} />
          </button>
          {encabezado}
        </header>

        <main className="flex-1 overflow-y-auto px-4 pt-5 pb-8 lg:px-6 lg:pt-6 print:overflow-visible print:p-0 print:flex-none print:block">
          {children}
        </main>
      </div>
    </div>
  )
}