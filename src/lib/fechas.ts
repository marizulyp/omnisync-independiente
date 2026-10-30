// Fechas sin hora (las de un <input type="date">, "AAAA-MM-DD").
//
// new Date("2026-10-09") las interpreta como medianoche UTC, que en Colombia
// (UTC-5) es el día anterior a las 7:00 p. m.: se mostraban con un día menos.
// Por eso se guardan a las 12:00 hora local y se leen con la fecha local.

/** Convierte "AAAA-MM-DD" en una fecha a las 12:00 hora local (otros formatos: como new Date). */
export function parseFechaLocal(valor: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor.trim())
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0)
  return new Date(valor)
}

/** "AAAA-MM-DD" de una fecha según la hora local (hoy por defecto), para <input type="date">. */
export function fechaLocalISO(fecha: Date = new Date()): string {
  const d = new Date(fecha)
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-")
}
