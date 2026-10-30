const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, HeadingLevel, BorderStyle, WidthType,
  ShadingType, PageNumber, LevelFormat, TableOfContents, PageBreak,
} = require("docx");
const fs = require("fs");
const path = require("path");

// ─── Colores ────────────────────────────────────────────────────────────────
const C = {
  indigo:    "4338CA",
  indigoMid: "818CF8",
  green:     "16A34A",
  greenLight:"DCFCE7",
  amber:     "D97706",
  amberLight:"FEF3C7",
  red:       "DC2626",
  redLight:  "FEE2E2",
  gray:      "374151",
  grayLight: "F3F4F6",
  grayMid:   "9CA3AF",
  white:     "FFFFFF",
};

const border  = { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const noBorders = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };

// ─── Helpers ────────────────────────────────────────────────────────────────
const H1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  children: [new TextRun({ text, font: "Arial", size: 32, bold: true, color: C.indigo })],
});

const H2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  children: [new TextRun({ text, font: "Arial", size: 26, bold: true, color: C.gray })],
});

const H3 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_3,
  children: [new TextRun({ text, font: "Arial", size: 23, bold: true, color: C.indigoMid })],
});

const P = (text, opts = {}) => new Paragraph({
  spacing: { after: 120 },
  children: [new TextRun({ text, font: "Arial", size: 22, color: C.gray, ...opts })],
});

const Bold = (text) => new TextRun({ text, font: "Arial", size: 22, bold: true, color: C.gray });

const bullet = (text) => new Paragraph({
  numbering: { reference: "bullets", level: 0 },
  spacing: { after: 80 },
  children: [new TextRun({ text, font: "Arial", size: 22, color: C.gray })],
});

const paso = (n, text) => new Paragraph({
  numbering: { reference: "pasos", level: 0 },
  spacing: { after: 100 },
  children: [new TextRun({ text, font: "Arial", size: 22, color: C.gray })],
});

const spacer = (pts = 200) => new Paragraph({ spacing: { after: pts }, children: [new TextRun("")] });

const tip = (text) => new Table({
  width: { size: 9200, type: WidthType.DXA },
  columnWidths: [9200],
  rows: [new TableRow({ children: [
    new TableCell({
      borders: noBorders,
      width: { size: 9200, type: WidthType.DXA },
      shading: { fill: C.indigoMid === "818CF8" ? "EEF2FF" : "EEF2FF", type: ShadingType.CLEAR },
      margins: { top: 140, bottom: 140, left: 220, right: 220 },
      children: [new Paragraph({
        spacing: { after: 0 },
        children: [
          new TextRun({ text: "💡 ", font: "Arial", size: 22 }),
          new TextRun({ text, font: "Arial", size: 22, color: C.gray, italics: true }),
        ],
      })],
    }),
  ]})],
});

const advertencia = (text) => new Table({
  width: { size: 9200, type: WidthType.DXA },
  columnWidths: [9200],
  rows: [new TableRow({ children: [
    new TableCell({
      borders: noBorders,
      width: { size: 9200, type: WidthType.DXA },
      shading: { fill: C.amberLight, type: ShadingType.CLEAR },
      margins: { top: 140, bottom: 140, left: 220, right: 220 },
      children: [new Paragraph({
        spacing: { after: 0 },
        children: [
          new TextRun({ text: "⚠ ", font: "Arial", size: 22 }),
          new TextRun({ text, font: "Arial", size: 22, color: C.gray, bold: true }),
        ],
      })],
    }),
  ]})],
});

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

const TR = (cells, widths, bg = C.white) => new TableRow({
  children: cells.map((t, i) => new TableCell({
    borders,
    width: { size: widths[i], type: WidthType.DXA },
    shading: { fill: bg, type: ShadingType.CLEAR },
    margins: { top: 80, bottom: 80, left: 160, right: 160 },
    children: [new Paragraph({
      spacing: { after: 0 },
      children: [new TextRun({ text: t, font: "Arial", size: 20, color: C.gray })],
    })],
  })),
});

const pageBreak = () => new Paragraph({ children: [new PageBreak()] });

// Encabezado de módulo con ícono
const moduloHeader = (icono, titulo, ruta, roles) => [
  new Paragraph({
    heading: HeadingLevel.HEADING_1,
    children: [new TextRun({ text: `${icono}  ${titulo}`, font: "Arial", size: 32, bold: true, color: C.indigo })],
  }),
  new Table({
    width: { size: 9200, type: WidthType.DXA },
    columnWidths: [2200, 7000],
    rows: [
      TR(["Ruta en el sistema", ruta], [2200, 7000], C.grayLight),
      TR(["Quién puede usarlo", roles], [2200, 7000], C.white),
    ],
  }),
  spacer(160),
];

// ─── Documento ──────────────────────────────────────────────────────────────
const doc = new Document({
  numbering: {
    config: [
      { reference: "bullets", levels: [{ level: 0, format: LevelFormat.BULLET, text: "•",
        alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "pasos", levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.",
        alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
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
        run: { size: 23, bold: true, font: "Arial", color: C.indigoMid },
        paragraph: { spacing: { before: 200, after: 80 }, outlineLevel: 2 } },
    ],
  },
  sections: [
    // ═══════════════════════════════════════════════════════════════════════
    // PORTADA
    // ═══════════════════════════════════════════════════════════════════════
    {
      properties: {
        page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } },
      },
      children: [
        spacer(1200),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 160 },
          children: [new TextRun({ text: "CENTRO VETERINARIO", font: "Arial", size: 48, bold: true, color: C.indigo })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 600 },
          children: [new TextRun({ text: "Manual de Usuario", font: "Arial", size: 32, color: C.grayMid })],
        }),
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
          children: [new TextRun({ text: "Guía de uso para el personal del consultorio", font: "Arial", size: 26, bold: true, color: C.gray })],
        }),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
          children: [new TextRun({ text: "Clientes · Mascotas · Historia Clínica · Agenda · Inventario · Finanzas · Recordatorios · Informes",
            font: "Arial", size: 20, color: C.grayMid })],
        }),
        spacer(800),
        new Table({
          width: { size: 7200, type: WidthType.DXA },
          alignment: AlignmentType.CENTER,
          columnWidths: [3600, 3600],
          rows: [
            TR(["Versión del manual", "1.0"], [3600, 3600], C.grayLight),
            TR(["Fecha", "21 de junio de 2026"], [3600, 3600], C.white),
            TR(["Módulos cubiertos", "8 (Fases 1 a 7)"], [3600, 3600], C.grayLight),
            TR(["Acceso al sistema", "http://192.168.1.XX:3001"], [3600, 3600], C.white),
          ],
        }),
        spacer(1200),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: "USO INTERNO — PERSONAL DEL CONSULTORIO", font: "Arial", size: 18, color: C.grayMid, italics: true })],
        }),
        pageBreak(),
      ],
    },

    // ═══════════════════════════════════════════════════════════════════════
    // CONTENIDO
    // ═══════════════════════════════════════════════════════════════════════
    {
      properties: {
        page: { size: { width: 12240, height: 15840 }, margin: { top: 1440, right: 1440, bottom: 1260, left: 1440 } },
      },
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            border: { bottom: { style: BorderStyle.SINGLE, size: 2, color: C.indigoMid, space: 4 } },
            children: [new TextRun({ text: "Centro Veterinario — Manual de Usuario", font: "Arial", size: 18, color: C.grayMid })],
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
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun({ text: "Tabla de Contenidos", font: "Arial", size: 32, bold: true, color: C.indigo })],
        }),
        new TableOfContents("Tabla de Contenidos", { hyperlink: true, headingStyleRange: "1-2" }),
        pageBreak(),

        // ═══ 1. INTRODUCCIÓN ═══
        H1("1. Introducción"),
        P("Centro Veterinario es el sistema de gestión interna del consultorio. Funciona dentro de la red local — no necesita internet — y se usa desde el navegador (Chrome, Edge, etc.) en cualquiera de los computadores o la tablet conectados a la misma red WiFi."),

        H2("1.1 Cómo entrar al sistema"),
        paso(1, "Abre el navegador en tu computador o tablet."),
        paso(2, "Escribe en la barra de direcciones: http://192.168.1.XX:3001"),
        paso(3, "Ingresa tu correo y contraseña en la pantalla de inicio de sesión."),
        paso(4, "Si es la primera vez que usas el sistema, pide tus credenciales al administrador."),
        tip("Guarda la página como favorito en el navegador para no tener que escribir la dirección cada vez."),
        spacer(120),

        H2("1.2 Roles de usuario"),
        P("El sistema muestra opciones distintas según tu rol:"),
        new Table({
          width: { size: 9200, type: WidthType.DXA },
          columnWidths: [2200, 7000],
          rows: [
            TH(["Rol", "Qué puede hacer"], [2200, 7000]),
            TR(["Administrador", "Acceso a todo el sistema, incluyendo Usuarios y Empleados"], [2200, 7000], C.white),
            TR(["Veterinario", "Clientes, mascotas, historia clínica, agenda, recordatorios e informes"], [2200, 7000], C.grayLight),
            TR(["Recepcionista", "Clientes, mascotas, agenda, cobros, inventario y recordatorios"], [2200, 7000], C.white),
          ],
        }),
        spacer(160),

        H2("1.3 Menú principal"),
        P("Todas las secciones se acceden desde el menú lateral izquierdo. Los íconos te ayudan a identificar cada módulo rápidamente:"),
        bullet("🏠 Inicio — accesos rápidos a las tareas más comunes"),
        bullet("👤 Clientes — dueños registrados"),
        bullet("🐾 Mascotas — pacientes registrados"),
        bullet("📅 Agenda — citas del día y horario del personal"),
        bullet("📋 Historia Clínica — consultas, vacunas y desparasitaciones"),
        bullet("📦 Inventario — productos y stock"),
        bullet("💰 Finanzas — cobros y egresos"),
        bullet("🔔 Recordatorios — alertas y pendientes"),
        bullet("📊 Informes — reportes administrativos"),
        bullet("👥 Usuarios / 🧑‍⚕️ Empleados — solo visibles para el administrador"),
        pageBreak(),

        // ═══ 2. CLIENTES ═══
        ...moduloHeader("👤", "2. Clientes", "/clientes", "Todos los roles"),
        P("Aquí se registran los dueños de las mascotas. Cada cliente puede tener una o varias mascotas asociadas."),

        H2("2.1 Buscar un cliente"),
        paso(1, "Entra a Clientes desde el menú."),
        paso(2, "Escribe en la barra de búsqueda el nombre, cédula, teléfono o correo del cliente."),
        paso(3, "Presiona la lupa o Enter para filtrar la lista."),
        spacer(100),

        H2("2.2 Registrar un cliente nuevo"),
        paso(1, "Haz clic en \"+ Nuevo cliente\"."),
        paso(2, "Llena el nombre (obligatorio) y los demás datos que tengas disponibles."),
        paso(3, "Haz clic en \"Crear cliente\"."),
        spacer(100),

        H2("2.3 Ver, editar o eliminar"),
        bullet("Haz clic en el nombre del cliente para ver su ficha completa y sus mascotas"),
        bullet("Usa el botón \"Editar\" para corregir sus datos"),
        bullet("Usa el botón \"Eliminar\" para borrarlo — esto también elimina sus mascotas registradas"),
        advertencia("Eliminar un cliente borra también todas sus mascotas y su historia clínica. Esta acción no se puede deshacer."),
        pageBreak(),

        // ═══ 3. MASCOTAS ═══
        ...moduloHeader("🐾", "3. Mascotas", "/mascotas", "Todos los roles"),
        P("Cada mascota está asociada a un cliente. Desde la ficha de la mascota se accede a toda su historia clínica, sus próximas citas y se puede generar un resumen para imprimir."),

        H2("3.1 Registrar una mascota nueva"),
        paso(1, "Desde Mascotas, haz clic en \"+ Nueva mascota\" (o desde la ficha del cliente, en \"+ Agregar mascota\")."),
        paso(2, "Selecciona el dueño, escribe el nombre, especie, raza, peso y fecha de nacimiento si la conoces."),
        paso(3, "Guarda los cambios."),
        spacer(100),

        H2("3.2 Ficha de la mascota"),
        P("Al entrar a una mascota verás:"),
        bullet("Datos básicos: dueño, peso, edad calculada automáticamente"),
        bullet("Próximas citas agendadas"),
        bullet("Historial de consultas, vacunas y desparasitaciones"),
        bullet("Botón \"Imprimir resumen\" — genera un documento con todo el historial, listo para imprimir o guardar en PDF"),
        tip("El botón \"Imprimir resumen\" es útil cuando el cliente lleva la mascota a otra clínica o necesita el historial completo."),
        pageBreak(),

        // ═══ 4. HISTORIA CLÍNICA ═══
        ...moduloHeader("📋", "4. Historia Clínica", "/historia-clinica  ·  desde la ficha de cada mascota", "Veterinario (registrar) · Todos (consultar)"),
        P("La historia clínica de cada mascota se compone de tres tipos de registros: consultas, vacunas y desparasitaciones. Se registran desde la ficha de la mascota."),

        H2("4.1 Registrar una consulta"),
        paso(1, "Entra a la mascota → \"+ Nueva consulta\"."),
        paso(2, "Completa motivo (obligatorio), síntomas, diagnóstico, tratamiento, peso y temperatura si los tomaste."),
        paso(3, "Guarda. La consulta queda en el historial con fecha y el veterinario que la atendió."),
        spacer(100),

        H2("4.2 Registrar una vacuna"),
        paso(1, "Entra a la mascota → \"+ Registrar vacuna\"."),
        paso(2, "Indica el nombre de la vacuna, fecha de aplicación, lote (opcional) y la próxima dosis si aplica."),
        paso(3, "Guarda. Si registraste una próxima dosis, el sistema generará una alerta automática en Recordatorios cuando se acerque la fecha."),
        spacer(100),

        H2("4.3 Registrar una desparasitación"),
        paso(1, "Entra a la mascota → \"+ Registrar\" en la sección de Desparasitaciones."),
        paso(2, "Indica el tipo (interna, externa o ambas), producto usado y próxima dosis si aplica."),
        paso(3, "Guarda."),
        spacer(100),

        H2("4.4 Vista general de consultas"),
        P("La sección Historia Clínica del menú principal muestra las últimas 50 consultas registradas de todas las mascotas, con buscador por mascota, dueño o diagnóstico — útil para encontrar rápido una atención anterior sin recordar de qué mascota era."),
        pageBreak(),

        // ═══ 5. AGENDA ═══
        ...moduloHeader("📅", "5. Agenda", "/agenda", "Todos los roles"),
        P("La Agenda muestra las citas programadas día por día, y por separado el horario semanal del personal."),

        H2("5.1 Ver las citas del día"),
        P("Al entrar a Agenda se muestra automáticamente el día de hoy. Usa los botones \"← Anterior\", \"Hoy\" y \"Siguiente →\" para moverte entre fechas, o el selector de fecha para ir directo a un día específico."),
        spacer(100),

        H2("5.2 Crear una cita"),
        paso(1, "Haz clic en \"+ Nueva cita\"."),
        paso(2, "Selecciona la mascota, la fecha y hora, y escribe el motivo."),
        paso(3, "Si quieres, asigna un veterinario específico."),
        paso(4, "Guarda. La cita aparece en la agenda de ese día."),
        tip("También puedes agendar una cita directamente desde la ficha de la mascota, con el botón \"+ Agendar cita\"."),
        spacer(100),

        H2("5.3 Cambiar el estado de una cita"),
        P("Cada cita tiene botones rápidos para cambiar su estado sin necesidad de editarla completa:"),
        bullet("Confirmar — el cliente confirmó que asistirá"),
        bullet("Atendida — la cita ya se realizó"),
        bullet("Cancelar — la cita no se va a realizar"),
        spacer(100),

        H2("5.4 Horario del personal"),
        P("Desde Agenda, el botón \"📅 Horario del personal\" muestra una tabla con los días que trabaja cada empleado y su horario de entrada/salida (configurado por el administrador en la sección Empleados)."),
        pageBreak(),

        // ═══ 6. INVENTARIO ═══
        ...moduloHeader("📦", "6. Inventario", "/inventario", "Todos los roles"),
        P("Controla el stock de medicamentos, alimentos, accesorios y productos de higiene del consultorio."),

        H2("6.1 Registrar un producto nuevo"),
        paso(1, "Haz clic en \"+ Nuevo producto\"."),
        paso(2, "Completa nombre, categoría, unidad de medida (unidad, caja, ml, kg...), stock inicial y stock mínimo."),
        paso(3, "Opcionalmente agrega precio de costo, precio de venta y proveedor."),
        paso(4, "Guarda."),
        spacer(100),

        H2("6.2 Registrar entradas y salidas de stock"),
        P("El stock NO se edita directamente — siempre se actualiza registrando un movimiento, para mantener trazabilidad de todo lo que entra y sale:"),
        paso(1, "Entra al producto y ve a la sección \"Registrar movimiento\"."),
        paso(2, "Elige el tipo: Entrada (llegó mercancía), Salida (se usó o vendió) o Ajuste (corregir el stock a un número exacto)."),
        paso(3, "Indica la cantidad y, si quieres, el motivo (compra, venta, vencido, etc.)."),
        paso(4, "Guarda. El stock se actualiza al instante y queda registrado en el historial del producto."),
        spacer(100),

        H2("6.3 Alertas de stock bajo"),
        P("Cuando el stock de un producto llega a su stock mínimo configurado, aparece marcado con ⚠️ en la lista de Inventario y también se muestra en la sección Recordatorios."),
        pageBreak(),

        // ═══ 7. FINANZAS ═══
        ...moduloHeader("💰", "7. Finanzas", "/finanzas", "Todos los roles (reportes completos: ver nota)"),
        advertencia("Los \"Cobros\" registrados en este módulo son recibos internos de control administrativo. NO son facturas electrónicas ante la DIAN. Si el consultorio necesita facturación electrónica, debe consultarse con el contador como un proyecto separado."),

        H2("7.1 Panel financiero"),
        P("Al entrar a Finanzas verás un resumen del mes: total de cobros, total de egresos y la ganancia neta, junto con un desglose por método de pago y por categoría de egreso. Usa los botones de navegación para revisar meses anteriores o siguientes."),
        spacer(100),

        H2("7.2 Registrar un cobro"),
        paso(1, "Haz clic en \"+ Registrar cobro\"."),
        paso(2, "Escribe el concepto (ej: consulta general, vacunación, venta de producto) y el monto."),
        paso(3, "Elige el método de pago (efectivo, tarjeta, transferencia u otro)."),
        paso(4, "Opcionalmente asocia el cobro a un cliente y su mascota."),
        paso(5, "Guarda. El cobro queda numerado automáticamente como recibo interno."),
        spacer(100),

        H2("7.3 Registrar un egreso"),
        paso(1, "Desde Finanzas, haz clic en \"+ Registrar egreso\"."),
        paso(2, "Escribe el concepto, el monto y elige la categoría (insumos, nómina, servicios, arriendo u otro)."),
        paso(3, "Guarda."),
        spacer(100),

        H2("7.4 Consultar el historial"),
        P("Las secciones \"Cobros\" y \"Egresos\" del módulo de Finanzas muestran el listado completo con buscador, donde puedes editar o eliminar cualquier registro."),
        pageBreak(),

        // ═══ 8. RECORDATORIOS ═══
        ...moduloHeader("🔔", "8. Recordatorios y alertas", "/recordatorios", "Todos los roles"),
        P("Esta sección reúne en un solo lugar todo lo que necesita atención: citas de hoy, vacunas y desparasitaciones próximas a vencer, productos con poco stock, y recordatorios escritos a mano por el personal."),

        H2("8.1 Alertas automáticas"),
        P("Estas se generan solas, sin que nadie tenga que registrarlas — el sistema las calcula cada vez que abres la página:"),
        bullet("Citas de hoy"),
        bullet("Vacunas con próxima dosis en los siguientes 7 días, o ya vencidas (en rojo)"),
        bullet("Desparasitaciones con próxima dosis en los siguientes 7 días, o ya vencidas (en rojo)"),
        bullet("Productos con stock igual o menor al mínimo configurado"),
        spacer(100),

        H2("8.2 Crear un recordatorio manual"),
        paso(1, "Haz clic en \"+ Nuevo recordatorio\"."),
        paso(2, "Escribe el mensaje (ej: \"Llamar para confirmar cirugía\") y la fecha."),
        paso(3, "Opcionalmente asócialo a un cliente y mascota."),
        paso(4, "Guarda."),
        spacer(100),

        H2("8.3 Marcar como completado"),
        P("Cada recordatorio manual tiene un círculo a la izquierda — haz clic para marcarlo como completado (se tachará) o para volverlo a marcar como pendiente."),
        pageBreak(),

        // ═══ 9. INFORMES ═══
        ...moduloHeader("📊", "9. Informes administrativos", "/informes", "Todos los roles"),
        P("Genera un reporte consolidado de la operación del consultorio en cualquier rango de fechas, listo para imprimir o guardar como PDF."),

        H2("9.1 Generar un informe"),
        paso(1, "Entra a Informes."),
        paso(2, "Selecciona la fecha \"Desde\" y \"Hasta\" del período que quieres revisar (por defecto muestra el mes actual)."),
        paso(3, "Haz clic en \"Generar\"."),
        paso(4, "Usa el botón \"Imprimir / Guardar PDF\" para obtener una copia física o digital."),
        spacer(100),

        H2("9.2 Qué incluye el informe"),
        bullet("Resumen financiero: total cobros, egresos y ganancia neta"),
        bullet("Atención clínica: cantidad de consultas (por veterinario), vacunas y desparasitaciones aplicadas"),
        bullet("Agenda: citas por estado (pendientes, confirmadas, canceladas, atendidas)"),
        bullet("Inventario: entradas y salidas del período, y cantidad de productos con stock bajo actual"),
        bullet("Crecimiento: clientes y mascotas nuevas registradas en el período"),
        pageBreak(),

        // ═══ 10. ADMINISTRACIÓN ═══
        ...moduloHeader("👥", "10. Administración (solo Administrador)", "/admin/usuarios  ·  /admin/empleados", "Solo Administrador"),
        P("Estas secciones solo son visibles para usuarios con rol Administrador."),

        H2("10.1 Usuarios"),
        P("Permite crear las cuentas de acceso al sistema para cada miembro del personal, asignar su rol (admin, veterinario, recepcionista), y desactivar el acceso de alguien que ya no trabaja en el consultorio sin borrar su historial."),
        spacer(100),

        H2("10.2 Empleados"),
        P("Complementa la información del usuario con sus datos laborales: cargo, teléfono, horario de entrada/salida y días que labora. Esta información alimenta la vista \"Horario del personal\" en la Agenda."),
        pageBreak(),

        // ═══ 11. PREGUNTAS FRECUENTES ═══
        H1("11. Preguntas frecuentes"),

        H3("¿Qué hago si olvidé mi contraseña?"),
        P("Pide al administrador que entre a Usuarios y te asigne una contraseña nueva."),

        H3("¿Por qué no veo la opción de Usuarios o Empleados?"),
        P("Esas secciones solo aparecen si tu cuenta tiene el rol de Administrador."),

        H3("¿Puedo deshacer si elimino algo por error?"),
        P("No. Todas las eliminaciones (clientes, mascotas, citas, productos, cobros, etc.) son definitivas. El sistema siempre pide confirmación antes de borrar — léela con atención."),

        H3("¿Qué pasa si dos personas usan el sistema al mismo tiempo?"),
        P("No hay problema — todos los dispositivos se conectan a la misma base de datos. Los cambios de una persona los ve la otra en cuanto recarga la página."),

        H3("¿El sistema funciona sin internet?"),
        P("Sí. Solo necesita que el computador servidor esté encendido y que tu dispositivo esté conectado a la misma red WiFi del consultorio."),

        H3("¿\"Cobro\" es lo mismo que una factura?"),
        P("No. El \"Cobro\" es un recibo interno para control administrativo del consultorio. No reemplaza ni tiene validez como factura electrónica ante la DIAN."),

        spacer(400),
        new Paragraph({
          alignment: AlignmentType.CENTER,
          spacing: { before: 400 },
          children: [new TextRun({ text: "— Fin del Manual de Usuario v1.0 —", font: "Arial", size: 18, italics: true, color: C.grayMid })],
        }),
      ],
    },
  ],
});

const outputPath = path.join(__dirname, "..", "Centro Veterinario — Manual de Usuario.docx");
Packer.toBuffer(doc).then(buffer => {
  fs.writeFileSync(outputPath, buffer);
  console.log("Manual creado:", outputPath);
});
