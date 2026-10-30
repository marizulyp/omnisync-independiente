import { crearLogo } from "@/lib/logo"

// ── Datos de la clínica ─────────────────────────────────────────────────────
// ÚNICO archivo a editar para personalizar el sistema para cada cliente.
// Estos datos aparecen en el menú, el login, el título del navegador,
// las facturas, fórmulas médicas, historias clínicas imprimibles,
// informes y nombres de los archivos Excel.
// Los valores actuales son de demostración.

const NOMBRE = "Negocios Independientes"

export const CLINICA = {
  // Nombre comercial (menú, títulos, encabezados de documentos)
  nombre: NOMBRE,
  // Nombre legal (facturas y fórmulas)
  razonSocial: "Negocios Independientes S.A.S.",
  nit: "NIT 900.000.000-0",
  direccion: "Calle 00 # 00-00 · Ciudad",
  telefono: "Tel. (000) 000 0000",
  celular: "Cel. 300 000 0000",
  email: "contacto@negociosindependientes.com",

  // Logo: por defecto uno genérico generado con el nombre de la clínica.
  // Para usar el logo del cliente, copia la imagen en /public (p. ej. public/logo.png)
  // y reemplaza la línea por:  logo: "/logo.png",
  // Proporción recomendada 4:3 (se muestra a 200×150 px).
  logo: crearLogo(NOMBRE),
} as const

// Nombre sin tildes ni espacios, para nombres de archivo (p. ej. "Centro_Veterinario")
export const CLINICA_ARCHIVO = CLINICA.nombre
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .replace(/[^A-Za-z0-9]+/g, "_")
  .replace(/^_|_$/g, "")
