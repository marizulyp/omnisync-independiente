"use client"
import { useEffect, useRef, useState } from "react"

type Props = {
  url: string
  nombre: string
  fecha: string
}

export function PdfViewer({ url, nombre, fecha }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [estado, setEstado] = useState<"cargando" | "listo" | "error">("cargando")

  useEffect(() => {
    let cancelado = false

    async function renderizar() {
      try {
        const pdfjsLib = await import("pdfjs-dist")
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"

        const pdf = await pdfjsLib.getDocument({ url }).promise
        if (cancelado || !containerRef.current) return

        const contenedor = containerRef.current
        contenedor.innerHTML = ""

        for (let i = 1; i <= pdf.numPages; i++) {
          if (cancelado) return
          const pagina = await pdf.getPage(i)
          const viewport = pagina.getViewport({ scale: 2.0 })

          const canvas = document.createElement("canvas")
          canvas.width = viewport.width
          canvas.height = viewport.height
          canvas.style.cssText = "width:100%;display:block;border:1px solid #E2E8F0;border-radius:4px;margin-bottom:6px;"

          await pagina.render({ canvas, viewport }).promise
          pagina.cleanup()

          contenedor.appendChild(canvas)
        }

        if (!cancelado) setEstado("listo")
      } catch {
        if (!cancelado) setEstado("error")
      }
    }

    renderizar()
    return () => { cancelado = true }
  }, [url])

  return (
    <div style={{ marginBottom: 20, pageBreakInside: "avoid" }}>
      <p style={{ fontSize: 9.5, color: "#64748B", marginBottom: 6, fontWeight: 600 }}>
        📄 {nombre} · {fecha}
      </p>

      {estado === "cargando" && (
        <div style={{ padding: "10px 12px", background: "#F8FAFC", borderRadius: 6, fontSize: 11, color: "#94A3B8" }}>
          Cargando documento PDF…
        </div>
      )}
      {estado === "error" && (
        <div style={{ padding: "10px 12px", background: "#FEF2F2", borderRadius: 6, fontSize: 11, color: "#DC2626" }}>
          No se pudo renderizar el PDF. Abre el archivo directamente para visualizarlo.
        </div>
      )}

      <div ref={containerRef} />
    </div>
  )
}
