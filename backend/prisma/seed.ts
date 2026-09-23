import { PrismaClient, Modality, EventStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Sembrando datos iniciales...');

  const password = await bcrypt.hash('Password123!', 10);

  const usuarios = [
    {
      documentNumber: '1000000001',
      email: 'admin@eventos.sena.edu.co',
      firstName: 'Ana',
      lastName: 'Administradora',
      activeRole: 'ADMIN' as const
    },
    {
      documentNumber: '1000000002',
      email: 'comite@eventos.sena.edu.co',
      firstName: 'Carlos',
      lastName: 'Comite',
      activeRole: 'COMITE' as const
    },
    {
      documentNumber: '1000000003',
      email: 'operador@eventos.sena.edu.co',
      firstName: 'Diana',
      lastName: 'Operadora',
      activeRole: 'OPERADOR' as const
    },
    {
      documentNumber: '900123456',
      email: 'comprador@empresa.com',
      firstName: 'Empresas',
      lastName: 'Compradoras SAS',
      activeRole: 'COMPRADOR' as const
    },
    {
      documentNumber: '1098765432',
      email: 'proveedor@soy.sena.edu.co',
      firstName: 'Luis',
      lastName: 'Emprendedor',
      activeRole: 'PROVEEDOR' as const
    },
    {
      documentNumber: '1023456789',
      email: 'asistente@correo.com',
      firstName: 'Marta',
      lastName: 'Asistente',
      activeRole: 'ASISTENTE' as const
    }
  ];

  const creados: Record<string, string> = {};

  for (const u of usuarios) {
    const user = await prisma.user.upsert({
      where: { documentNumber: u.documentNumber },
      update: {},
      create: {
        documentNumber: u.documentNumber,
        email: u.email,
        passwordHash: password,
        firstName: u.firstName,
        lastName: u.lastName,
        activeRole: u.activeRole,
        emailVerifiedAt: new Date(),
        dataPolicyAcceptedAt: new Date(),
        roles: { create: { role: u.activeRole } }
      }
    });
    creados[u.activeRole] = user.id;
  }

  const categorias = [
    { name: 'Economía Circular', slug: 'economia-circular' },
    { name: 'Tecnología y Agro', slug: 'tecnologia-y-agro' },
    { name: 'Rueda de Negocios', slug: 'rueda-de-negocios' },
    { name: 'Convocatoria', slug: 'convocatoria' },
    { name: 'Taller', slug: 'taller' },
    { name: 'Conferencia', slug: 'conferencia' }
  ];

  const catMap: Record<string, string> = {};
  for (const c of categorias) {
    const cat = await prisma.category.upsert({
      where: { slug: c.slug },
      update: {},
      create: c
    });
    catMap[c.slug] = cat.id;
  }

  const existente = await prisma.event.findFirst({ where: { name: { contains: 'Macrorrueda' } } });
  if (!existente) {
    const hoy = new Date();
    const evento = await prisma.event.create({
      data: {
        name: 'Macro Macrorrueda de Negocios Fondo Emprender 2026',
        description:
          'Espacio de emparejamiento comercial entre emprendedores SENA y compradores nacionales del sector agroindustrial y tecnológico.',
        categoryId: catMap['rueda-de-negocios'],
        modality: Modality.PRESENCIAL,
        date: new Date(hoy.getFullYear(), 9, 15),
        timeText: '08:00 - 17:00',
        location: 'Centro de Convenciones SENA - Bogotá',
        status: EventStatus.PUBLICADO,
        budgetEstimateCOP: 25000000,
        visibilityStart: new Date(hoy.getTime() - 7 * 24 * 60 * 60 * 1000),
        visibilityEnd: new Date(hoy.getTime() + 90 * 24 * 60 * 60 * 1000),
        businessRoundEnabled: true,
        createdById: creados.ADMIN,
        approvedById: creados.COMITE,
        publishedById: creados.ADMIN
      }
    });

    await prisma.subEvent.createMany({
      data: [
        {
          eventId: evento.id,
          name: 'Rueda Agroindustria',
          description: 'Citas 1 a 1 entre proveedores agro y compradores.',
          date: new Date(hoy.getFullYear(), 9, 15),
          startTime: new Date(hoy.getFullYear(), 9, 15, 8, 0),
          endTime: new Date(hoy.getFullYear(), 9, 15, 12, 0),
          modality: Modality.PRESENCIAL,
          location: 'Pabellón A',
          capacity: 100,
          registrationDeadline: new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000)
        },
        {
          eventId: evento.id,
          name: 'Rueda Tecnología',
          description: 'Citas 1 a 1 entre proveedores de tecnología y compradores.',
          date: new Date(hoy.getFullYear(), 9, 15),
          startTime: new Date(hoy.getFullYear(), 9, 15, 14, 0),
          endTime: new Date(hoy.getFullYear(), 9, 15, 17, 0),
          modality: Modality.PRESENCIAL,
          location: 'Pabellón B',
          capacity: 80,
          registrationDeadline: new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000)
        }
      ]
    });

    await prisma.operatorAssignment.create({
      data: { operatorId: creados.OPERADOR, eventId: evento.id }
    });
  }

  const borrador = await prisma.event.findFirst({ where: { name: { contains: 'Economía Verde' } } });
  if (!borrador) {
    const hoy = new Date();
    await prisma.event.create({
      data: {
        name: 'Convocatoria Abierta: Economía Verde y Sostenibilidad',
        description:
          'Presentación de bases de postulación para capital semilla de proyectos de innovación ambiental e impacto social regional.',
        categoryId: catMap['convocatoria'],
        modality: Modality.HIBRIDO,
        date: new Date(hoy.getFullYear(), 9, 22),
        timeText: '10:00 - 12:30',
        location: 'Auditorio Central Paloquemao / Teams',
        status: EventStatus.BORRADOR,
        budgetEstimateCOP: 8000000,
        createdById: creados.ADMIN
      }
    });
  }

  const proveedor = await prisma.providerProfile.upsert({
    where: { userId: creados.PROVEEDOR },
    update: {},
    create: {
      userId: creados.PROVEEDOR,
      ventureName: 'Emprendimientos Verdes SENA',
      economicSector: 'Agroindustria',
      description: 'Productos orgánicos y soluciones de economía circular.',
      socialLinks: ['https://instagram.com/emprendeverde']
    }
  });
  void proveedor;

  const comprador = await prisma.buyerProfile.upsert({
    where: { userId: creados.COMPRADOR },
    update: {},
    create: {
      userId: creados.COMPRADOR,
      nit: '900123456',
      companyName: 'Distribuidora Nacional SAS',
      economicSector: 'Comercio mayorista'
    }
  });
  void comprador;

  console.log('Datos sembrados correctamente.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
