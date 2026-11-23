"use client"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Icon } from "./Icon"
import type { GrupoBusqueda, ResultadoBusqueda } from "@/lib/busqueda"

const TEXTOS_BUSCADOR: Record<string, { placeholder: string; ayuda: string }> = {
  veterinaria: {
    placeholder: "Buscar mascota, propietario, factura…",
    ayuda: "Escribe al menos 2 letras: mascota, propietario, cédula, teléfono, No. de factura o producto.",
  },
  taller: {
    placeholder: "Buscar vehículo, placa, cliente, factura…",
    ayuda: "Escribe al menos 2 letras: vehículo, placa, cliente, teléfono, No. de factura o repuesto.",
  },
  barberia: {
    placeholder: "Buscar cliente, ficha, servicio, factura…",
    ayuda: "Escribe al menos 2 letras: cliente, ficha, teléfono, No. de factura o producto.",
  },
  medico: {
    placeholder: "Buscar paciente, cédula, factura…",
    ayuda: "Escribe al menos 2 letras: paciente, cédula, teléfono, No. de factura o producto.",
  },
}

export function BuscadorGlobal({ tipoNegocio = "veterinaria" }: { tipoNegocio?: string }) {
  const router = useRouter()
  const [q, setQ] = useState("")
  const [grupos, setGrupos] = useState<GrupoBusqueda[]>([])
  const [cargando, setCargando] = useState(false)
  const [abierto, setAbierto] = useState(false)
  const [movil, setMovil] = useState(false)
  const [activo, setActivo] = useState(0)
  const cajaRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const inputMovilRef = useRef<HTMLInputElement>(null)

  const textos = TEXTOS_BUSCADOR[tipoNegocio] || TEXTOS_BUSCADOR.veterinaria
  const items: ResultadoBusqueda[] = grupos.flatMap((g) => g.items)
  const buscando = q.trim().length >= 2

  useEffect(() => {
    const texto = q.trim()
    if (texto.length < 2) return
    const control = new AbortController()
    const espera = setTimeout(async () => {
      try {
        const res = await fetch(`/api/buscar?q=${encodeURIComponent(texto)}`, { signal: control.signal })
        const datos = res.ok ? await res.json() : { grupos: [] }
        setGrupos(datos.grupos ?? [])
        setActivo(0)
      } catch {
        // búsqueda reemplazada por otra más reciente
      } finally {
        if (!control.signal.aborted) setCargando(false)
      }
    }, 250)
    return () => {
      clearTimeout(espera)
      control.abort()
    }
  }, [q])

  useEffect(() => {
    const alTeclear = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        if (window.matchMedia("(min-width: 768px)").matches) {
          inputRef.current?.focus()
          setAbierto(true)
        } else {
          setMovil(true)
        }
      }
    }
    const alHacerClic = (e: MouseEvent) => {
      if (cajaRef.current && !cajaRef.current.contains(e.target as Node)) setAbierto(false)
    }
    document.addEventListener("keydown", alTeclear)
    document.addEventListener("mousedown", alHacerClic)
    return () => {
      document.removeEventListener("keydown", alTeclear)
      document.removeEventListener("mousedown", alHacerClic)
    }
  }, [])

  function cambiarTexto(valor: string) {
    setQ(valor)
    setAbierto(true)
    if (valor.trim().length >= 2) setCargando(true)
    else setGrupos([])
  }

  function ir(item: ResultadoBusqueda) {
    router.push(item.href)
    setQ("")
    setGrupos([])
    setAbierto(false)
    setMovil(false)
    inputRef.current?.blur()
  }

  function alPresionar(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActivo((i) => Math.min(i + 1, items.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActivo((i) => Math.max(i - 1, 0))
    } else if (e.key === "Enter" && items[activo]) {
      e.preventDefault()
      ir(items[activo])
    } else if (e.key === "Escape") {
      setAbierto(false)
      setMovil(false)
      e.currentTarget.blur()
    }
  }

  const lista = (
    <div className="max-h-[70vh] overflow-y-auto py-1">
      {!buscando ? (
        <p className="px-4 py-3 text-[13px] text-zinc-500">{textos.ayuda}</p>
      ) : cargando && items.length === 0 ? (
        <p className="px-4 py-3 text-[13px] text-zinc-500">Buscando…</p>
      ) : items.length === 0 ? (
        <p className="px-4 py-3 text-[13px] text-zinc-400">Sin resultados para “{q.trim()}”.</p>
      ) : (
        grupos.map((g) => (
          <div key={g.titulo} className="py-1">
            <p className="px-4 pt-2 pb-1 font-mono text-[10.5px] tracking-[0.1em] text-zinc-500 uppercase">{g.titulo}</p>
            {g.items.map((item) => {
              const indice = items.indexOf(item)
              return (
                <button
                  key={item.href}
                  type="button"
                  onMouseEnter={() => setActivo(indice)}
                  onClick={() => ir(item)}
                  className={`flex w-full items-center gap-3 px-4 py-2 text-left transition-colors ${
                    indice === activo ? "bg-emerald-500/15" : "hover:bg-white/5"
                  }`}
                >
                  <Icon name={item.icono} size={18} className="text-emerald-400 shrink-0" />
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-medium text-zinc-100">{item.titulo}</span>
                    <span className="block truncate text-[12px] text-zinc-400">{item.detalle}</span>
                  </span>
                </button>
              )
            })}
          </div>
        ))
      )}
    </div>
  )

  return (
    <>
      {/* Escritorio y tablet */}
      <div ref={cajaRef} className="relative hidden md:block flex-1 max-w-[440px]">
        <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 px-3 py-[7px] focus-within:border-emerald-500/70 focus-within:bg-black/60 transition-colors">
          <Icon name="search" size={18} className="text-zinc-500 shrink-0" />
          <input
            ref={inputRef}
            type="search"
            value={q}
            onChange={(e) => cambiarTexto(e.target.value)}
            onFocus={() => setAbierto(true)}
            onKeyDown={alPresionar}
            placeholder={textos.placeholder}
            aria-label="Buscar en todo el sistema"
            className="flex-1 bg-transparent text-[13px] text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
          />
          <span className="shrink-0 rounded border border-white/10 bg-white/5 px-1.5 py-px font-mono text-[11px] text-zinc-500">
            Ctrl K
          </span>
        </div>
        {abierto && (
          <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 rounded-xl border border-white/10 bg-zinc-900 shadow-2xl">
            {lista}
          </div>
        )}
      </div>

      {/* Celular: lupa que abre el buscador a pantalla completa */}
      <button
        type="button"
        onClick={() => {
          setMovil(true)
          setTimeout(() => inputMovilRef.current?.focus(), 50)
        }}
        className="flex items-center justify-center rounded-lg border border-white/10 bg-white/5 p-2 text-zinc-200 hover:bg-white/10 md:hidden"
        aria-label="Buscar"
      >
        <Icon name="search" size={20} />
      </button>
      {movil && (
        <div className="fixed inset-0 z-[60] flex flex-col bg-zinc-950 md:hidden">
          <div className="flex items-center gap-2 border-b border-white/10 p-3">
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-emerald-500/60 bg-black/50 px-3 py-2">
              <Icon name="search" size={18} className="text-zinc-500 shrink-0" />
              <input
                ref={inputMovilRef}
                type="search"
                value={q}
                onChange={(e) => cambiarTexto(e.target.value)}
                onKeyDown={alPresionar}
                placeholder={textos.placeholder}
                aria-label="Buscar en todo el sistema"
                className="flex-1 bg-transparent text-[15px] text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setMovil(false)}
              className="rounded-lg px-3 py-2 text-[14px] text-emerald-400 hover:bg-white/5"
            >
              Cerrar
            </button>
          </div>
          {lista}
        </div>
      )}
    </>
  )
}