// @ts-nocheck
import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

// Datos ficticios para demostraciones comerciales.
// Uso: npm run db:seed && npm run db:seed-demo  (solo en una base vacía)

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

const hoy = new Date()
const a = (dias: number, hora = 9, min = 0) =>
  new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + dias, hora, min)

async function main() {
  const vet = await prisma.usuario.findFirst({ where: { rol: "VETERINARIO" } });
  const admin = await prisma.usuario.findFirst({ where: { rol: "ADMIN" } });
  if (!vet || !admin) throw new Error("Ejecuta primero: npm run db:seed")

  if (await prisma.cliente.count()) {
    console.log("La base ya tiene clientes; se omiten los datos base.")
  } else {
    await datosBase(vet.id, admin.id)
  }
  if (await prisma.factura.count()) {
    console.log("La base ya tiene facturas; se omite la factura demo.")
  } else {
    await facturaYFormula(vet.id, admin.id)
  }
}

async function datosBase(vetId: string, adminId: string) {
  const vet = { id: vetId }
  const admin = { id: adminId }

  const [maria, jorge, sofia] = await Promise.all([
    prisma.cliente.create({ data: { nombre: "María Fernanda López", identificacion: "1000000001", telefono: "300 000 0001", email: "maria.demo@example.com", direccion: "Calle 10 # 20-30" } }),
    prisma.cliente.create({ data: { nombre: "Jorge Ramírez", identificacion: "1000000002", telefono: "300 000 0002", direccion: "Carrera 5 # 12-40" } }),
    prisma.cliente.create({ data: { nombre: "Sofía Martínez", identificacion: "1000000003", telefono: "300 000 0003", email: "sofia.demo@example.com" } }),
  ])

  const [max, luna, rocky, kiwi] = await Promise.all([
    prisma.mascota.create({ data: { nombre: "Max", especie: "perro", raza: "Labrador", peso: 28, fechaNacimiento: new Date(hoy.getFullYear() - 4, 2, 15), clienteId: maria.id } }),
    prisma.mascota.create({ data: { nombre: "Luna", especie: "gato", raza: "Criollo", peso: 4.2, fechaNacimiento: new Date(hoy.getFullYear() - 2, 6, 1), clienteId: maria.id } }),
    prisma.mascota.create({ data: { nombre: "Rocky", especie: "perro", raza: "Bulldog francés", peso: 12, fechaNacimiento: new Date(hoy.getFullYear() - 6, 0, 20), clienteId: jorge.id } }),
    prisma.mascota.create({ data: { nombre: "Kiwi", especie: "ave", raza: "Periquito", peso: 0.04, clienteId: sofia.id } }),
  ])

  await prisma.consulta.createMany({
    data: [
      { mascotaId: max.id, veterinarioId: vet.id, fecha: a(-20, 10), motivo: "Control anual", peso: 28, temperatura: 38.6, diagnostico: "Paciente sano", tratamiento: "Continuar dieta actual" },
      { mascotaId: rocky.id, veterinarioId: vet.id, fecha: a(-3, 15), motivo: "Dificultad respiratoria leve", peso: 12.3, temperatura: 39.1, diagnostico: "Síndrome braquicefálico leve", tratamiento: "Control de peso y evitar ejercicio intenso en calor" },
    ],
  })
  await prisma.vacuna.createMany({
    data: [
      { mascotaId: max.id, veterinarioId: vet.id, nombre: "Rabia", fecha: a(-360), proximaDosis: a(5) },
      { mascotaId: luna.id, veterinarioId: vet.id, nombre: "Triple felina", fecha: a(-30), proximaDosis: a(335) },
    ],
  })
  await prisma.desparasitacion.create({ data: { mascotaId: rocky.id, fecha: a(-85), tipo: "interna", producto: "Antiparasitario oral", proximaDosis: a(5) } })

  await prisma.cita.createMany({
    data: [
      { mascotaId: luna.id, veterinarioId: vet.id, fecha: a(0, 9, 30), motivo: "Vacunación", tipo: "vacunacion", estado: "confirmada" },
      { mascotaId: rocky.id, veterinarioId: vet.id, fecha: a(0, 11), motivo: "Control respiratorio", tipo: "control" },
      { mascotaId: kiwi.id, veterinarioId: vet.id, fecha: a(0, 16), motivo: "Revisión de plumaje", tipo: "consulta" },
      { mascotaId: max.id, veterinarioId: vet.id, fecha: a(2, 10), motivo: "Limpieza dental", tipo: "cirugia" },
    ],
  })

  await prisma.producto.createMany({
    data: [
      { nombre: "Vacuna antirrábica", categoria: "medicamento", unidad: "dosis", stock: 3, stockMinimo: 5, precioCosto: 18000, precioVenta: 35000, proveedor: "Distribuidora Demo" },
      { nombre: "Alimento adulto 3 kg", categoria: "alimento", unidad: "bolsa", stock: 14, stockMinimo: 4, precioCosto: 45000, precioVenta: 62000 },
      { nombre: "Shampoo hipoalergénico", categoria: "higiene", unidad: "frasco", stock: 8, stockMinimo: 2, precioCosto: 15000, precioVenta: 28000 },
    ],
  })

  await prisma.cobro.createMany({
    data: [
      { concepto: "Consulta general", monto: 60000, metodoPago: "tarjeta", clienteId: maria.id, mascotaId: max.id, usuarioId: admin.id, fecha: a(-20, 11) },
      { concepto: "Consulta + medicamento", monto: 95000, metodoPago: "efectivo", clienteId: jorge.id, mascotaId: rocky.id, usuarioId: admin.id, fecha: a(-3, 16) },
    ],
  })
  await prisma.egreso.create({ data: { concepto: "Compra de insumos", monto: 250000, categoria: "insumos", proveedor: "Distribuidora Demo", usuarioId: admin.id, fecha: a(-10) } })
  await prisma.recordatorio.create({ data: { mensaje: "Llamar a María para refuerzo de vacuna de Max", fecha: a(4), clienteId: maria.id, mascotaId: max.id, usuarioId: admin.id } })

  console.log("✓ Datos demo cargados: 3 clientes, 4 mascotas, citas de hoy, inventario, cobros y recordatorios.")
}

async function facturaYFormula(vetId: string, adminId: string) {
  const cliente = await prisma.cliente.findUnique({ where: { identificacion: "1000000001" } })
  const mascota = cliente && (await prisma.mascota.findFirst({ where: { clienteId: cliente.id, nombre: "Max" } }))
  if (!cliente || !mascota) {
    console.log("No se encontró el cliente demo; se omite la factura demo.")
    return
  }

  // Igual que la app: subtotal + IVA, y la factura genera su cobro
  const items = [
    { descripcion: "Consulta general", cantidad: 1, precioUnit: 60000 },
    { descripcion: "Vacuna antirrábica", cantidad: 1, precioUnit: 35000 },
  ].map((i, orden) => ({ ...i, orden, total: i.cantidad * i.precioUnit }))
  const porcentajeIva = 19
  const subtotal = items.reduce((acc, i) => acc + i.total, 0)
  const total = subtotal * (1 + porcentajeIva / 100)

  const factura = await prisma.factura.create({
    data: {
      clienteId: cliente.id, mascotaId: mascota.id, usuarioId: adminId,
      porcentajeIva, subtotal, total, fecha: a(-1, 10),
      items: { create: items },
    },
  })
  await prisma.cobro.create({
    data: {
      concepto: `Factura No. ${factura.numero}`, monto: total, metodoPago: "tarjeta",
      clienteId: cliente.id, mascotaId: mascota.id, usuarioId: adminId, fecha: a(-1, 10),
      facturaId: factura.id,
    },
  })
  await prisma.formulaMedica.create({
    data: {
      mascotaId: mascota.id, veterinarioId: vetId, fecha: a(-1, 10),
      items: {
        create: [
          { orden: 0, medicamento: "Carprofeno 75 mg", instrucciones: "1/2 tableta cada 12 horas por 5 días, con comida" },
          { orden: 1, medicamento: "Omeprazol 20 mg", instrucciones: "1 cápsula en ayunas por 5 días" },
        ],
      },
    },
  })
  console.log(`✓ Factura demo No. ${factura.numero} y fórmula médica cargadas.`)
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
