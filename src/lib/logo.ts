function escaparXml(texto: string): string {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

function obtenerIconoSvg(tipo: string): { icono: string; subtitulo: string } {
  switch (tipo) {
    case "barberia":
      return {
        subtitulo: "BARBERÍA & BELLEZA",
        // Tijeras + peinilla
        icono: `
          <g stroke="#34D399" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none">
            <circle cx="5.5" cy="6.5" r="2.3" stroke="#FFFFFF" />
            <circle cx="5.5" cy="17.5" r="2.3" stroke="#FFFFFF" />
            <line x1="7.4" y1="7.9" x2="15.2" y2="16.5" stroke="#FFFFFF" />
            <line x1="7.4" y1="16.1" x2="15.2" y2="7.5" stroke="#FFFFFF" />
            <line x1="19.5" y1="4.5" x2="19.5" y2="19.5" />
            <line x1="16.5" y1="6.2" x2="19.5" y2="6.2" />
            <line x1="16.5" y1="9.1" x2="19.5" y2="9.1" />
            <line x1="16.5" y1="12" x2="19.5" y2="12" />
            <line x1="16.5" y1="14.9" x2="19.5" y2="14.9" />
            <line x1="16.5" y1="17.8" x2="19.5" y2="17.8" />
          </g>
        `,
      }

    case "taller":
      return {
        subtitulo: "TALLER MECÁNICO",
        // Llave inglesa + engranaje
        icono: `
          <g stroke="#34D399" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none">
            <path d="M14.7 6.3a4.5 4.5 0 0 0-6.1 5.9L4 16.8a1.8 1.8 0 0 0 2.6 2.6l4.6-4.6a4.5 4.5 0 0 0 5.9-6.1l-2.6 2.6-2.4-.6-.6-2.4 2.6-2.6z" stroke="#FFFFFF" />
            <circle cx="17.5" cy="17.5" r="2.5" />
            <line x1="17.5" y1="13.8" x2="17.5" y2="14.6" />
            <line x1="17.5" y1="20.4" x2="17.5" y2="21.2" />
            <line x1="13.8" y1="17.5" x2="14.6" y2="17.5" />
            <line x1="20.4" y1="17.5" x2="21.2" y2="17.5" />
          </g>
        `,
      }

    case "medico":
      return {
        subtitulo: "SALUD & CONSULTORIO",
        // Escudo médico
        icono: `
          <g stroke="#34D399" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none">
            <path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6l7-3z" />
            <path d="M12 8.5v7M8.5 12h7" stroke="#FFFFFF" stroke-width="2" />
          </g>
        `,
      }

    case "veterinaria":
      return {
        subtitulo: "VETERINARIA",
        // Huella + cruz
        icono: `
          <g>
            <circle cx="6.5" cy="9.5" r="1.6" fill="#34D399" />
            <circle cx="10" cy="6.5" r="1.6" fill="#34D399" />
            <circle cx="14" cy="6.5" r="1.6" fill="#34D399" />
            <circle cx="17.5" cy="9.5" r="1.6" fill="#34D399" />
            <path d="M7 15.8c0-2.6 2.2-4.6 5-4.6s5 2 5 4.6c0 2-1.5 3.4-3.4 3.4h-3.2C8.5 19.2 7 17.8 7 15.8z" fill="#FFFFFF" />
            <path d="M12 13.5v3.6M10.2 15.3h3.6" stroke="#090D0C" stroke-width="1.8" stroke-linecap="round" />
          </g>
        `,
      }

    default:
      return {
        subtitulo: "OMNISYNC",
        icono: `
          <g stroke="#34D399" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none">
            <circle cx="12" cy="12" r="7.5" stroke="#FFFFFF" />
            <path d="M9.5 14.5c.8.8 2.1 1 3.3.6 1.5-.5 2-2.2.8-3.1l-2.2-1.2c-1.2-.8-.7-2.6.8-3 1.2-.3 2.5-.1 3.3.7" />
          </g>
        `,
      }
  }
}

export function crearLogo(
  nombre: string,
  tipoNegocio: string = "veterinaria",
  tema: "light" | "dark" = "light"
): string {
  const nombreSeguro = escaparXml(nombre.trim() || "Mi Negocio")
  const tipoNormalizado = (tipoNegocio || "veterinaria").toLowerCase().trim()
  const { icono, subtitulo } = obtenerIconoSvg(tipoNormalizado)

  const tamanoFuente =
    nombre.length > 22 ? 13 : nombre.length > 16 ? 15 : nombre.length > 12 ? 18 : 22

  const colorNombre = tema === "dark" ? "#F4F4F5" : "#0F172A"
  const colorSubtitulo = tema === "dark" ? "#34D399" : "#059669"

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150" width="200" height="150">
      <defs>
        <linearGradient id="omniBadgeBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#112A22" />
          <stop offset="100%" stop-color="#090D0C" />
        </linearGradient>
        <linearGradient id="omniBadgeBorder" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#34D399" stop-opacity="0.7" />
          <stop offset="100%" stop-color="#06B6D4" stop-opacity="0.4" />
        </linearGradient>
      </defs>

      <rect x="66" y="14" width="68" height="68" rx="18" fill="url(#omniBadgeBg)" stroke="url(#omniBadgeBorder)" stroke-width="1.8" />

      <g transform="translate(78, 26) scale(1.833)">
        ${icono}
      </g>

      <text x="100" y="114" text-anchor="middle" font-family="system-ui, -apple-system, Segoe UI, sans-serif" font-size="${tamanoFuente}" font-weight="800" fill="${colorNombre}">
        ${nombreSeguro}
      </text>

      <text x="100" y="133" text-anchor="middle" font-family="ui-monospace, SFMono-Regular, monospace" font-size="8.5" font-weight="600" letter-spacing="1.4" fill="${colorSubtitulo}">
        ${subtitulo}
      </text>
    </svg>
  `.trim()

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}