import type { MetadataRoute } from "next"
import { CLINICA } from "@/config/clinica"

// Manifiesto de la app instalable (PWA). El nombre sale de src/config/clinica.ts
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${CLINICA.nombre} - Gestión Veterinaria`,
    short_name: CLINICA.nombre,
    description: `Plataforma de gestión para ${CLINICA.nombre}`,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1E3A6E",
    orientation: "any",
    lang: "es-CO",
    categories: ["medical", "business"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Nueva cita", url: "/agenda/nueva", description: "Registrar una nueva cita" },
      { name: "Buscar mascota", url: "/mascotas", description: "Buscar una mascota" },
    ],
  }
}
