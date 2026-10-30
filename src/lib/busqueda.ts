// Tipos compartidos por la búsqueda global (API /api/buscar y el buscador del encabezado)
export type ResultadoBusqueda = { href: string; titulo: string; detalle: string; icono: string }
export type GrupoBusqueda = { titulo: string; items: ResultadoBusqueda[] }
