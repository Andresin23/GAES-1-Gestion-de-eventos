-- ============================================================================
-- SISTEMA DE GESTIÓN DE EVENTOS & RUEDAS DE NEGOCIOS - FONDO EMPRENDER (SENA)
-- DATOS SEMILLA (SEED DATA) PARA SUPABASE
-- Equipo: GAES-1
-- ============================================================================

-- 1. CATEGORÍAS INSTITUCIONALES
INSERT INTO "Category" ("id", "name", "slug")
VALUES
  ('cat-1', 'Economía Circular', 'economia-circular'),
  ('cat-2', 'Tecnología y Agro', 'tecnologia-y-agro'),
  ('cat-3', 'Rueda de Negocios', 'rueda-de-negocios'),
  ('cat-4', 'Convocatoria', 'convocatoria'),
  ('cat-5', 'Taller', 'taller'),
  ('cat-6', 'Conferencia', 'conferencia')
ON CONFLICT ("slug") DO NOTHING;

-- 2. USUARIO ADMINISTRADOR SEMILLA (Perfil base)
INSERT INTO "User" (
  "id",
  "documentNumber",
  "documentType",
  "email",
  "firstName",
  "lastName",
  "activeRole",
  "status",
  "emailVerifiedAt",
  "dataPolicyAcceptedAt"
)
VALUES (
  'usr-admin-01',
  '1000000001',
  'CC',
  'admin@eventos.sena.edu.co',
  'Ana',
  'Administradora',
  'ADMIN',
  'ACTIVO',
  NOW(),
  NOW()
)
ON CONFLICT ("documentNumber") DO NOTHING;

INSERT INTO "UserRole" ("userId", "role")
VALUES ('usr-admin-01', 'ADMIN')
ON CONFLICT ("userId", "role") DO NOTHING;

-- 3. USUARIO COMITÉ EVALUADOR
INSERT INTO "User" (
  "id",
  "documentNumber",
  "documentType",
  "email",
  "firstName",
  "lastName",
  "activeRole",
  "status",
  "emailVerifiedAt",
  "dataPolicyAcceptedAt"
)
VALUES (
  'usr-comite-01',
  '1000000002',
  'CC',
  'comite@eventos.sena.edu.co',
  'Carlos',
  'Comité Directivo',
  'COMITE',
  'ACTIVO',
  NOW(),
  NOW()
)
ON CONFLICT ("documentNumber") DO NOTHING;

INSERT INTO "UserRole" ("userId", "role")
VALUES ('usr-comite-01', 'COMITE')
ON CONFLICT ("userId", "role") DO NOTHING;

-- 4. USUARIO OPERADOR LOGÍSTICO (PUERTA)
INSERT INTO "User" (
  "id",
  "documentNumber",
  "documentType",
  "email",
  "firstName",
  "lastName",
  "activeRole",
  "status",
  "emailVerifiedAt",
  "dataPolicyAcceptedAt"
)
VALUES (
  'usr-operador-01',
  '1000000003',
  'CC',
  'operador@eventos.sena.edu.co',
  'Diana',
  'Operadora Logística',
  'OPERADOR',
  'ACTIVO',
  NOW(),
  NOW()
)
ON CONFLICT ("documentNumber") DO NOTHING;

INSERT INTO "UserRole" ("userId", "role")
VALUES ('usr-operador-01', 'OPERADOR')
ON CONFLICT ("userId", "role") DO NOTHING;

-- 5. USUARIO PROVEEDOR (EMPRENDEDOR SENA)
INSERT INTO "User" (
  "id",
  "documentNumber",
  "documentType",
  "email",
  "firstName",
  "lastName",
  "activeRole",
  "status",
  "emailVerifiedAt",
  "dataPolicyAcceptedAt"
)
VALUES (
  'usr-proveedor-01',
  '1098765432',
  'CC',
  'proveedor@soy.sena.edu.co',
  'Luis',
  'Emprendedor',
  'PROVEEDOR',
  'ACTIVO',
  NOW(),
  NOW()
)
ON CONFLICT ("documentNumber") DO NOTHING;

INSERT INTO "UserRole" ("userId", "role")
VALUES ('usr-proveedor-01', 'PROVEEDOR')
ON CONFLICT ("userId", "role") DO NOTHING;

INSERT INTO "ProviderProfile" ("id", "userId", "ventureName", "economicSector", "description", "socialLinks")
VALUES (
  'prov-01',
  'usr-proveedor-01',
  'Emprendimientos Verdes SENA',
  'Agroindustria',
  'Transformación de residuos orgánicos en biofertilizantes y empaques compostables.',
  ARRAY['https://instagram.com/emprendeverdesena']
)
ON CONFLICT ("userId") DO NOTHING;

-- 6. USUARIO COMPRADOR
INSERT INTO "User" (
  "id",
  "documentNumber",
  "documentType",
  "email",
  "firstName",
  "lastName",
  "activeRole",
  "status",
  "emailVerifiedAt",
  "dataPolicyAcceptedAt"
)
VALUES (
  'usr-comprador-01',
  '900123456',
  'NIT',
  'comprador@empresa.com',
  'Empresas Compradoras',
  'SAS',
  'COMPRADOR',
  'ACTIVO',
  NOW(),
  NOW()
)
ON CONFLICT ("documentNumber") DO NOTHING;

INSERT INTO "UserRole" ("userId", "role")
VALUES ('usr-comprador-01', 'COMPRADOR')
ON CONFLICT ("userId", "role") DO NOTHING;

INSERT INTO "BuyerProfile" ("id", "userId", "nit", "companyName", "economicSector", "website")
VALUES (
  'buy-01',
  'usr-comprador-01',
  '900123456',
  'Distribuidora Mayorista Nacional SAS',
  'Comercio y Distribución',
  'https://distribuidoranacional.com'
)
ON CONFLICT ("userId") DO NOTHING;

-- 7. EVENTO OFICIAL PUBLICADO
INSERT INTO "Event" (
  "id",
  "name",
  "description",
  "categoryId",
  "modality",
  "date",
  "timeText",
  "location",
  "status",
  "budgetEstimateCOP",
  "visibilityStart",
  "visibilityEnd",
  "businessRoundEnabled",
  "createdById",
  "approvedById",
  "publishedById"
)
VALUES (
  'ev-01',
  'Macrorrueda de Negocios Fondo Emprender 2026',
  'Espacio de emparejamiento comercial entre emprendedores SENA y compradores nacionales del sector agroindustrial y tecnológico.',
  'cat-3',
  'PRESENCIAL',
  NOW() + INTERVAL '30 days',
  '08:00 - 17:00',
  'Centro de Convenciones SENA - Bogotá',
  'PUBLICADO',
  25000000,
  NOW() - INTERVAL '7 days',
  NOW() + INTERVAL '90 days',
  true,
  'usr-admin-01',
  'usr-comite-01',
  'usr-admin-01'
)
ON CONFLICT ("id") DO NOTHING;

-- 8. SUB-EVENTOS CON AFORO
INSERT INTO "SubEvent" (
  "id",
  "eventId",
  "name",
  "description",
  "date",
  "startTime",
  "endTime",
  "modality",
  "location",
  "capacity",
  "registrationDeadline"
)
VALUES 
  (
    'sub-01',
    'ev-01',
    'Rueda Agroindustria y Sostenibilidad',
    'Citas 1 a 1 entre proveedores agro y compradores.',
    NOW() + INTERVAL '30 days',
    NOW() + INTERVAL '30 days 8 hours',
    NOW() + INTERVAL '30 days 12 hours',
    'PRESENCIAL',
    'Pabellón A',
    100,
    NOW() + INTERVAL '28 days'
  ),
  (
    'sub-02',
    'ev-01',
    'Rueda Tecnología y Servicios Digitales',
    'Citas 1 a 1 entre emprendimientos tech y empresas compradoras.',
    NOW() + INTERVAL '30 days',
    NOW() + INTERVAL '30 days 14 hours',
    NOW() + INTERVAL '30 days 17 hours',
    'PRESENCIAL',
    'Pabellón B',
    80,
    NOW() + INTERVAL '28 days'
  )
ON CONFLICT ("id") DO NOTHING;

-- 9. ASIGNACIÓN DE OPERADOR
INSERT INTO "OperatorAssignment" ("id", "operatorId", "eventId", "subEventId")
VALUES ('op-assign-01', 'usr-operador-01', 'ev-01', 'sub-01')
ON CONFLICT ("operatorId", "eventId", "subEventId") DO NOTHING;
