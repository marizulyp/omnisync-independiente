/**
 * Centro Veterinario — Documento Técnico Completo
 * Generado automáticamente el 2026-07-14
 */
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  PageNumber, Header, Footer, PageBreak, LevelFormat, UnderlineType,
} = require("docx")
const fs = require("fs")
const path = require("path")

// ─── Colores ──────────────────────────────────────────────────────────────────
const C = {
  azul:      "1E3A5F",
  azulMedio: "2E5F8A",
  azulClaro: "D6E4F0",
  verde:     "1A6B3A",
  verdeClaro:"D4EDDA",
  grisOscuro:"2D2D2D",
  grisMedio: "666666",
  grisClaro: "F5F5F5",
  blanco:    "FFFFFF",
  amarillo:  "FFF3CD",
  rojo:      "8B1A1A",
  rojoClaro: "F8D7DA",
}

// ─── Helpers básicos ─────────────────────────────────────────────────────────
const pageW = 9360   // US Letter 8.5" − 2×1" margins
const borde = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" }
const bordes = { top: borde, bottom: borde, left: borde, right: borde }
const bordesSinBorde = {
  top: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  bottom: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  left: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
  right: { style: BorderStyle.NONE, size: 0, color: "FFFFFF" },
}

function espacioVacio(pt = 6) {
  return new Paragraph({ spacing: { before: 0, after: pt * 20 }, children: [] })
}

function parrafo(texto, opciones = {}) {
  const { bold = false, italic = false, color = C.grisOscuro, size = 22,
          align = AlignmentType.LEFT, before = 0, after = 120, indent = 0 } = opciones
  return new Paragraph({
    alignment: align,
    spacing: { before, after },
    indent: indent ? { left: indent } : undefined,
    children: [new TextRun({ text: texto, bold, italic, color, size, font: "Calibri" })],
  })
}

function h1(texto) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 480, after: 200 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.azul, space: 4 } },
    children: [new TextRun({ text: texto, bold: true, color: C.azul, size: 36, font: "Calibri" })],
  })
}

function h2(texto) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 320, after: 160 },
    children: [new TextRun({ text: texto, bold: true, color: C.azulMedio, size: 28, font: "Calibri" })],
  })
}

function h3(texto) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text: texto, bold: true, color: C.grisOscuro, size: 24, font: "Calibri" })],
  })
}

function bullet(texto, nivel = 0) {
  return new Paragraph({
    numbering: { reference: "bullets", level: nivel },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text: texto, size: 22, font: "Calibri", color: C.grisOscuro })],
  })
}

function celdaHeader(texto, w, opts = {}) {
  const { align = AlignmentType.LEFT } = opts
  return new TableCell({
    borders: bordes,
    width: { size: w, type: WidthType.DXA },
    shading: { fill: C.azul, type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({
      alignment: align,
      children: [new TextRun({ text: texto, bold: true, color: C.blanco, size: 20, font: "Calibri" })],
    })],
  })
}

function celda(texto, w, opts = {}) {
  const { align = AlignmentType.LEFT, bg = C.blanco, bold = false, color = C.grisOscuro } = opts
  return new TableCell({
    borders: bordes,
    width: { size: w, type: WidthType.DXA },
    shading: { fill: bg, type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 120, right: 120 },
    children: [new Paragraph({
      alignment: align,
      children: [new TextRun({ text: texto, size: 20, font: "Calibri", bold, color })],
    })],
  })
}

function tabla(headers, filas, widths) {
  const totalW = widths.reduce((a, b) => a + b, 0)
  return new Table({
    width: { size: totalW, type: WidthType.DXA },
    columnWidths: widths,
    rows: [
      new TableRow({ children: headers.map((h, i) => celdaHeader(h, widths[i])) }),
      ...filas.map((fila, ri) =>
        new TableRow({
          children: fila.map((texto, i) => {
            const bg = ri % 2 === 0 ? C.blanco : C.grisClaro
            if (typeof texto === "object") return new TableCell({
              borders: bordes,
              width: { size: widths[i], type: WidthType.DXA },
              shading: { fill: texto.bg ?? bg, type: ShadingType.CLEAR },
              margins: { top: 80, bottom: 80, left: 120, right: 120 },
              children: [new Paragraph({
                alignment: texto.align ?? AlignmentType.LEFT,
                children: [new TextRun({ text: texto.text, size: 20, font: "Calibri", bold: texto.bold ?? false, color: texto.color ?? C.grisOscuro })],
              })],
            })
            return celda(texto, widths[i], { bg })
          }),
        })
      ),
    ],
  })
}

function cajaInfo(titulo, texto, color = C.azulClaro) {
  return new Table({
    width: { size: pageW, type: WidthType.DXA },
    columnWidths: [pageW],
    rows: [new TableRow({ children: [new TableCell({
      borders: bordesSinBorde,
      width: { size: pageW, type: WidthType.DXA },
      shading: { fill: color, type: ShadingType.CLEAR },
      margins: { top: 120, bottom: 120, left: 180, right: 180 },
      children: [
        titulo ? new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: titulo, bold: true, size: 22, font: "Calibri", color: C.azul })] }) : espacioVacio(0),
        new Paragraph({ children: [new TextRun({ text: texto, size: 21, font: "Calibri", color: C.grisOscuro, italic: true })] }),
      ],
    })]})],
  })
}

function saltoPagina() {
  return new Paragraph({ children: [new PageBreak()] })
}

// ─── Portada ─────────────────────────────────────────────────────────────────
function portada() {
  return [
    espacioVacio(80),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 80 },
      children: [new TextRun({ text: "🐾", size: 120 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 120 },
      children: [new TextRun({ text: "CENTRO VETERINARIO", bold: true, size: 72, color: C.azul, font: "Calibri" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
      children: [new TextRun({ text: "Plataforma de Gestión Veterinaria", size: 36, color: C.azulMedio, font: "Calibri" })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
      children: [new TextRun({ text: "Documento Técnico Completo — Estado Actual del Sistema", size: 28, color: C.grisMedio, font: "Calibri", italic: true })],
    }),
    espacioVacio(20),
    new Table({
      width: { size: 5400, type: WidthType.DXA },
      columnWidths: [2200, 3200],
      rows: [
        new TableRow({ children: [
          new TableCell({ borders: bordesSinBorde, width: { size: 2200, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Versión:", bold: true, size: 22, font: "Calibri", color: C.grisMedio })] })] }),
          new TableCell({ borders: bordesSinBorde, width: { size: 3200, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, shading: { fill: C.azulClaro, type: ShadingType.CLEAR }, children: [new Paragraph({ children: [new TextRun({ text: "v3.0 — Fases 0 a 7 completadas", size: 22, font: "Calibri", color: C.azul, bold: true })] })] }),
        ]}),
        new TableRow({ children: [
          new TableCell({ borders: bordesSinBorde, width: { size: 2200, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Fecha:", bold: true, size: 22, font: "Calibri", color: C.grisMedio })] })] }),
          new TableCell({ borders: bordesSinBorde, width: { size: 3200, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "14 de julio de 2026", size: 22, font: "Calibri", color: C.grisOscuro })] })] }),
        ]}),
        new TableRow({ children: [
          new TableCell({ borders: bordesSinBorde, width: { size: 2200, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Tipo de despliegue:", bold: true, size: 22, font: "Calibri", color: C.grisMedio })] })] }),
          new TableCell({ borders: bordesSinBorde, width: { size: 3200, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "Red local (LAN) — sin nube", size: 22, font: "Calibri", color: C.grisOscuro })] })] }),
        ]}),
        new TableRow({ children: [
          new TableCell({ borders: bordesSinBorde, width: { size: 2200, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Acceso:", bold: true, size: 22, font: "Calibri", color: C.grisMedio })] })] }),
          new TableCell({ borders: bordesSinBorde, width: { size: 3200, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "http://192.168.1.XX:3001", size: 22, font: "Calibri", color: C.grisOscuro })] })] }),
        ]}),
        new TableRow({ children: [
          new TableCell({ borders: bordesSinBorde, width: { size: 2200, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: "Módulos activos:", bold: true, size: 22, font: "Calibri", color: C.grisMedio })] })] }),
          new TableCell({ borders: bordesSinBorde, width: { size: 3200, type: WidthType.DXA }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ children: [new TextRun({ text: "9 módulos (Dashboard, Clientes, Mascotas, Agenda, Historia Clínica, Inventario, Finanzas, Recordatorios, Informes)", size: 22, font: "Calibri", color: C.grisOscuro })] })] }),
        ]}),
      ],
    }),
    saltoPagina(),
  ]
}

// ─── Sección 1: Resumen Ejecutivo ────────────────────────────────────────────
function seccionResumen() {
  return [
    h1("1. Resumen Ejecutivo"),
    parrafo("Centro Veterinario es una plataforma web de gestión veterinaria desarrollada para uso exclusivo en red local (LAN), sin dependencia de internet ni de servidores en la nube. El sistema funciona desde un computador que actúa como servidor y es accesible desde hasta 3 dispositivos simultáneos (1 tablet + 2 computadores) conectados a la misma red WiFi del consultorio."),
    espacioVacio(),
    parrafo("El sistema centraliza en una única base de datos todas las operaciones del consultorio: ficha de clientes y mascotas, historia clínica completa (consultas, vacunas, desparasitaciones), agenda de citas, inventario de productos, control interno de ingresos y egresos, recordatorios automáticos y manuales, e informes administrativos imprimibles."),
    espacioVacio(),
    h2("Estado de avance"),
    tabla(
      ["Fase", "Módulo / Objetivo", "Estado", "Fecha"],
      [
        ["0", "Infraestructura base — Next.js, Prisma, Auth, Tailwind, PWA", { text: "✅ Completada", color: C.verde, bold: true }, "Jun 20, 2026"],
        ["1", "CRUD base — Clientes, Mascotas, Usuarios, Empleados", { text: "✅ Completada", color: C.verde, bold: true }, "Jun 20, 2026"],
        ["2", "Historia Clínica — Consultas, Vacunas, Desparasitaciones", { text: "✅ Completada", color: C.verde, bold: true }, "Jun 21, 2026"],
        ["3", "Agenda — Citas por día + horario del personal", { text: "✅ Completada", color: C.verde, bold: true }, "Jun 21, 2026"],
        ["4", "Inventario — Productos + movimientos de stock", { text: "✅ Completada", color: C.verde, bold: true }, "Jun 21, 2026"],
        ["5", "Finanzas — Cobros internos y egresos", { text: "✅ Completada", color: C.verde, bold: true }, "Jun 21, 2026"],
        ["6", "Recordatorios — Alertas automáticas + manuales", { text: "✅ Completada", color: C.verde, bold: true }, "Jun 21, 2026"],
        ["7", "Informes — Reporte administrativo imprimible", { text: "✅ Completada", color: C.verde, bold: true }, "Jun 21, 2026"],
        ["8", "Configuración LAN + Backups automáticos", { text: "⏳ Pendiente", color: "AA6600", bold: true }, "—"],
        ["9", "Pruebas en 3 dispositivos reales", { text: "⏳ Pendiente", color: "AA6600", bold: true }, "—"],
      ],
      [500, 4200, 2000, 1260]
    ),
    saltoPagina(),
  ]
}

// ─── Sección 2: Stack Tecnológico ────────────────────────────────────────────
function seccionStack() {
  return [
    h1("2. Stack Tecnológico"),
    parrafo("El sistema utiliza un stack moderno de JavaScript/TypeScript para frontend y backend, con PostgreSQL como base de datos relacional. Toda la lógica corre en el mismo proceso de Next.js — no hay un backend separado."),
    espacioVacio(),

    h2("2.1 Dependencias principales"),
    tabla(
      ["Paquete", "Versión", "Rol en el sistema"],
      [
        ["next", "16.2.9", "Framework principal — App Router, Server Actions, Turbopack"],
        ["react / react-dom", "19.2.4", "UI — Server Components y Client Components"],
        ["typescript", "5.x", "Tipado estático en todo el proyecto"],
        ["tailwindcss", "4.x", "Estilos CSS utilitarios — usa @import 'tailwindcss' en CSS"],
        ["prisma (CLI)", "7.8.0", "ORM — gestión de migraciones y generación de cliente"],
        ["@prisma/client", "7.8.0", "Cliente WASM — consultas a la base de datos"],
        ["@prisma/adapter-pg", "7.8.0", "Adaptador que conecta el cliente WASM con PostgreSQL"],
        ["pg", "8.22.0", "Driver nativo de PostgreSQL para Node.js"],
        ["next-auth (Auth.js)", "5.0.0-beta.31", "Autenticación — sesiones JWT, login con credenciales"],
        ["@auth/prisma-adapter", "2.11.2", "Adaptador de Auth.js para Prisma"],
        ["bcryptjs", "3.0.3", "Hash de contraseñas con bcrypt"],
      ],
      [2000, 1400, 5160]
    ),
    espacioVacio(),

    h2("2.2 Particularidades del stack"),
    h3("Next.js 16 — App Router"),
    bullet("Todos los archivos de página están bajo src/app/(dashboard)/ (route group que aplica el layout del dashboard)."),
    bullet("Los parámetros de ruta (params) y de búsqueda (searchParams) son Promises y deben awaitearse: const { id } = await params."),
    bullet("El middleware de Next.js se llama proxy.ts (no middleware.ts) — protege todas las rutas del dashboard verificando la sesión activa."),
    bullet("Server Actions: las funciones asíncronas marcadas con 'use server' se ejecutan en el servidor al hacer submit de un formulario."),
    bullet("Turbopack activo en modo desarrollo (next dev --turbopack)."),
    espacioVacio(),

    h3("Prisma v7 — cliente WASM"),
    bullet("Esta versión usa un cliente WebAssembly en lugar del binario nativo. Requiere que la conexión pase por un adaptador (@prisma/adapter-pg)."),
    bullet("La URL de la base de datos NO va en schema.prisma — va en prisma.config.ts junto con el adaptador."),
    bullet("El cliente se genera en src/generated/prisma/ y se importa desde @/generated/prisma/client."),
    bullet("Regla crítica: npx prisma generate debe ejecutarse manualmente después de cada cambio al schema. migrate dev no siempre regenera de forma confiable."),
    bullet("Limitación conocida: Prisma no permite comparar dos campos del mismo modelo en un where (p.ej.: stock <= stockMinimo). La solución es traer todos los registros y filtrar en JavaScript."),
    espacioVacio(),

    h3("Auth.js v5 — sesiones JWT"),
    bullet("Proveedor: CredentialsProvider (email + contraseña)."),
    bullet("Contraseñas almacenadas con bcrypt (hash de una sola vía). El campo es passwordHash en la tabla usuarios."),
    bullet("La sesión incluye los campos id, email, name y rol del usuario — disponibles en cualquier Server Component con await auth()."),
    bullet("Redirige a /login si no hay sesión activa."),
    espacioVacio(),

    h3("Tailwind CSS v4"),
    bullet("La configuración cambió en v4: en lugar de un archivo tailwind.config.js, se importa directamente en el CSS: @import 'tailwindcss'."),
    bullet("Variante print:hidden disponible para ocultar elementos al imprimir (usada en resumen de mascota e informes)."),
    saltoPagina(),
  ]
}

// ─── Sección 3: Base de Datos ─────────────────────────────────────────────────
function seccionBD() {
  return [
    h1("3. Base de Datos"),

    h2("3.1 Motor y configuración"),
    parrafo("El sistema usa PostgreSQL 17 instalado localmente en el computador servidor (Windows). El servicio se llama postgresql-x64-17 y está configurado para iniciar automáticamente con Windows — no requiere intervención manual."),
    espacioVacio(),
    tabla(
      ["Parámetro", "Valor"],
      [
        ["Motor", "PostgreSQL 17"],
        ["Nombre de la base de datos", "centro_veterinario"],
        ["Codificación", "UTF8"],
        ["Locale / Collation", "Spanish_Colombia (es_CO)"],
        ["Puerto", "5432 (predeterminado)"],
        ["Servicio Windows", "postgresql-x64-17 (inicio automático)"],
        ["ORM", "Prisma v7.8.0 con cliente WASM"],
        ["Adaptador", "@prisma/adapter-pg"],
        ["Configuración de conexión", "prisma.config.ts (DATABASE_URL desde .env)"],
      ],
      [3000, 5560]
    ),
    espacioVacio(),

    h2("3.2 Historial de migraciones"),
    parrafo("Prisma gestiona el versionamiento del esquema mediante migraciones SQL con marca de tiempo. Cada migración corresponde a una fase del proyecto."),
    espacioVacio(),
    tabla(
      ["Migración (timestamp)", "Fase", "Modelos agregados"],
      [
        ["20260620222049_init", "0 — Base", "Usuario, Empleado, Cliente, Mascota"],
        ["20260621000336_fase2_historia_clinica", "2 — Historia Clínica", "Consulta, Vacuna, Desparasitacion"],
        ["20260621200728_fase3_agenda", "3 — Agenda", "Cita + enum EstadoCita"],
        ["20260621203434_fase4_inventario", "4 — Inventario", "Producto, MovimientoInventario"],
        ["20260621205801_fase5_finanzas", "5 — Finanzas", "Cobro, Egreso"],
        ["20260621211731_fase6_recordatorios", "6 — Recordatorios", "Recordatorio"],
      ],
      [3800, 1900, 3060]
    ),
    espacioVacio(),

    h2("3.3 Enumeraciones (Enums)"),
    parrafo("PostgreSQL almacena estos valores como tipos nativos. Prisma los expone como tipos TypeScript en el cliente generado."),
    espacioVacio(),
    tabla(
      ["Enum", "Valores", "Usado en"],
      [
        ["Rol", "admin | veterinario | recepcionista", "Usuario"],
        ["Especie", "perro | gato | ave | conejo | reptil | otro", "Mascota"],
        ["EstadoCita", "pendiente | confirmada | cancelada | atendida", "Cita"],
        ["CategoriaProducto", "medicamento | alimento | accesorio | higiene | otro", "Producto"],
        ["TipoMovimiento", "entrada | salida | ajuste", "MovimientoInventario"],
        ["MetodoPago", "efectivo | tarjeta | transferencia | otro", "Cobro"],
        ["CategoriaEgreso", "insumos | nomina | servicios | arriendo | otro", "Egreso"],
      ],
      [2000, 3400, 3160]
    ),
    espacioVacio(),

    h2("3.4 Modelos del esquema — detalle completo"),

    h3("Usuario — tabla: usuarios"),
    tabla(
      ["Campo", "Tipo PostgreSQL", "Restricciones / Notas"],
      [
        ["id", "TEXT (CUID)", "PK — generado automáticamente"],
        ["nombre", "TEXT", "Nombre completo del usuario del sistema"],
        ["email", "TEXT", "UNIQUE — sirve como login"],
        ["passwordHash", "TEXT", "Hash bcrypt de la contraseña"],
        ["rol", "Enum Rol", "Default: recepcionista"],
        ["activo", "BOOLEAN", "Default: true — false = usuario inhabilitado"],
        ["creadoEn", "TIMESTAMP", "Default: NOW()"],
        ["actualizadoEn", "TIMESTAMP", "Auto-actualizado en cada update (@updatedAt)"],
      ],
      [2000, 2200, 4560]
    ),
    espacioVacio(),

    h3("Empleado — tabla: empleados"),
    tabla(
      ["Campo", "Tipo PostgreSQL", "Restricciones / Notas"],
      [
        ["id", "TEXT (CUID)", "PK"],
        ["usuarioId", "TEXT", "FK → usuarios.id (CASCADE delete) — UNIQUE (1:1 con Usuario)"],
        ["cargo", "TEXT", "Nullable — ej. 'Veterinario', 'Recepcionista'"],
        ["telefono", "TEXT", "Nullable"],
        ["direccion", "TEXT", "Nullable"],
        ["horaEntrada", "TEXT", "Nullable — ej. '08:00'"],
        ["horaSalida", "TEXT", "Nullable — ej. '17:00'"],
        ["diasLaborales", "TEXT[]", "Array — valores: 'lunes','martes','miércoles','jueves','viernes','sábado','domingo'"],
        ["creadoEn", "TIMESTAMP", "Default: NOW()"],
        ["actualizadoEn", "TIMESTAMP", "@updatedAt"],
      ],
      [2000, 2200, 4560]
    ),
    espacioVacio(),

    h3("Cliente — tabla: clientes"),
    tabla(
      ["Campo", "Tipo PostgreSQL", "Restricciones / Notas"],
      [
        ["id", "TEXT (CUID)", "PK"],
        ["nombre", "TEXT", "Requerido"],
        ["identificacion", "TEXT", "Nullable — UNIQUE (cédula o NIT)"],
        ["telefono", "TEXT", "Nullable"],
        ["email", "TEXT", "Nullable"],
        ["direccion", "TEXT", "Nullable"],
        ["notas", "TEXT", "Nullable"],
        ["creadoEn", "TIMESTAMP", "Default: NOW()"],
        ["actualizadoEn", "TIMESTAMP", "@updatedAt"],
      ],
      [2000, 2200, 4560]
    ),
    espacioVacio(),

    h3("Mascota — tabla: mascotas"),
    tabla(
      ["Campo", "Tipo PostgreSQL", "Restricciones / Notas"],
      [
        ["id", "TEXT (CUID)", "PK"],
        ["nombre", "TEXT", "Requerido"],
        ["especie", "Enum Especie", "Default: otro"],
        ["raza", "TEXT", "Nullable"],
        ["fechaNacimiento", "TIMESTAMP", "Nullable"],
        ["peso", "FLOAT", "Nullable — peso en kg"],
        ["foto", "TEXT", "Nullable — URL o path de imagen (pendiente implementar upload)"],
        ["notas", "TEXT", "Nullable"],
        ["clienteId", "TEXT", "FK → clientes.id (CASCADE delete)"],
        ["creadoEn", "TIMESTAMP", "Default: NOW()"],
        ["actualizadoEn", "TIMESTAMP", "@updatedAt"],
      ],
      [2000, 2200, 4560]
    ),
    espacioVacio(),

    h3("Consulta — tabla: consultas"),
    tabla(
      ["Campo", "Tipo PostgreSQL", "Restricciones / Notas"],
      [
        ["id", "TEXT (CUID)", "PK"],
        ["fecha", "TIMESTAMP", "Default: NOW()"],
        ["motivo", "TEXT", "Requerido — razón de la consulta"],
        ["sintomas", "TEXT", "Nullable"],
        ["diagnostico", "TEXT", "Nullable"],
        ["tratamiento", "TEXT", "Nullable"],
        ["observaciones", "TEXT", "Nullable"],
        ["peso", "FLOAT", "Nullable — peso del animal en la consulta"],
        ["temperatura", "FLOAT", "Nullable — temperatura corporal en °C"],
        ["mascotaId", "TEXT", "FK → mascotas.id (CASCADE delete)"],
        ["veterinarioId", "TEXT", "Nullable — FK → usuarios.id"],
        ["creadoEn", "TIMESTAMP", "Default: NOW()"],
        ["actualizadoEn", "TIMESTAMP", "@updatedAt"],
      ],
      [2000, 2200, 4560]
    ),
    espacioVacio(),

    h3("Vacuna — tabla: vacunas"),
    tabla(
      ["Campo", "Tipo PostgreSQL", "Restricciones / Notas"],
      [
        ["id", "TEXT (CUID)", "PK"],
        ["nombre", "TEXT", "Requerido — nombre de la vacuna"],
        ["fecha", "TIMESTAMP", "Requerido — fecha de aplicación"],
        ["lote", "TEXT", "Nullable — número de lote del biológico"],
        ["proximaDosis", "TIMESTAMP", "Nullable — fecha de refuerzo — usada en alertas automáticas"],
        ["notas", "TEXT", "Nullable"],
        ["mascotaId", "TEXT", "FK → mascotas.id (CASCADE delete)"],
        ["veterinarioId", "TEXT", "Nullable — FK → usuarios.id"],
        ["creadoEn", "TIMESTAMP", "Default: NOW()"],
      ],
      [2000, 2200, 4560]
    ),
    espacioVacio(),

    h3("Desparasitacion — tabla: desparasitaciones"),
    tabla(
      ["Campo", "Tipo PostgreSQL", "Restricciones / Notas"],
      [
        ["id", "TEXT (CUID)", "PK"],
        ["fecha", "TIMESTAMP", "Requerido — fecha de aplicación"],
        ["tipo", "TEXT", "Requerido — 'interna' | 'externa' | 'ambas'"],
        ["producto", "TEXT", "Nullable — nombre del producto antiparasitario"],
        ["proximaDosis", "TIMESTAMP", "Nullable — usada en alertas automáticas"],
        ["notas", "TEXT", "Nullable"],
        ["mascotaId", "TEXT", "FK → mascotas.id (CASCADE delete)"],
        ["creadoEn", "TIMESTAMP", "Default: NOW()"],
      ],
      [2000, 2200, 4560]
    ),
    espacioVacio(),

    h3("Cita — tabla: citas"),
    tabla(
      ["Campo", "Tipo PostgreSQL", "Restricciones / Notas"],
      [
        ["id", "TEXT (CUID)", "PK"],
        ["fecha", "TIMESTAMP", "Requerido — fecha y hora de la cita"],
        ["motivo", "TEXT", "Requerido"],
        ["estado", "Enum EstadoCita", "Default: pendiente"],
        ["notas", "TEXT", "Nullable"],
        ["mascotaId", "TEXT", "FK → mascotas.id (CASCADE delete)"],
        ["veterinarioId", "TEXT", "Nullable — FK → usuarios.id"],
        ["creadoEn", "TIMESTAMP", "Default: NOW()"],
        ["actualizadoEn", "TIMESTAMP", "@updatedAt"],
      ],
      [2000, 2200, 4560]
    ),
    espacioVacio(),

    h3("Producto — tabla: productos"),
    tabla(
      ["Campo", "Tipo PostgreSQL", "Restricciones / Notas"],
      [
        ["id", "TEXT (CUID)", "PK"],
        ["nombre", "TEXT", "Requerido"],
        ["categoria", "Enum CategoriaProducto", "Default: otro"],
        ["unidad", "TEXT", "Default: 'unidad' — ej. 'caja', 'frasco', 'kg'"],
        ["stock", "FLOAT", "Default: 0 — cantidad actual disponible"],
        ["stockMinimo", "FLOAT", "Default: 0 — umbral para alertas de stock bajo"],
        ["precioCosto", "FLOAT", "Nullable — precio de compra al proveedor"],
        ["precioVenta", "FLOAT", "Nullable — precio de venta al cliente"],
        ["proveedor", "TEXT", "Nullable"],
        ["notas", "TEXT", "Nullable"],
        ["creadoEn", "TIMESTAMP", "Default: NOW()"],
        ["actualizadoEn", "TIMESTAMP", "@updatedAt"],
      ],
      [2000, 2200, 4560]
    ),
    espacioVacio(),

    h3("MovimientoInventario — tabla: movimientos_inventario"),
    tabla(
      ["Campo", "Tipo PostgreSQL", "Restricciones / Notas"],
      [
        ["id", "TEXT (CUID)", "PK"],
        ["tipo", "Enum TipoMovimiento", "entrada | salida | ajuste"],
        ["cantidad", "FLOAT", "Requerido — unidades del movimiento"],
        ["motivo", "TEXT", "Nullable — descripción del movimiento"],
        ["fecha", "TIMESTAMP", "Default: NOW()"],
        ["productoId", "TEXT", "FK → productos.id (CASCADE delete)"],
        ["usuarioId", "TEXT", "Nullable — FK → usuarios.id (quién lo registró)"],
      ],
      [2000, 2200, 4560]
    ),
    espacioVacio(),

    h3("Cobro — tabla: cobros"),
    cajaInfo("Nota importante", "El módulo financiero registra recibos internos administrativos. La entidad se llama 'Cobro' y NO debe confundirse con una Factura. Las facturas son documentos tributarios con requisitos DIAN que este sistema no genera.", C.amarillo),
    espacioVacio(8),
    tabla(
      ["Campo", "Tipo PostgreSQL", "Restricciones / Notas"],
      [
        ["id", "TEXT (CUID)", "PK"],
        ["numero", "INTEGER", "UNIQUE — autoincremental — número de recibo interno"],
        ["fecha", "TIMESTAMP", "Default: NOW()"],
        ["concepto", "TEXT", "Requerido — descripción del cobro"],
        ["monto", "FLOAT", "Requerido — valor en pesos colombianos"],
        ["metodoPago", "Enum MetodoPago", "Default: efectivo"],
        ["notas", "TEXT", "Nullable"],
        ["clienteId", "TEXT", "Nullable — FK → clientes.id"],
        ["mascotaId", "TEXT", "Nullable — FK → mascotas.id"],
        ["usuarioId", "TEXT", "Nullable — FK → usuarios.id (quién lo registró)"],
        ["creadoEn", "TIMESTAMP", "Default: NOW()"],
        ["actualizadoEn", "TIMESTAMP", "@updatedAt"],
      ],
      [2000, 2200, 4560]
    ),
    espacioVacio(),

    h3("Egreso — tabla: egresos"),
    tabla(
      ["Campo", "Tipo PostgreSQL", "Restricciones / Notas"],
      [
        ["id", "TEXT (CUID)", "PK"],
        ["fecha", "TIMESTAMP", "Default: NOW()"],
        ["concepto", "TEXT", "Requerido"],
        ["monto", "FLOAT", "Requerido — valor en pesos colombianos"],
        ["categoria", "Enum CategoriaEgreso", "Default: otro"],
        ["proveedor", "TEXT", "Nullable"],
        ["notas", "TEXT", "Nullable"],
        ["usuarioId", "TEXT", "Nullable — FK → usuarios.id"],
        ["creadoEn", "TIMESTAMP", "Default: NOW()"],
        ["actualizadoEn", "TIMESTAMP", "@updatedAt"],
      ],
      [2000, 2200, 4560]
    ),
    espacioVacio(),

    h3("Recordatorio — tabla: recordatorios"),
    tabla(
      ["Campo", "Tipo PostgreSQL", "Restricciones / Notas"],
      [
        ["id", "TEXT (CUID)", "PK"],
        ["mensaje", "TEXT", "Requerido — texto del recordatorio"],
        ["fecha", "TIMESTAMP", "Requerido — fecha para el recordatorio"],
        ["completado", "BOOLEAN", "Default: false — permite marcar como resuelto"],
        ["clienteId", "TEXT", "Nullable — FK → clientes.id"],
        ["mascotaId", "TEXT", "Nullable — FK → mascotas.id"],
        ["usuarioId", "TEXT", "Nullable — FK → usuarios.id"],
        ["creadoEn", "TIMESTAMP", "Default: NOW()"],
      ],
      [2000, 2200, 4560]
    ),
    saltoPagina(),
  ]
}

// ─── Sección 4: Arquitectura ──────────────────────────────────────────────────
function seccionArquitectura() {
  return [
    h1("4. Arquitectura de la Aplicación"),

    h2("4.1 Estructura general"),
    parrafo("La aplicación sigue el patrón Server-First de Next.js 16 con App Router. Cada módulo tiene tres capas:"),
    espacioVacio(4),
    tabla(
      ["Capa", "Archivo", "Responsabilidad"],
      [
        ["Server Page", "page.tsx (async)", "Obtiene datos de la BD con Prisma, pasa props al componente cliente o renderiza directamente"],
        ["Client Form", "NuevoXxxForm.tsx / EditarXxxForm.tsx", "Maneja estado local del formulario (useActionState, useState). Marcado con 'use client'"],
        ["Server Actions", "actions.ts", "Funciones 'use server' — validan datos, llaman a Prisma, revalidan caché y redirigen"],
      ],
      [2000, 3000, 3560]
    ),
    espacioVacio(),

    h2("4.2 Patrones de implementación"),
    h3("Server Action con bind para pasar IDs"),
    parrafo("Cuando una Server Action necesita el ID de un recurso (para editar o eliminar), se usa .bind() en el Server Component para precargar el argumento sin exponerlo en el HTML:"),
    parrafo("const accion = actualizarProducto.bind(null, producto.id)", { indent: 720, color: C.azulMedio, size: 20 }),
    parrafo("El formulario del cliente entonces usa esta acción enlazada: <form action={accion}>", { indent: 720, color: C.azulMedio, size: 20 }),
    espacioVacio(),

    h3("Selector cliente → mascota dependiente"),
    parrafo("En módulos donde se asocia una mascota a un cliente (Cobros, Recordatorios), el selector de mascotas depende del cliente seleccionado. Esto se implementa con useState en el componente cliente — al cambiar el cliente se filtra el array de mascotas correspondientes sin una llamada extra a la BD (los datos se pasan completos desde el Server Component)."),
    espacioVacio(),

    h3("Transacción atómica en Inventario"),
    parrafo("Al registrar un movimiento de inventario, se usan dos operaciones que deben ocurrir juntas: crear el MovimientoInventario y actualizar el stock del Producto. Esto se envuelve en prisma.$transaction([...]) para garantizar consistencia — si una falla, ambas se revierten."),
    espacioVacio(),

    h3("BtnEliminar — confirmación en cliente"),
    parrafo("Para las acciones de eliminación, existe el componente compartido BtnEliminar.tsx que muestra un confirm() nativo del navegador antes de ejecutar la Server Action. Esto evita eliminaciones accidentales sin necesidad de modales complejos."),
    espacioVacio(),

    h3("Filtrado de stock bajo en JavaScript"),
    parrafo("Prisma v7 no permite comparar dos campos del mismo modelo en una cláusula where (como stock <= stockMinimo). La solución implementada es traer todos los productos y filtrar con Array.filter() en el servidor: productos.filter(p => p.stock <= p.stockMinimo)."),
    espacioVacio(),

    h2("4.3 Estructura de carpetas"),
    tabla(
      ["Ruta", "Contenido"],
      [
        ["src/app/(dashboard)/", "Todas las páginas protegidas del dashboard (route group)"],
        ["src/app/(dashboard)/layout.tsx", "Layout con sidebar de navegación — verifica sesión"],
        ["src/app/login/", "Página pública de autenticación"],
        ["src/app/api/auth/[...nextauth]/", "Endpoints de Auth.js (signin, signout, session)"],
        ["src/auth.ts", "Configuración de Auth.js — proveedor, callbacks JWT/session"],
        ["src/lib/prisma.ts", "Instancia singleton del cliente Prisma con adaptador pg"],
        ["src/components/ui/", "Componentes reutilizables: NavLink, BtnEliminar, BtnImprimir"],
        ["src/generated/prisma/", "Cliente Prisma generado automáticamente (no editar)"],
        ["src/proxy.ts", "Middleware de Next.js — redirige a /login si no hay sesión"],
        ["prisma/schema.prisma", "Definición del esquema — 12 modelos, 7 enums"],
        ["prisma/migrations/", "Historial SQL de migraciones (6 migraciones aplicadas)"],
        ["prisma/seed.ts", "Script para crear el usuario administrador inicial"],
        ["public/icons/", "Íconos PWA (192px y 512px)"],
        ["public/manifest.json", "Manifiesto PWA — permite instalar en tablet como app"],
        ["scripts/", "Scripts de Node.js para generación de documentos Word"],
      ],
      [3200, 5560]
    ),
    saltoPagina(),
  ]
}

// ─── Sección 5: Módulos ───────────────────────────────────────────────────────
function seccionModulos() {
  return [
    h1("5. Módulos del Sistema"),

    // ── 5.1 Dashboard ──
    h2("5.1 Dashboard — Inicio (/)"),
    parrafo("Pantalla de bienvenida que muestra el nombre del usuario autenticado y su rol. Sirve como punto de entrada al sistema y acceso rápido a los módulos a través del sidebar."),
    espacioVacio(),

    // ── 5.2 Clientes ──
    h2("5.2 Clientes (/clientes)"),
    parrafo("Gestión completa del registro de propietarios de mascotas."),
    espacioVacio(),
    tabla(
      ["Ruta", "Función"],
      [
        ["/clientes", "Lista de todos los clientes con búsqueda por nombre"],
        ["/clientes/nuevo", "Formulario para registrar un cliente nuevo"],
        ["/clientes/[id]", "Ficha del cliente con sus mascotas asociadas"],
        ["/clientes/[id]/editar", "Formulario de edición del cliente"],
      ],
      [3000, 5760]
    ),
    espacioVacio(),
    parrafo("Campos: nombre (requerido), identificación (cédula/NIT, única), teléfono, email, dirección, notas. La eliminación de un cliente elimina en cascada todas sus mascotas y datos relacionados."),
    espacioVacio(),

    // ── 5.3 Mascotas ──
    h2("5.3 Mascotas (/mascotas)"),
    parrafo("Ficha completa de cada animal con toda su historia clínica consolidada."),
    espacioVacio(),
    tabla(
      ["Ruta", "Función"],
      [
        ["/mascotas", "Lista de mascotas con nombre del dueño — búsqueda por nombre"],
        ["/mascotas/nueva", "Registrar nueva mascota (requiere seleccionar cliente propietario)"],
        ["/mascotas/[id]", "Ficha completa: datos + consultas + vacunas + desparasitaciones + próximas citas"],
        ["/mascotas/[id]/editar", "Editar datos básicos de la mascota"],
        ["/mascotas/[id]/resumen", "Vista imprimible de la historia clínica completa"],
        ["/mascotas/[id]/consultas/nueva", "Registrar nueva consulta médica"],
        ["/mascotas/[id]/consultas/[id]", "Ver detalle completo de una consulta"],
        ["/mascotas/[id]/consultas/[id]/editar", "Editar consulta existente"],
        ["/mascotas/[id]/vacunas/nueva", "Registrar vacuna aplicada"],
        ["/mascotas/[id]/vacunas/[id]/editar", "Editar registro de vacuna"],
        ["/mascotas/[id]/desparasitaciones/nueva", "Registrar desparasitación"],
        ["/mascotas/[id]/desparasitaciones/[id]/editar", "Editar registro de desparasitación"],
      ],
      [3800, 4960]
    ),
    espacioVacio(),

    // ── 5.4 Historia Clínica ──
    h2("5.4 Historia Clínica (/historia-clinica)"),
    parrafo("Vista transversal de las consultas médicas de todas las mascotas. Permite al veterinario buscar consultas de cualquier animal sin necesidad de navegar por la ficha de cada mascota individualmente."),
    espacioVacio(),
    parrafo("Muestra: fecha de consulta, nombre de la mascota, especie, nombre del propietario, motivo y el veterinario que atendió. Se pueden crear nuevas consultas desde aquí o desde la ficha de la mascota."),
    espacioVacio(),

    // ── 5.5 Agenda ──
    h2("5.5 Agenda (/agenda)"),
    parrafo("Gestión de citas veterinarias con vista diaria y horario del personal."),
    espacioVacio(),
    tabla(
      ["Ruta", "Función"],
      [
        ["/agenda", "Vista por día — navegación anterior/hoy/siguiente + selector de fecha"],
        ["/agenda/nueva", "Crear cita — admite fecha predeterminada por querystring (?fecha=YYYY-MM-DD)"],
        ["/agenda/[id]/editar", "Editar fecha, hora, motivo, veterinario y estado de una cita"],
        ["/agenda/empleados", "Horario semanal del personal basado en diasLaborales/horaEntrada/horaSalida"],
      ],
      [3200, 5560]
    ),
    espacioVacio(),
    parrafo("Estados del ciclo de vida de una cita:"),
    bullet("pendiente — recién creada, sin confirmar."),
    bullet("confirmada — cliente avisado y confirmó."),
    bullet("cancelada — cita no se realizará."),
    bullet("atendida — cita completada con éxito."),
    espacioVacio(),
    parrafo("El cambio de estado se puede hacer directamente desde la vista del día con formularios inline (sin navegar a la pantalla de edición). Las citas canceladas y atendidas quedan excluidas de la sección 'Próximas citas' en la ficha de la mascota."),
    espacioVacio(),

    // ── 5.6 Inventario ──
    h2("5.6 Inventario (/inventario)"),
    parrafo("Control de stock de productos veterinarios, medicamentos, alimentos y accesorios."),
    espacioVacio(),
    tabla(
      ["Ruta", "Función"],
      [
        ["/inventario", "Lista de productos con indicador de stock bajo (⚠️ si stock ≤ stockMinimo)"],
        ["/inventario/nuevo", "Registrar nuevo producto (el stock inicial se establece en 0)"],
        ["/inventario/[id]", "Detalle del producto + formulario 'Registrar movimiento' + historial de movimientos"],
        ["/inventario/[id]/editar", "Editar datos del producto (NO el stock — solo vía movimientos)"],
      ],
      [3200, 5560]
    ),
    espacioVacio(),
    parrafo("Tipos de movimiento de inventario:"),
    bullet("Entrada: suma la cantidad al stock actual. Ejemplo: recepción de mercancía."),
    bullet("Salida: resta la cantidad del stock actual. Ejemplo: venta o uso en consulta."),
    bullet("Ajuste: reemplaza el stock actual con el valor exacto ingresado. Ejemplo: conteo físico que corrige diferencias."),
    espacioVacio(),
    parrafo("El sistema impide que una salida lleve el stock a valores negativos. El historial muestra los últimos 30 movimientos con fecha, tipo, cantidad, motivo y usuario que lo registró."),
    espacioVacio(),

    // ── 5.7 Finanzas ──
    h2("5.7 Finanzas (/finanzas)"),
    cajaInfo("Aclaración tributaria", "Este módulo es de control interno. Los 'Cobros' son recibos administrativos para registro del flujo de caja. NO son facturas de venta ni documentos tributarios con validez ante la DIAN. El sistema no genera facturas electrónicas.", C.amarillo),
    espacioVacio(8),
    parrafo("Seguimiento mensual de ingresos (cobros) y gastos (egresos) del consultorio."),
    espacioVacio(),
    tabla(
      ["Ruta", "Función"],
      [
        ["/finanzas", "Dashboard mensual: navegación por mes, totales cobros/egresos/ganancia neta, desglose por método de pago y por categoría de egreso"],
        ["/finanzas/cobros", "Lista de cobros del mes seleccionado"],
        ["/finanzas/cobros/nuevo", "Registrar cobro — permite asociarlo a cliente y mascota opcionales"],
        ["/finanzas/cobros/[id]/editar", "Editar cobro existente"],
        ["/finanzas/egresos", "Lista de egresos del mes seleccionado"],
        ["/finanzas/egresos/nuevo", "Registrar egreso — categoría, proveedor, concepto, monto"],
        ["/finanzas/egresos/[id]/editar", "Editar egreso existente"],
      ],
      [3200, 5560]
    ),
    espacioVacio(),
    parrafo("El dashboard de finanzas calcula automáticamente: total de cobros del mes, total de egresos del mes, ganancia neta (cobros − egresos), desglose de cobros por método de pago (efectivo, tarjeta, transferencia, otro) y desglose de egresos por categoría (insumos, nómina, servicios, arriendo, otro)."),
    espacioVacio(),

    // ── 5.8 Recordatorios ──
    h2("5.8 Recordatorios (/recordatorios)"),
    parrafo("Panel combinado de alertas automáticas calculadas en tiempo real y recordatorios manuales del personal."),
    espacioVacio(),
    parrafo("Las alertas automáticas NO se guardan en la base de datos — se calculan en cada carga de la página consultando los datos existentes. Esto evita duplicación de datos y mantiene las alertas siempre actualizadas:"),
    espacioVacio(),
    tabla(
      ["Alerta automática", "Criterio de activación"],
      [
        ["Citas de hoy", "Citas con fecha = hoy y estado ≠ cancelada ni atendida"],
        ["Vacunas por vencer", "Vacunas con proximaDosis ≤ hoy + 7 días (incluye vencidas)"],
        ["Desparasitaciones por vencer", "Desparasitaciones con proximaDosis ≤ hoy + 7 días"],
        ["Stock bajo", "Productos donde stock actual ≤ stockMinimo (filtrado en JavaScript)"],
      ],
      [3200, 5560]
    ),
    espacioVacio(),
    parrafo("Los recordatorios manuales permiten al personal crear notas con fecha, mensaje opcional de cliente/mascota. Cada recordatorio tiene un checkbox para marcarlo como completado (los completados se muestran al final de la lista). Los recordatorios completados pueden eliminarse."),
    espacioVacio(),

    // ── 5.9 Informes ──
    h2("5.9 Informes (/informes)"),
    parrafo("Reporte administrativo consolidado e imprimible filtrado por rango de fechas. Por defecto muestra el mes actual."),
    espacioVacio(),
    parrafo("El informe incluye 5 secciones:"),
    bullet("Resumen financiero: total cobros, total egresos, ganancia neta del período."),
    bullet("Atención clínica: consultas realizadas, vacunas aplicadas, desparasitaciones — con desglose de consultas por veterinario."),
    bullet("Agenda: número de citas por estado (pendiente, confirmada, cancelada, atendida)."),
    bullet("Inventario: total de entradas y salidas del período + cantidad de productos con stock bajo al momento del informe."),
    bullet("Crecimiento: clientes y mascotas nuevas registrados en el período."),
    espacioVacio(),
    parrafo("Al imprimir (o guardar como PDF desde el navegador), los controles de fecha y el botón de imprimir se ocultan automáticamente gracias a la variante print:hidden de Tailwind CSS. El resultado es un documento limpio con membrete 'Centro Veterinario — Documento de control interno'."),
    espacioVacio(),

    // ── 5.10 Admin ──
    h2("5.10 Administración (solo rol: admin)"),
    parrafo("Las secciones de Usuarios y Empleados solo son visibles para el administrador del sistema."),
    espacioVacio(),
    tabla(
      ["Ruta", "Función"],
      [
        ["/admin/usuarios", "Lista de usuarios del sistema con su rol y estado activo/inactivo"],
        ["/admin/usuarios/nuevo", "Crear usuario con nombre, email, contraseña y rol"],
        ["/admin/usuarios/[id]/editar", "Editar nombre, email, rol y estado activo del usuario"],
        ["/admin/empleados", "Lista de empleados con su cargo"],
        ["/admin/empleados/[id]/editar", "Editar datos laborales: cargo, horario de entrada/salida, días laborales"],
      ],
      [3200, 5560]
    ),
    saltoPagina(),
  ]
}

// ─── Sección 6: Seguridad ─────────────────────────────────────────────────────
function seccionSeguridad() {
  return [
    h1("6. Seguridad y Autenticación"),

    h2("6.1 Flujo de autenticación"),
    parrafo("1. El usuario ingresa su email y contraseña en /login."),
    parrafo("2. Auth.js ejecuta el CredentialsProvider: busca el usuario en la BD y compara la contraseña con bcrypt.compare() contra el hash almacenado."),
    parrafo("3. Si es válido, crea un JWT firmado (session strategy: 'jwt') que incluye id, email, nombre y rol."),
    parrafo("4. El middleware proxy.ts intercepta todas las rutas — si no hay sesión válida, redirige a /login."),
    parrafo("5. Los Server Components y Server Actions verifican la sesión con await auth() para obtener el usuario activo."),
    espacioVacio(),

    h2("6.2 Roles y permisos"),
    tabla(
      ["Rol", "Acceso"],
      [
        ["admin", "Acceso completo — incluyendo módulos /admin/usuarios y /admin/empleados"],
        ["veterinario", "Acceso a todos los módulos clínicos y operativos — sin acceso a administración"],
        ["recepcionista", "Acceso a todos los módulos operativos — sin acceso a administración"],
      ],
      [1800, 6960]
    ),
    espacioVacio(),
    cajaInfo("Credenciales iniciales", "Usuario administrador creado con el seed: admin@centroveterinario.com / admin1234 — Cambiar la contraseña después del primer acceso.", C.rojoClaro),
    espacioVacio(),

    h2("6.3 Seguridad de contraseñas"),
    parrafo("Las contraseñas nunca se almacenan en texto plano. Se usa bcryptjs para generar un hash con factor de costo 10 antes de guardarlo en la base de datos. La verificación también ocurre con bcrypt — nunca se recupera la contraseña original."),
    espacioVacio(),

    h2("6.4 Consideraciones de red local"),
    parrafo("Al ser un sistema LAN sin exposición a internet, el modelo de amenaza es reducido. Sin embargo se mantienen las buenas prácticas: sesiones JWT con expiración, protección de rutas en el middleware, validación de datos en Server Actions antes de operaciones de escritura en la BD."),
    saltoPagina(),
  ]
}

// ─── Sección 7: PWA ───────────────────────────────────────────────────────────
function seccionPWA() {
  return [
    h1("7. Progressive Web App (PWA)"),
    parrafo("El sistema está configurado como PWA, lo que permite instalarlo como aplicación nativa en la tablet y los demás dispositivos de la red local, sin pasar por una tienda de aplicaciones."),
    espacioVacio(),
    tabla(
      ["Archivo", "Función"],
      [
        ["public/manifest.json", "Nombre, íconos, color de fondo, modo de pantalla (standalone)"],
        ["public/icons/icon-192.png", "Ícono para pantalla de inicio Android y escritorio"],
        ["public/icons/icon-512.png", "Ícono de alta resolución para splash screen"],
      ],
      [3200, 5560]
    ),
    espacioVacio(),
    parrafo("Para instalar en la tablet: abrir el navegador, ir a http://192.168.1.XX:3001, y usar la opción 'Agregar a pantalla de inicio'. La app se abre entonces sin barra del navegador, con íconos propios de Centro Veterinario."),
    saltoPagina(),
  ]
}

// ─── Sección 8: Comandos operativos ──────────────────────────────────────────
function seccionComandos() {
  return [
    h1("8. Comandos de Operación"),

    h2("8.1 Iniciar el servidor de desarrollo"),
    parrafo("Abrir PowerShell o Terminal y ejecutar:"),
    parrafo('cd "C:\\CentroVeterinario"', { indent: 720, color: C.azulMedio, size: 20 }),
    parrafo("npm run dev", { indent: 720, color: C.azulMedio, size: 20 }),
    parrafo("PostgreSQL inicia automáticamente con Windows (servicio postgresql-x64-17). No requiere comando adicional para la base de datos."),
    espacioVacio(),

    h2("8.2 Scripts npm disponibles"),
    tabla(
      ["Comando", "Función"],
      [
        ["npm run dev", "Inicia Next.js en modo desarrollo con Turbopack en http://localhost:3001"],
        ["npm run build", "Compila la aplicación para producción"],
        ["npm run start", "Inicia el servidor de producción (requiere build previo)"],
        ["npm run db:migrate", "Aplica migraciones pendientes del esquema Prisma"],
        ["npm run db:generate", "Regenera el cliente Prisma (ejecutar después de cambiar schema.prisma)"],
        ["npm run db:seed", "Crea el usuario administrador inicial en la BD"],
        ["npm run db:studio", "Abre Prisma Studio — interfaz visual para explorar la BD"],
        ["npm run db:reset", "PELIGROSO — borra y recrea la BD completa (solo desarrollo)"],
      ],
      [2800, 5960]
    ),
    espacioVacio(),

    h2("8.3 Acceso desde los dispositivos"),
    tabla(
      ["Dispositivo", "URL de acceso"],
      [
        ["Computador servidor (local)", "http://localhost:3001"],
        ["Tablet y otros computadores en la red", "http://192.168.1.XX:3001"],
      ],
      [3200, 5560]
    ),
    espacioVacio(),
    cajaInfo("Requisito de red", "Todos los dispositivos deben estar conectados a la misma red WiFi. Si la tablet no puede acceder, verificar que el Firewall de Windows permita conexiones entrantes al puerto 3000.", C.azulClaro),
    saltoPagina(),
  ]
}

// ─── Sección 9: Fases pendientes ─────────────────────────────────────────────
function seccionPendientes() {
  return [
    h1("9. Fases Pendientes"),

    h2("9.1 Fase 8 — Configuración LAN y Backups automáticos"),
    parrafo("Objetivo: garantizar que el sistema sea confiable y se recupere ante fallos, sin requerir intervención técnica del personal."),
    espacioVacio(),
    tabla(
      ["Tarea", "Descripción"],
      [
        ["Firewall Windows", "Crear regla de entrada para el puerto TCP 3001 — soluciona acceso desde tablet/dispositivos externos en la LAN"],
        ["IP estática en el router", "Reservar la IP 192.168.1.XX para la MAC del computador servidor en la configuración del router, para que no cambie con reinicios"],
        ["Script de inicio automático", "Crear archivo .bat y una entrada en el Programador de Tareas de Windows para que npm run start se ejecute al iniciar Windows, sin que el administrador tenga que abrir una terminal"],
        ["Backup automático con pg_dump", "Script PowerShell que ejecute pg_dump diariamente y rote los backups (mantener los últimos 7 días), programado en el Programador de Tareas"],
      ],
      [2800, 5960]
    ),
    espacioVacio(),

    h2("9.2 Fase 9 — Pruebas en 3 dispositivos reales"),
    parrafo("Objetivo: validar que el sistema funciona correctamente bajo el uso real simultáneo de los 3 dispositivos del consultorio."),
    espacioVacio(),
    bullet("Prueba de acceso simultáneo desde tablet + 2 computadores."),
    bullet("Validar que los datos creados en un dispositivo se ven inmediatamente en los demás."),
    bullet("Prueba de carga concurrente (operaciones simultáneas)."),
    bullet("Revisión del diseño responsivo en la resolución de la tablet."),
    bullet("Compilar y resolver el backlog de mejoras visuales identificadas en Fases 2 y 4."),
    bullet("Prueba de impresión de resumen de mascota e informes administrativos."),
    bullet("Verificar que el backup automático (Fase 8) se ejecuta y los archivos se generan correctamente."),
    bullet("Aprobación final del sistema por parte del equipo de la clínica."),
    saltoPagina(),
  ]
}

// ─── Sección 10: Estadísticas ─────────────────────────────────────────────────
function seccionEstadisticas() {
  return [
    h1("10. Estadísticas del Proyecto"),
    espacioVacio(),
    tabla(
      ["Métrica", "Valor"],
      [
        ["Modelos de base de datos", "12 modelos (tablas)"],
        ["Enumeraciones (Enums)", "7 enums"],
        ["Migraciones aplicadas", "6 migraciones SQL"],
        ["Archivos de página (.tsx)", "~60 archivos"],
        ["Módulos / Secciones del sistema", "9 módulos principales"],
        ["Rutas URL implementadas", "~30 rutas únicas"],
        ["Server Actions", "~40 funciones (crear, actualizar, eliminar por módulo)"],
        ["Fases completadas", "8 de 10 (Fases 0 al 7)"],
        ["Dependencias de producción", "9 paquetes"],
        ["Framework principal", "Next.js 16.2.9 con App Router"],
        ["Lenguaje", "TypeScript 5 (100% del código fuente)"],
        ["Base de datos", "PostgreSQL 17"],
        ["ORM", "Prisma 7.8.0 (cliente WASM)"],
        ["Autenticación", "Auth.js v5 (next-auth@beta) — JWT"],
        ["Estilos", "Tailwind CSS v4"],
      ],
      [3600, 5160]
    ),
    saltoPagina(),
  ]
}

// ─── Documento final ──────────────────────────────────────────────────────────
async function main() {
  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "bullets",
          levels: [
            { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 720, hanging: 360 } },
                       run: { font: "Calibri", size: 22 } } },
            { level: 1, format: LevelFormat.BULLET, text: "–", alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 1080, hanging: 360 } },
                       run: { font: "Calibri", size: 22 } } },
          ],
        },
      ],
    },
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 22, color: C.grisOscuro } },
      },
      paragraphStyles: [
        { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 36, bold: true, font: "Calibri", color: C.azul },
          paragraph: { spacing: { before: 480, after: 200 }, outlineLevel: 0 } },
        { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 28, bold: true, font: "Calibri", color: C.azulMedio },
          paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 1 } },
        { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
          run: { size: 24, bold: true, font: "Calibri", color: C.grisOscuro },
          paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 } },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 12240, height: 15840 },
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        headers: {
          default: new Header({
            children: [new Paragraph({
              border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: C.azulMedio, space: 6 } },
              children: [
                new TextRun({ text: "Centro Veterinario — Documento Técnico", size: 18, font: "Calibri", color: C.grisMedio }),
                new TextRun({ text: "  |  v3.0 — Julio 2026", size: 18, font: "Calibri", color: C.grisMedio }),
              ],
            })],
          }),
        },
        footers: {
          default: new Footer({
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              border: { top: { style: BorderStyle.SINGLE, size: 2, color: C.azulMedio, space: 6 } },
              children: [
                new TextRun({ text: "Página ", size: 18, font: "Calibri", color: C.grisMedio }),
                new TextRun({ children: [PageNumber.CURRENT], size: 18, font: "Calibri", color: C.grisMedio }),
                new TextRun({ text: " de ", size: 18, font: "Calibri", color: C.grisMedio }),
                new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, font: "Calibri", color: C.grisMedio }),
                new TextRun({ text: "  ·  Documento de uso interno — Centro Veterinario", size: 18, font: "Calibri", color: C.grisMedio }),
              ],
            })],
          }),
        },
        children: [
          ...portada(),
          ...seccionResumen(),
          ...seccionStack(),
          ...seccionBD(),
          ...seccionArquitectura(),
          ...seccionModulos(),
          ...seccionSeguridad(),
          ...seccionPWA(),
          ...seccionComandos(),
          ...seccionPendientes(),
          ...seccionEstadisticas(),
        ],
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)
  const outPath = path.join(__dirname, "..", "Centro Veterinario — Documento Técnico Completo.docx")
  fs.writeFileSync(outPath, buffer)
  console.log(`✅ Documento generado: ${outPath}`)
  console.log(`   Tamaño: ${(buffer.length / 1024).toFixed(1)} KB`)
}

main().catch(console.error)
