"use client"

export function BtnImprimir() {
  return (
    <button
      onClick={() => {
        window.dispatchEvent(new CustomEvent("show-toast", { detail: "downloaded" }))
        window.print()
      }}
      className="ml-auto bg-[#1E3A6E] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#162D57] transition-colors"
    >
      Imprimir / Guardar PDF
    </button>
  )
}
