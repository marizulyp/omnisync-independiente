const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, VerticalAlign, PageNumber, LevelFormat, TableOfContents,
  PageBreak, ExternalHyperlink
} = require("docx");
const fs = require("fs");
const path = require("path");

// ─── Colores ────────────────────────────────────────────────────────────────
const C = {
  indigo:    "4338CA",
  indigoLight: "EEF2FF",
  indigoMid: "818CF8",
  green:     "16A34A",
  greenLight: "DCFCE7",
  amber:     "D97706",
  amberLight:"FEF3C7",
  red:       "DC2626",
  redLight:  "FEE2E2",
  gray:      "374151",
  grayLight: "F3F4F6",
  grayMid:   "9CA3AF",
  white:     "FFFFFF",
};

// ─── Bordes de tabla ────────────────────────────────────────────────────────
const border  = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

// ─── Helpers ────────────────────────────────────────────────────────────────
const H1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  spacing: { before: 400, after: 200 },
  children: [new TextRun({ text, font: "Arial", size: 32, bold: true, color: C.indigo })],
});

const H2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  spacing: { before: 300, after: 120 },
  children: [new TextRun({ text, font: "Arial", size: 26, bold: true, color: C.gray })],
});

const H3 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_3,
  spacing: { before: 200, after: 80 },
  children: [new TextRun({ text, font: "Arial", size: 24, bold: true, color: C.gray })],
});

const P = (text, opts = {}) => new Paragraph({
  spacing: { after: 120 },
  children: [new TextRun({ text, font: "Arial", size: 22, color: C.gray, ...opts })],
});

const Bold = (text) => new TextRun({ text, font: "Arial", size: 22, bold: true, color: C.gray });
const Code = (text) => new TextRun({ text, font: "Courier New", size: 20, color: C.indigo });

const bullet = (text, opts = {}) => new Paragraph({
  numbering: { reference: "bullets", level: 0 },
  spacing: { after: 80 },
  children: [new TextRun({ text, font: "Arial", size: 22, color: C.gray, ...opts })],
});

const numbered = (text) => new Paragraph({
  numbering: { reference: "numbers", level: 0 },
  spacing: { after: 80 },
  children: [new TextRun({ text, font: "Arial", size: 22, color: C.gray })],
});

const spacer = (pts = 200) => new Paragraph({ spacing: { after: pts }, children: [new TextRun("")] });

const codeBlock = (lines) => new Table({
  width: { size: 9200, type: WidthType.DXA },
  columnWidths: [9200],
  rows: [new TableRow({ children: [
    new TableCell({
      borders: noBorders,
      width: { size: 9200, type: WidthType.DXA },
      shading: { fill: "F1F5F9", type: ShadingType.CLEAR },
      margins: { top: 160, bottom: 160, left: 240, right: 240 },
      children: lines.map(l => new Paragraph({
        spacing: { after: 0 },
        children: [new TextRun({ text: l, font: "Courier New", size: 18, color: C.gray })],
      })),
    }),
  ]})],
});

// Celda de tabla normal
const TC = (text, { bg = C.white, bold = false, width = 4680 } = {}) => new TableCell({
  borders,
  width: { size: width, type: WidthType.DXA },
  shading: { fill: bg, type: ShadingType.CLEAR },
  margins: { top: 100, bottom: 100, left: 160, right: 160 },
  children: [new Paragraph({
    spacing: { after: 0 },
    children: [new TextRun({ text, font: "Arial", size: 20, bold, color: C.gray })],
  })],
});

// Fila de encabezado
const TH = (cells, widths) => new TableRow({
  tableHeader: true,
  children: cells.map((t, i) => new TableCell({
    borders,
    width: { size: widths[i], type: WidthType.DXA },
    shading: { fill: C.indigo, type: ShadingType.CLEAR },
    margins: { top: 100, bottom: 100, left: 160, right: 160 },
    children: [new Paragraph({
      spacing: { after: 0 },
      children: [new TextRun({ text: t, font: "Arial", size: 20, bold: true, color: C.white })],
    })],
  })),
});

// Fila de datos
const TR = (cells, widths, bgEven = C.white) => new TableRow({
  children: cells.map((t, i) => new TableCell({
    borders,
    width: { size: widths[i], type: WidthType.DXA },
    shading: { fill: bgEven, type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 160, right: 160 },
    children: [new Paragraph({
      spacing: { after: 0 },
      children: Array.isArray(t)
        ? t
        : [new TextRun({ text: t, font: "Arial", size: 20, color: C.gray })],
    })],
  })),
});

// Badge de estado
const badge = (text, color, bg) => new TextRun({
  text: ` ${text} `,
  font: "Arial", size: 18, bold: true, color, highlight: undefined,
});

// ─── Documento ──────────────────────────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [
      {
        reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "•",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
      },
      {
        reference: "numbers",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
      },
      {
        reference: "checkDone",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "✓",
          alignment: AlignmentType.LEFT,
          style: {
            paragraph: { indent: { left: 720, hanging: 360 } },
            run: { color: C.green },
          } }],
      },
      {
        reference: "checkPend",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "○",
          alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }],
      },
    ],
  },
  styles: {
    default: { document: { run: { font: "Arial", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Arial", color: C.indigo },
        paragraph: { spacing: { before: 400, after: 200 }, outlineLevel: 0,
          border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: C.indigoMid, space: 4 } } } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, font: "Arial", color: C.gray },
        paragraph: { spacing: { before: 280, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Arial", color: C.gray },
        paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 } },
    ],
  },
  sections: [
    // ═══════════════════════════════════════════════════════════════════════
    // PORTADA
    // ═══════════════════════════════════════════════════════════════════════
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        },
      },
      children: [
        spacer(1200),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 160 },
          children: [new TextRun({ text: "CENTRO VETERINARIO", font: "Arial", size: 48,
            bold: true, color: C.indigo })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 },
          children: [new TextRun({ text: "Plataforma de Gestión Veterinaria", font: "Arial",
            size: 32, color: C.grayMid })],
        }),
        // Línea decorativa
        new Table({
          width: { size: 3600, type: WidthType.DXA },
          alignment: AlignmentType.CENTER,
          columnWidths: [3600],
          rows: [new TableRow({ children: [new TableCell({
            borders: noBorders,
            width: { size: 3600, type: WidthType.DXA },
            shading: { fill: C.indigo, type: ShadingType.CLEAR },
            margins: { top: 60, bottom: 60, left: 0, right: 0 },
            children: [new Paragraph({ children: [new TextRun("")] })],
          })] })],
        }),
        spacer(600),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
          children: [new TextRun({ text: "Documento Técnico de Proyecto", font: "Arial",
            size: 26, bold: true, color: C.gray })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [new TextRun({ text: "Arquitectura Local en Red (LAN) — Sin hosting en la nube",
            font: "Arial", size: 22, color: C.grayMid })],
        }),
        spacer(800),
        // Info box
        new Table({
          width: { size: 7200, type: WidthType.DXA },
          alignment: AlignmentType.CENTER,
          columnWidths: [3600, 3600],
          rows: [
            TR(["Fecha de inicio", "20 de junio de 2026"], [3600, 3600], C.grayLight),
            TR(["Última actualización", "21 de junio de 2026"], [3600, 3600], C.white),
            TR(["Versión del documento", "2.0"], [3600, 3600], C.grayLight),
            TR(["Estado del proyecto", "En desarrollo activo"], [3600, 3600], C.white),
            TR(["Fase actual", "Fases 0-7 completadas — Iniciando Fase 8"], [3600, 3600], C.grayLight),
          ],
        }),
        spacer(1200),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "CONFIDENCIAL — USO INTERNO", font: "Arial",
            size: 18, color: C.grayMid, italics: true })],
        }),
        new Paragraph({ children: [new PageBreak()] }),
      ],
    },

    // ═══════════════════════════════════════════════════════════════════════
    // CONTENIDO PRINCIPAL
    // ═══════════════════════════════════════════════════════════════════════
    {
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 1440, right: 1440, bottom: 1260, left: 1440 },
        },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: C.indigoMid, space: 4 } },
            spacing: { after: 0 },
            children: [new TextRun({ text: "Centro Veterinario — Documento de Proyecto", font: "Arial",
              size: 18, color: C.grayMid })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            border: { top: { style: BorderStyle.SINGLE, size: 2, color: C.indigoMid, space: 4 } },
            spacing: { before: 80 },
            children: [
              new TextRun({ text: "Página ", font: "Arial", size: 18, color: C.grayMid }),
              new TextRun({ children: [PageNumber.CURRENT], font: "Arial", size: 18, color: C.grayMid }),
              new TextRun({ text: " de ", font: "Arial", size: 18, color: C.grayMid }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], font: "Arial", size: 18, color: C.grayMid }),
            ],
          })],
        }),
      },
      children: [
        // Tabla de contenidos
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun({ text: "Tabla de Contenidos", font: "Arial", size: 32, bold: true, color: C.indigo })],
        }),
        new TableOfContents("Tabla de Contenidos", { hyperlink: true, headingStyleRange: "1-3" }),
        new Paragraph({ children: [new PageBreak()] }),

        // ─── 1. OBJETIVO DEL PROYECTO ──────────────────────────────────────
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "1. Objetivo del Proyecto", font: "Arial", size: 32, bold: true, color: C.indigo })] }),
        P("Plataforma de gestión integral para clínicas veterinarias, desplegada completamente en red local (LAN) sin costo de hosting en la nube. Permite operar desde 3 dispositivos simultáneos (1 tablet + 2 computadores) con una única base de datos centralizada."),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "1.1 Alcance del Sistema", font: "Arial", size: 26, bold: true, color: C.gray })] }),
        bullet("Historia clínica con resumen automático de consultas"),
        bullet("Gestión de clientes, mascotas y empleados"),
        bullet("Dos agendas separadas: pacientes y turnos del personal"),
        bullet("Recordatorios y alertas internas (vacunas, controles, citas)"),
        bullet("Control financiero: ingresos (Cobros), egresos y reporte de ganancias"),
        bullet("Control de inventario con alertas de bajo stock"),
        bullet("Exportación a Excel/PDF para el contador"),
        spacer(100),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "1.2 Fuera de Alcance (Decisión Consciente)", font: "Arial", size: 26, bold: true, color: C.gray })] }),
        bullet("Notificaciones por WhatsApp"),
        bullet("Facturación electrónica DIAN (ver sección 2)"),
        bullet("Acceso remoto desde fuera de la red local"),
        spacer(100),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "1.3 Aclaración sobre Módulo Financiero", font: "Arial", size: 26, bold: true, color: C.gray })] }),
        new Paragraph({
          spacing: { after: 120 },
          children: [
            new TextRun({ text: "IMPORTANTE: ", font: "Arial", size: 22, bold: true, color: C.red }),
            new TextRun({ text: "El módulo financiero es control interno de ingresos/egresos para uso administrativo. La entidad se llama ", font: "Arial", size: 22, color: C.gray }),
            Bold("Cobro "),
            new TextRun({ text: "(recibo interno), NO Factura, para no generar confusión con la obligación tributaria DIAN. Consultar con el contador si se requiere facturación electrónica (proyecto separado).", font: "Arial", size: 22, color: C.gray }),
          ],
        }),
        spacer(200),
        new Paragraph({ children: [new PageBreak()] }),

        // ─── 2. ARQUITECTURA ───────────────────────────────────────────────
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "2. Arquitectura del Sistema", font: "Arial", size: 32, bold: true, color: C.indigo })] }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "2.1 Esquema de Red Local", font: "Arial", size: 26, bold: true, color: C.gray })] }),
        codeBlock([
          "  [Computador Servidor — Next.js + PostgreSQL]",
          "          |  Red WiFi/cable del consultorio",
          "    +-----+------+",
          "    |            |",
          " [Tablet]   [Computador 2]",
          "  Chrome       Chrome",
          "http://192.168.1.XX:3001",
        ]),
        spacer(120),
        P("El computador servidor corre la aplicación web y la base de datos. Los demás dispositivos se conectan a través del navegador a la IP local del servidor. No se requiere internet para el funcionamiento."),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "2.2 Configuración de Red Actual", font: "Arial", size: 26, bold: true, color: C.gray })] }),
        new Table({
          width: { size: 9200, type: WidthType.DXA },
          columnWidths: [3200, 6000],
          rows: [
            TH(["Parámetro", "Valor"], [3200, 6000]),
            TR(["URL local (mismo PC)", "http://localhost:3001"], [3200, 6000], C.white),
            TR(["URL red local (otros dispositivos)", "http://192.168.1.XX:3001"], [3200, 6000], C.grayLight),
            TR(["Puerto", "3001 (TCP)"], [3200, 6000], C.white),
            TR(["Protocolo", "HTTP (desarrollo) — HTTPS recomendado en producción"], [3200, 6000], C.grayLight),
            TR(["Regla de firewall", "Node.js — Centro Veterinario (Puerto 3001, Perfil: Any)"], [3200, 6000], C.white),
          ],
        }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "2.3 Por qué NO se usó Electron (App de Escritorio)", font: "Arial", size: 26, bold: true, color: C.gray })] }),
        P("Una app Electron instalada en cada máquina generaría 3 bases de datos independientes que requerirían sincronización, con riesgo real de conflictos (dos personas editando la misma mascota desde dispositivos distintos). El esquema servidor local + navegador garantiza consistencia: una sola base de datos, siempre sincronizada."),
        spacer(200),

        // ─── 3. STACK TECNOLÓGICO ──────────────────────────────────────────
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "3. Stack Tecnológico", font: "Arial", size: 32, bold: true, color: C.indigo })] }),
        new Table({
          width: { size: 9200, type: WidthType.DXA },
          columnWidths: [2800, 2800, 3600],
          rows: [
            TH(["Capa", "Tecnología", "Nota"], [2800, 2800, 3600]),
            TR(["Lenguaje", "TypeScript", "Compartido frontend y backend"], [2800, 2800, 3600], C.white),
            TR(["Framework", "Next.js 16 (App Router)", "PWA — funciona sin reescritura en la nube"], [2800, 2800, 3600], C.grayLight),
            TR(["Estilos", "Tailwind CSS v4", "Utilitario, sin CSS personalizado"], [2800, 2800, 3600], C.white),
            TR(["Base de datos", "PostgreSQL 17", "Mejor para escrituras simultáneas vs SQLite"], [2800, 2800, 3600], C.grayLight),
            TR(["ORM", "Prisma v7", "Type-safe, migraciones automáticas"], [2800, 2800, 3600], C.white),
            TR(["Autenticación", "Auth.js v5 (next-auth@beta)", "JWT, CredentialsProvider, 3 roles"], [2800, 2800, 3600], C.grayLight),
            TR(["PWA", "manifest.json nativo", "Instalar como app en tablet/PC"], [2800, 2800, 3600], C.white),
            TR(["Hosting", "Ninguno — PC del consultorio", "Costo infraestructura: $0/mes"], [2800, 2800, 3600], C.grayLight),
          ],
        }),
        spacer(200),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "3.1 Decisiones Técnicas Importantes (Prisma v7)", font: "Arial", size: 26, bold: true, color: C.gray })] }),
        P("Prisma v7 elimina el campo url del datasource en schema.prisma. Ahora usa un archivo de configuración separado (prisma.config.ts) y requiere un adaptador de driver para conectarse a la base de datos:"),
        codeBlock([
          "// src/lib/prisma.ts",
          "import { PrismaClient } from '@/generated/prisma/client'",
          "import { PrismaPg } from '@prisma/adapter-pg'",
          "",
          "const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })",
          "export const prisma = new PrismaClient({ adapter })",
        ]),
        P("El cliente generado se importa desde @/generated/prisma/client (no desde @prisma/client)."),
        spacer(200),
        new Paragraph({ children: [new PageBreak()] }),

        // ─── 4. MODELO DE DATOS ────────────────────────────────────────────
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "4. Modelo de Datos", font: "Arial", size: 32, bold: true, color: C.indigo })] }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "4.1 Entidades de Personal y Clientes (Fase 0-1)", font: "Arial", size: 26, bold: true, color: C.gray })] }),
        new Table({
          width: { size: 9200, type: WidthType.DXA },
          columnWidths: [2000, 4400, 2800],
          rows: [
            TH(["Entidad", "Campos Principales", "Tabla DB"], [2000, 4400, 2800]),
            TR(["Usuario", "id, nombre, email, passwordHash, rol, activo", "usuarios"], [2000, 4400, 2800], C.white),
            TR(["Empleado", "id, usuarioId (1:1), cargo, telefono, horario base, diasLaborales", "empleados"], [2000, 4400, 2800], C.grayLight),
            TR(["Cliente", "id, nombre, identificacion, telefono, email, direccion", "clientes"], [2000, 4400, 2800], C.white),
            TR(["Mascota", "id, nombre, especie, raza, fechaNacimiento, peso, clienteId", "mascotas"], [2000, 4400, 2800], C.grayLight),
          ],
        }),
        spacer(120),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "4.2 Historia Clínica (Fase 2)", font: "Arial", size: 26, bold: true, color: C.gray })] }),
        new Table({
          width: { size: 9200, type: WidthType.DXA },
          columnWidths: [2400, 6800],
          rows: [
            TH(["Entidad", "Descripción"], [2400, 6800]),
            TR(["Consulta", "Motivo, síntomas, diagnóstico, tratamiento, peso, temperatura, veterinario"], [2400, 6800], C.white),
            TR(["Vacuna", "Nombre, fecha de aplicación, lote, próxima dosis — alimenta recordatorios"], [2400, 6800], C.grayLight),
            TR(["Desparasitacion", "Tipo (interna/externa/ambas), producto, próxima dosis"], [2400, 6800], C.white),
          ],
        }),
        spacer(120),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "4.3 Agenda (Fase 3)", font: "Arial", size: 26, bold: true, color: C.gray })] }),
        new Table({
          width: { size: 9200, type: WidthType.DXA },
          columnWidths: [2400, 6800],
          rows: [
            TH(["Entidad", "Descripción"], [2400, 6800]),
            TR(["Cita", "Fecha, motivo, estado (pendiente/confirmada/cancelada/atendida), mascota, veterinario opcional"], [2400, 6800], C.white),
          ],
        }),
        P("El horario del personal se muestra a partir de los campos ya existentes en Empleado (horaEntrada, horaSalida, diasLaborales), sin tabla adicional."),
        spacer(120),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "4.4 Inventario (Fase 4)", font: "Arial", size: 26, bold: true, color: C.gray })] }),
        new Table({
          width: { size: 9200, type: WidthType.DXA },
          columnWidths: [2400, 6800],
          rows: [
            TH(["Entidad", "Descripción"], [2400, 6800]),
            TR(["Producto", "Categoría, unidad, stock, stockMinimo, precioCosto, precioVenta, proveedor"], [2400, 6800], C.white),
            TR(["MovimientoInventario", "Entrada, salida o ajuste — actualiza el stock con transacción atómica"], [2400, 6800], C.grayLight),
          ],
        }),
        spacer(120),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "4.5 Finanzas (Fase 5)", font: "Arial", size: 26, bold: true, color: C.gray })] }),
        new Table({
          width: { size: 9200, type: WidthType.DXA },
          columnWidths: [2400, 6800],
          rows: [
            TH(["Entidad", "Descripción"], [2400, 6800]),
            TR(["Cobro", "Recibo interno (numero autoincremental), concepto, monto, método de pago — NO es factura DIAN"], [2400, 6800], C.white),
            TR(["Egreso", "Concepto, monto, categoría (insumos/nómina/servicios/arriendo/otro), proveedor"], [2400, 6800], C.grayLight),
          ],
        }),
        spacer(120),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "4.6 Recordatorios (Fase 6)", font: "Arial", size: 26, bold: true, color: C.gray })] }),
        new Table({
          width: { size: 9200, type: WidthType.DXA },
          columnWidths: [2400, 6800],
          rows: [
            TH(["Entidad", "Descripción"], [2400, 6800]),
            TR(["Recordatorio", "Mensaje, fecha, completado, cliente/mascota opcionales — alertas manuales del personal"], [2400, 6800], C.white),
          ],
        }),
        P("Las alertas automáticas (vacunas/desparasitaciones próximas, citas del día, stock bajo) NO se almacenan: se calculan en tiempo real en /recordatorios a partir de los datos de las demás tablas."),
        spacer(120),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "4.7 Informes (Fase 7)", font: "Arial", size: 26, bold: true, color: C.gray })] }),
        P("La Fase 7 no agrega tablas nuevas: /informes consulta y agrega los datos de Cobro, Egreso, Consulta, Vacuna, Desparasitacion, Cita, MovimientoInventario, Cliente y Mascota dentro de un rango de fechas, y genera un reporte imprimible."),
        spacer(200),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "4.8 Roles de Usuario", font: "Arial", size: 26, bold: true, color: C.gray })] }),
        new Table({
          width: { size: 9200, type: WidthType.DXA },
          columnWidths: [2000, 7200],
          rows: [
            TH(["Rol", "Acceso"], [2000, 7200]),
            TR(["admin", "Acceso total: usuarios, empleados, finanzas, reportes, configuración"], [2000, 7200], C.white),
            TR(["veterinario", "Historia clínica, agenda de pacientes, mascotas, clientes"], [2000, 7200], C.grayLight),
            TR(["recepcionista", "Clientes, mascotas, agenda, cobros — sin acceso a reportes financieros completos"], [2000, 7200], C.white),
          ],
        }),
        spacer(200),
        new Paragraph({ children: [new PageBreak()] }),

        // ─── 5. PLAN DE FASES ──────────────────────────────────────────────
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "5. Plan de Desarrollo por Fases", font: "Arial", size: 32, bold: true, color: C.indigo })] }),
        new Table({
          width: { size: 9200, type: WidthType.DXA },
          columnWidths: [800, 3600, 4000, 800],
          rows: [
            TH(["Fase", "Módulo", "Contenido", "Estado"], [800, 3600, 4000, 800]),
            new TableRow({ children: [
              new TableCell({ borders, width: { size: 800, type: WidthType.DXA }, shading: { fill: C.greenLight, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: "0", font: "Arial", size: 20, bold: true, color: C.green })] })] }),
              new TableCell({ borders, width: { size: 3600, type: WidthType.DXA }, shading: { fill: C.greenLight, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: "Setup base + Autenticación", font: "Arial", size: 20, color: C.gray })] })] }),
              new TableCell({ borders, width: { size: 4000, type: WidthType.DXA }, shading: { fill: C.greenLight, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: "Next.js, Prisma, Auth.js, PWA, PostgreSQL", font: "Arial", size: 20, color: C.gray })] })] }),
              new TableCell({ borders, width: { size: 800, type: WidthType.DXA }, shading: { fill: C.greenLight, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: "Completado", font: "Arial", size: 18, bold: true, color: C.green })] })] }),
            ]}),
            ...["1|Gestión y Administración|CRUD: usuarios, empleados, clientes, mascotas",
                "2|Historia Clínica|Consultas, vacunas, desparasitaciones + resumen imprimible",
                "3|Agenda|Citas de pacientes por día + horario del personal",
                "4|Inventario|Productos, stock, movimientos (entrada/salida/ajuste), alertas de bajo stock",
                "5|Control Financiero|Cobros (recibo interno), egresos, ganancia neta por mes",
                "6|Recordatorios|Alertas automáticas (vacunas, citas, stock) + recordatorios manuales",
                "7|Informes Admin.|Reporte consolidado imprimible por rango de fechas",
            ].map(row => {
              const [n, modulo, contenido] = row.split("|");
              return new TableRow({ children: [
                new TableCell({ borders, width: { size: 800, type: WidthType.DXA }, shading: { fill: C.greenLight, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: n, font: "Arial", size: 20, bold: true, color: C.green })] })] }),
                new TableCell({ borders, width: { size: 3600, type: WidthType.DXA }, shading: { fill: C.greenLight, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: modulo, font: "Arial", size: 20, color: C.gray })] })] }),
                new TableCell({ borders, width: { size: 4000, type: WidthType.DXA }, shading: { fill: C.greenLight, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: contenido, font: "Arial", size: 20, color: C.gray })] })] }),
                new TableCell({ borders, width: { size: 800, type: WidthType.DXA }, shading: { fill: C.greenLight, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: "Completado", font: "Arial", size: 18, bold: true, color: C.green })] })] }),
              ]});
            }),
            TR(["8", "Despliegue LAN", "IP fija, backups automáticos, configuración de red", "En curso"], [800, 3600, 4000, 800], C.amberLight),
            TR(["9", "Pruebas", "Verificación en tablet + 2 computadores reales", "Pendiente"], [800, 3600, 4000, 800], C.white),
          ],
        }),
        spacer(200),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "5.1 Estimación de Tiempo", font: "Arial", size: 26, bold: true, color: C.gray })] }),
        P("Estimado total con un equipo de 1-2 desarrolladores: 3 a 4.5 meses para una versión sólida y probada en los 3 dispositivos reales del consultorio."),
        spacer(200),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "5.2 Pendientes de Mejora (Backlog)", font: "Arial", size: 26, bold: true, color: C.gray })] }),
        P("Detalles menores identificados durante las pruebas de las Fases 2 y 4, a revisar en una ronda de mejoras tras completar las 9 fases:"),
        bullet("Historia Clínica (Fase 2): ajustes visuales y de flujo pendientes de definir con el usuario"),
        bullet("Inventario (Fase 4): ajustes visuales y de flujo pendientes de definir con el usuario"),
        bullet("Acceso desde tablet/celular vía red local: pendiente de resolver firewall (ver sección 6.5)"),
        spacer(200),
        new Paragraph({ children: [new PageBreak()] }),

        // ─── 6. GUÍA DE OPERACIÓN ──────────────────────────────────────────
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "6. Guía de Operación", font: "Arial", size: 32, bold: true, color: C.indigo })] }),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "6.1 Iniciar el Sistema", font: "Arial", size: 26, bold: true, color: C.gray })] }),
        P("PostgreSQL 17 está configurado como servicio de Windows con inicio automático — no requiere ninguna acción. Solo iniciar el servidor Next.js:"),
        codeBlock([
          "cd \"C:\\CentroVeterinario\"",
          "npm run dev",
        ]),
        P("El sistema estará disponible en:"),
        bullet("Este PC: http://localhost:3001"),
        bullet("Tablet y otros dispositivos en la misma red: http://192.168.1.XX:3001"),
        spacer(100),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "6.2 Administración de PostgreSQL", font: "Arial", size: 26, bold: true, color: C.gray })] }),
        new Table({
          width: { size: 9200, type: WidthType.DXA },
          columnWidths: [2800, 6400],
          rows: [
            TH(["Herramienta", "Cómo acceder"], [2800, 6400]),
            TR(["pgAdmin 4 (visual)", "Menú Inicio → pgAdmin 4. Conectar con usuario postgres, contraseña: postgres"], [2800, 6400], C.white),
            TR(["Servicios de Windows", "Buscar 'Servicios' → postgresql-x64-17 (Iniciar / Detener)"], [2800, 6400], C.grayLight),
            TR(["Prisma Studio (web)", "npm run db:studio → abre UI en http://localhost:5555"], [2800, 6400], C.white),
            TR(["Terminal (psql)", "psql -U postgres -d centro_veterinario"], [2800, 6400], C.grayLight),
          ],
        }),
        spacer(120),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "6.3 Comandos Útiles del Proyecto", font: "Arial", size: 26, bold: true, color: C.gray })] }),
        new Table({
          width: { size: 9200, type: WidthType.DXA },
          columnWidths: [2800, 6400],
          rows: [
            TH(["Comando", "Descripción"], [2800, 6400]),
            TR(["npm run dev", "Iniciar servidor de desarrollo"], [2800, 6400], C.white),
            TR(["npm run build", "Compilar para producción"], [2800, 6400], C.grayLight),
            TR(["npm run start", "Iniciar servidor de producción"], [2800, 6400], C.white),
            TR(["npm run db:migrate", "Crear y aplicar nueva migración de base de datos"], [2800, 6400], C.grayLight),
            TR(["npm run db:generate", "Regenerar cliente Prisma tras cambios en schema"], [2800, 6400], C.white),
            TR(["npm run db:seed", "Recrear usuario admin inicial"], [2800, 6400], C.grayLight),
            TR(["npm run db:studio", "Abrir Prisma Studio (explorador visual de DB)"], [2800, 6400], C.white),
            TR(["npm run db:reset", "PELIGRO: Borrar y recrear toda la base de datos"], [2800, 6400], C.grayLight),
          ],
        }),
        spacer(200),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "6.4 Credenciales del Sistema", font: "Arial", size: 26, bold: true, color: C.gray })] }),
        new Table({
          width: { size: 9200, type: WidthType.DXA },
          columnWidths: [2400, 2800, 4000],
          rows: [
            TH(["Sistema", "Usuario / Parámetro", "Valor"], [2400, 2800, 4000]),
            TR(["App Web — Admin inicial", "admin@centroveterinario.com", "admin1234 (CAMBIAR)"], [2400, 2800, 4000], C.amberLight),
            TR(["PostgreSQL (superusuario)", "postgres", "postgres"], [2400, 2800, 4000], C.white),
            TR(["Base de datos", "nombre", "centro_veterinario"], [2400, 2800, 4000], C.grayLight),
            TR(["PostgreSQL (puerto)", "localhost:5432", "Uso interno únicamente"], [2400, 2800, 4000], C.white),
          ],
        }),
        new Paragraph({
          spacing: { after: 120, before: 120 },
          children: [
            new TextRun({ text: "IMPORTANTE: ", font: "Arial", size: 22, bold: true, color: C.red }),
            new TextRun({ text: "Cambiar la contraseña del usuario admin después del primer inicio de sesión desde la sección Administración > Usuarios.", font: "Arial", size: 22, color: C.gray }),
          ],
        }),
        spacer(200),

        new Paragraph({ heading: HeadingLevel.HEADING_2, children: [new TextRun({ text: "6.5 Pendiente: Acceso desde Tablet / Celular", font: "Arial", size: 26, bold: true, color: C.gray })] }),
        P("El servidor corre en 0.0.0.0:3001 y es accesible desde otros computadores de la red (192.168.1.XX:3001), pero el acceso desde la tablet/celular aún no quedó resuelto de forma definitiva. Se sospecha del Firewall de Windows en el PC servidor. Esto se aborda formalmente en la Fase 8 (sección de Despliegue LAN), incluyendo:"),
        bullet("Verificar la regla de firewall para Node.js en los 3 perfiles (Privado, Público, Dominio)"),
        bullet("Confirmar que la tablet esté en la misma red WiFi (no en una red de invitados aislada)"),
        bullet("Asignar IP reservada al PC servidor para que la URL no cambie"),
        spacer(200),
        new Paragraph({ children: [new PageBreak()] }),

        // ─── 7. ESTRUCTURA DEL PROYECTO ────────────────────────────────────
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "7. Estructura del Proyecto", font: "Arial", size: 32, bold: true, color: C.indigo })] }),
        codeBlock([
          "centro-veterinario/",
          "├── prisma/",
          "│   ├── schema.prisma          # Modelos de la base de datos",
          "│   ├── seed.ts                # Datos iniciales (usuario admin)",
          "│   └── migrations/            # Historial de cambios en la DB",
          "├── src/",
          "│   ├── app/",
          "│   │   ├── (auth)/            # Páginas de autenticación",
          "│   │   │   └── login/         # Formulario de ingreso",
          "│   │   ├── (dashboard)/       # Páginas protegidas (requieren login)",
          "│   │   │   ├── layout.tsx     # Sidebar + navegación",
          "│   │   │   ├── page.tsx       # Dashboard principal",
          "│   │   │   ├── clientes/      # Fase 1 — CRUD clientes",
          "│   │   │   ├── mascotas/      # Fase 1 — CRUD mascotas + historia clínica",
          "│   │   │   ├── admin/         # Fase 1 — usuarios y empleados (solo admin)",
          "│   │   │   ├── historia-clinica/ # Fase 2 — consultas, vacunas, desparasitaciones",
          "│   │   │   ├── agenda/        # Fase 3 — citas + horario del personal",
          "│   │   │   ├── inventario/    # Fase 4 — productos y movimientos de stock",
          "│   │   │   ├── finanzas/      # Fase 5 — cobros (recibo interno) y egresos",
          "│   │   │   ├── recordatorios/ # Fase 6 — alertas automáticas + manuales",
          "│   │   │   └── informes/      # Fase 7 — reporte consolidado imprimible",
          "│   │   ├── api/auth/          # Handler de Auth.js",
          "│   │   ├── globals.css        # Estilos globales",
          "│   │   └── layout.tsx         # Layout raíz (metadata PWA)",
          "│   ├── auth.ts                # Configuración de Auth.js",
          "│   ├── proxy.ts               # Protección de rutas (Next.js 16)",
          "│   ├── lib/",
          "│   │   └── prisma.ts          # Cliente de base de datos (singleton)",
          "│   ├── types/",
          "│   │   └── next-auth.d.ts     # Tipos de sesión extendidos",
          "│   └── generated/prisma/      # Cliente Prisma generado (no editar)",
          "├── public/",
          "│   ├── manifest.json          # Configuración PWA",
          "│   └── icons/                 # Íconos para instalar como app",
          "├── .env                       # Variables de entorno (no subir a git)",
          "├── next.config.ts             # Configuración de Next.js",
          "├── prisma.config.ts           # Configuración de Prisma CLI",
          "└── package.json",
        ]),
        spacer(200),
        new Paragraph({ children: [new PageBreak()] }),

        // ─── 8. REQUISITOS NO FUNCIONALES ──────────────────────────────────
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "8. Requisitos No Funcionales", font: "Arial", size: 32, bold: true, color: C.indigo })] }),
        new Table({
          width: { size: 9200, type: WidthType.DXA },
          columnWidths: [2200, 7000],
          rows: [
            TH(["Requisito", "Implementación"], [2200, 7000]),
            TR(["Seguridad", "Roles por URL (proxy.ts), contraseñas con bcrypt (12 rounds), JWT firmado con AUTH_SECRET"], [2200, 7000], C.white),
            TR(["Privacidad (Habeas Data)", "Ley 1581/2012: datos de clientes tratados solo internamente"], [2200, 7000], C.grayLight),
            TR(["Disponibilidad", "PostgreSQL inicia automáticamente con Windows; servidor Next.js debe iniciarse manualmente en horario de atención"], [2200, 7000], C.white),
            TR(["Backups", "Pendiente (Fase 8): backup diario automático a Google Drive/Dropbox"], [2200, 7000], C.grayLight),
            TR(["Escalabilidad", "Misma app puede desplegarse en la nube sin reescribirse"], [2200, 7000], C.white),
            TR(["PWA", "manifest.json con íconos, instalar como app en tablet y escritorio"], [2200, 7000], C.grayLight),
          ],
        }),
        spacer(200),

        // ─── 9. HISTORIAL DE CAMBIOS ───────────────────────────────────────
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: "9. Historial de Cambios", font: "Arial", size: 32, bold: true, color: C.indigo })] }),
        new Table({
          width: { size: 9200, type: WidthType.DXA },
          columnWidths: [1400, 1600, 2000, 4200],
          rows: [
            TH(["Versión", "Fecha", "Fase", "Cambios"], [1400, 1600, 2000, 4200]),
            ...[
              ["1.0", "20/06/2026", "Fase 0", "Configuración inicial: Next.js 16, Prisma 7, Auth.js 5, PWA, PostgreSQL 17 instalado, login y dashboard base verificados en red local"],
              ["1.1", "20/06/2026", "Fase 1", "CRUD completo de Clientes, Mascotas, Usuarios y Empleados. Componentes reutilizables BtnEliminar y NavLink"],
              ["1.2", "21/06/2026", "Fase 2", "Historia clínica: Consultas, Vacunas, Desparasitaciones. Resumen imprimible por mascota"],
              ["1.3", "21/06/2026", "Fase 3", "Agenda de citas por día con navegación y cambio rápido de estado. Horario semanal del personal"],
              ["1.4", "21/06/2026", "Fase 4", "Inventario: productos, stock, movimientos de entrada/salida/ajuste con transacción atómica"],
              ["1.5", "21/06/2026", "Fase 5", "Finanzas: Cobros (recibo interno) y Egresos, dashboard mensual con ganancia neta"],
              ["1.6", "21/06/2026", "Fase 6", "Recordatorios: alertas automáticas (vacunas, citas, stock bajo) + recordatorios manuales"],
              ["2.0", "21/06/2026", "Fase 7", "Informes administrativos: reporte consolidado imprimible por rango de fechas"],
            ].map(([v, f, fase, cambios]) => new TableRow({ children: [
              new TableCell({ borders, width: { size: 1400, type: WidthType.DXA }, shading: { fill: C.greenLight, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: v, font: "Arial", size: 20, bold: true, color: C.green })] })] }),
              new TableCell({ borders, width: { size: 1600, type: WidthType.DXA }, shading: { fill: C.greenLight, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: f, font: "Arial", size: 20, color: C.gray })] })] }),
              new TableCell({ borders, width: { size: 2000, type: WidthType.DXA }, shading: { fill: C.greenLight, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: fase, font: "Arial", size: 20, color: C.gray })] })] }),
              new TableCell({ borders, width: { size: 4200, type: WidthType.DXA }, shading: { fill: C.greenLight, type: ShadingType.CLEAR }, margins: { top: 80, bottom: 80, left: 120, right: 120 }, children: [new Paragraph({ spacing: { after: 0 }, children: [new TextRun({ text: cambios, font: "Arial", size: 20, color: C.gray })] })] }),
            ]})),
          ],
        }),
        spacer(400),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 400 },
          children: [new TextRun({ text: "— Fin del documento v2.0 —", font: "Arial", size: 18, italics: true, color: C.grayMid })],
        }),
      ],
    },
  ],
});

// ─── Guardar el archivo ─────────────────────────────────────────────────────
const outputPath = path.join(__dirname, "..", "Centro Veterinario — Documento de Proyecto.docx");
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outputPath, buffer);
  console.log("Documento creado:", outputPath);
});
