"use client"
import { useEffect } from "react"
import { useRouter } from "next/navigation"

// Vuelve a pedir los datos de la página al servidor cada `segundos`, para que
// pantallas como la Agenda muestren lo que otros equipos registran sin recargar.
// Solo actúa con la pestaña visible, y refresca al volver a ella.
// router.refresh() conserva el estado de la pantalla (scroll, campos escritos).
export function AutoRefresh({ segundos = 60 }: { segundos?: number }) {
  const router = useRouter()

  useEffect(() => {
    const refrescar = () => {
      if (document.visibilityState === "visible") router.refresh()
    }
    const intervalo = window.setInterval(refrescar, segundos * 1000)
    document.addEventListener("visibilitychange", refrescar)
    return () => {
      window.clearInterval(intervalo)
      document.removeEventListener("visibilitychange", refrescar)
    }
  }, [router, segundos])

  return null
}
