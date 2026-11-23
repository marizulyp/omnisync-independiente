"use client"

import { useEffect, useState } from "react"
import { Icon } from "./Icon"

export function BotonTema() {
  const [esOscuro, setEsOscuro] = useState(true)
  const [montado, setMontado] = useState(false)

  useEffect(() => {
    const oscuroActual = document.documentElement.classList.contains("dark")
    setEsOscuro(oscuroActual)
    setMontado(true)
  }, [])

  function alternarTema() {
    const nuevoOscuro = !esOscuro
    setEsOscuro(nuevoOscuro)
    if (nuevoOscuro) {
      document.documentElement.classList.add("dark")
      localStorage.setItem("omnisync-tema", "dark")
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("omnisync-tema", "light")
    }
  }

  return (
    <button
      type="button"
      onClick={alternarTema}
      title={esOscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      aria-label={esOscuro ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      className="flex h-[36px] w-[36px] shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-white/10 dark:bg-white/5 dark:text-zinc-300 dark:hover:bg-white/10 dark:hover:text-emerald-400 transition-colors"
    >
      <Icon name={montado ? (esOscuro ? "light_mode" : "dark_mode") : "light_mode"} size={18} />
    </button>
  )
}