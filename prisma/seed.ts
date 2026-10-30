import 'dotenv/config'
import { prisma } from '../src/lib/prisma'
import * as bcrypt from 'bcryptjs'

async function main() {
  console.log('Limpiando base de datos...')
  await prisma.usuario.deleteMany()
  await prisma.negocio.deleteMany()

  const passwordHash = await bcrypt.hash('123456', 10)

  console.log('Creando negocios de prueba con la nueva estructura SaaS...')

  // 1. Taller Automotriz
  await prisma.negocio.create({
    data: {
      nombre: 'AutoFix Taller Premium',
      tipoNegocio: 'taller',
      modulosActivos: ['inicio', 'agenda', 'fichas', 'clientes', 'atenciones', 'inventario', 'facturas'],
      usuarios: {
        create: {
          nombre: 'Carlos (Mecánico)',
          email: 'taller@demo.com',
          passwordHash,
          rol: 'admin'
        }
      }
    }
  })

  // 2. Barbería / Spa
  await prisma.negocio.create({
    data: {
      nombre: 'Style & Grooming',
      tipoNegocio: 'barberia',
      modulosActivos: ['inicio', 'agenda', 'fichas', 'clientes', 'atenciones', 'facturas'],
      usuarios: {
        create: {
          nombre: 'Andrés (Barbero)',
          email: 'barberia@demo.com',
          passwordHash,
          rol: 'admin'
        }
      }
    }
  })

  // 3. Clínica Veterinaria
  await prisma.negocio.create({
    data: {
      nombre: 'VetCare Centro Integral',
      tipoNegocio: 'veterinaria',
      modulosActivos: ['inicio', 'agenda', 'fichas', 'clientes', 'atenciones', 'inventario', 'facturas'],
      usuarios: {
        create: {
          nombre: 'Dra. Marizuly',
          email: 'vet@demo.com',
          passwordHash,
          rol: 'admin'
        }
      }
    }
  })

  console.log('✅ Base de datos sembrada con éxito.')
  console.log('🔑 Credenciales (Contraseña universal: 123456)')
  console.log('🚗 Taller Automotriz : taller@demo.com')
  console.log('✂️  Barbería / Spa    : barberia@demo.com')
  console.log('🐾 Veterinaria       : vet@demo.com')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })