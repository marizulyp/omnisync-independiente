import type { Metadata, Viewport } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import localFont from "next/font/local"
import "./globals.css"
import { CLINICA } from "@/config/clinica"

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

// Íconos servidos desde la propia app (no desde Google), para que se vean
// aunque la clínica no tenga internet. "block": nunca mostrar el nombre del ícono como texto.
const iconos = localFont({
  src: "../../node_modules/material-symbols/material-symbols-outlined.woff2",
  variable: "--font-iconos",
  weight: "100 700",
  display: "block",
})

export const viewport: Viewport = {
  themeColor: "#1E3A6E",
  width: "device-width",
  initialScale: 1,
}

export const metadata: Metadata = {
  title: {
    default: CLINICA.nombre,
    template: `%s | ${CLINICA.nombre}`,
  },
  description: "Sistema de gestión veterinaria",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: CLINICA.nombre,
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="es" className={`${geist.variable} ${geistMono.variable} ${iconos.variable} h-full antialiased`}>
      <body className="min-h-full text-[#334155]" style={{ backgroundColor: "#F4F6F8" }}>
        {children}
      </body>
    </html>
  )
}
