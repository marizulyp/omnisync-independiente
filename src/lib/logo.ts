// Logo genérico: insignia (huella + cruz médica) y el nombre de la clínica.
// Se genera como SVG embebido (data URI) para que funcione igual en pantalla
// y en los documentos imprimibles, sin depender de archivos en disco.
// Para usar el logo propio de una clínica, ver `logo` en src/config/clinica.ts.

const AZUL = "#1E3A6E"
const GRIS = "#64748B"
const FUENTE = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif"

// Insignia en un lienzo de 64×64
export const insigniaSvg = `
  <rect width="64" height="64" rx="16" fill="${AZUL}"/>
  <circle cx="14.5" cy="25" r="5" fill="#fff"/>
  <circle cx="25" cy="15.5" r="5.6" fill="#fff"/>
  <circle cx="39" cy="15.5" r="5.6" fill="#fff"/>
  <circle cx="49.5" cy="25" r="5" fill="#fff"/>
  <ellipse cx="32" cy="41" rx="14.5" ry="12.5" fill="#fff"/>
  <rect x="30" y="34" width="4" height="14" rx="1" fill="${AZUL}"/>
  <rect x="25" y="39" width="14" height="4" rx="1" fill="${AZUL}"/>`

function escaparXml(texto: string) {
  return texto.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
}

function aDataUri(svg: string) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

// Logo 200×150 (mismo formato que usan menú, login e impresos).
// La primera palabra del nombre va como antetítulo y el resto como nombre principal.
export function crearLogo(nombre: string) {
  const [primera, ...resto] = nombre.trim().split(/\s+/)
  const antetitulo = resto.length ? primera.toUpperCase() : ""
  const principal = resto.length ? resto.join(" ") : primera
  const tamano = Math.min(28, Math.floor(320 / Math.max(principal.length, 1)))

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 150">
  <g transform="translate(68 6)">${insigniaSvg}</g>
  ${antetitulo ? `<text x="100" y="94" text-anchor="middle" font-family="${FUENTE}" font-size="12" font-weight="600" letter-spacing="4" fill="${GRIS}">${escaparXml(antetitulo)}</text>` : ""}
  <text x="100" y="${antetitulo ? 124 : 112}" text-anchor="middle" font-family="${FUENTE}" font-size="${tamano}" font-weight="700" fill="${AZUL}">${escaparXml(principal)}</text>
</svg>`
  return aDataUri(svg)
}
