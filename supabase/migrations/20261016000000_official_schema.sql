-- ============================================================================
-- SISTEMA DE GESTIÓN DE EVENTOS & RUEDAS DE NEGOCIOS - FONDO EMPRENDER (SENA)
-- MIGRACIÓN OFICIAL DE TABLAS PARA SUPABASE (POSTGRESQL)
-- Equipo: GAES-1
-- ============================================================================
-- Este archivo recrea las 14 tablas del modelo oficial definido en Prisma,
-- enlazado nativamente a Supabase Auth (auth.users), Supabase Storage y RLS.
-- ============================================================================

-- Habilitar extensión criptográfica para generación de UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 1. TIPOS ENUMERADOS (ENUMS)
-- ============================================================================

DO $$ BEGIN
    CREATE TYPE "Role" AS ENUM ('ADMIN', 'COMITE', 'OPERADOR', 'COMPRADOR', 'PROVEEDOR', 'ASISTENTE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AccountStatus" AS ENUM ('ACTIVO', 'SUSPENDIDO', 'ELIMINADO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "EventStatus" AS ENUM ('BORRADOR', 'APROBADO', 'PUBLICADO', 'CANCELADO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "Modality" AS ENUM ('PRESENCIAL', 'VIRTUAL', 'HIBRIDO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "RegistrationStatus" AS ENUM ('INSCRITO', 'LISTA_ESPERA', 'ASISTIO', 'CANCELADO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AppointmentStatus" AS ENUM ('SOLICITUD', 'CONFIRMADA', 'RECHAZADA', 'CANCELADA');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "EmailStatus" AS ENUM ('PENDIENTE', 'ENVIADO', 'FALLIDO');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 2. TABLAS OFICIALES (14 MODELOS)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABLA 1: User (Perfil local vinculado a Supabase Auth auth.users)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "User" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "authId" UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,
    "documentNumber" TEXT NOT NULL UNIQUE,
    "documentType" TEXT NOT NULL DEFAULT 'CC',
    "email" TEXT NOT NULL UNIQUE,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT,
    "birthDate" TIMESTAMPTZ,
    "dataPolicyAcceptedAt" TIMESTAMPTZ,
    "emailVerifiedAt" TIMESTAMPTZ,
    "failedLoginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMPTZ,
    "lastLoginAt" TIMESTAMPTZ,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "activeRole" "Role" NOT NULL DEFAULT 'ASISTENTE',
    "status" "AccountStatus" NOT NULL DEFAULT 'ACTIVO',
    "anonymizedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- TABLA 2: UserRole (Matriz de roles múltiples por usuario)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "UserRole" (
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "role" "Role" NOT NULL,
    PRIMARY KEY ("userId", "role")
);

-- ----------------------------------------------------------------------------
-- TABLA 3: AccessLog (Auditoría de inicios de sesión e IP)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "AccessLog" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "ip" TEXT NOT NULL,
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- TABLA 4: Category (Categorías temáticas de eventos)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Category" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL UNIQUE,
    "slug" TEXT NOT NULL UNIQUE
);

-- ----------------------------------------------------------------------------
-- TABLA 5: Event (Evento principal institucional y ciclo de vida)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Event" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL REFERENCES "Category"("id") ON DELETE RESTRICT,
    "modality" "Modality" NOT NULL,
    "date" TIMESTAMPTZ NOT NULL,
    "timeText" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'BORRADOR',
    "budgetEstimateCOP" INTEGER,
    "visibilityStart" TIMESTAMPTZ,
    "visibilityEnd" TIMESTAMPTZ,
    "cancellationReason" TEXT,
    "reviewComment" TEXT,
    "businessRoundEnabled" BOOLEAN NOT NULL DEFAULT false,
    "appointmentDurationMin" INTEGER NOT NULL DEFAULT 30,
    "maxAppointmentsPerDay" INTEGER NOT NULL DEFAULT 5,
    "coverImageUrl" TEXT,
    "createdById" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
    "approvedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
    "publishedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
    "cancelledById" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- TABLA 6: SubEvent (Jornadas o talleres con aforo y fecha límite)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "SubEvent" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "eventId" TEXT NOT NULL REFERENCES "Event"("id") ON DELETE CASCADE,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "date" TIMESTAMPTZ NOT NULL,
    "startTime" TIMESTAMPTZ NOT NULL,
    "endTime" TIMESTAMPTZ NOT NULL,
    "modality" "Modality" NOT NULL,
    "location" TEXT,
    "capacity" INTEGER NOT NULL,
    "registrationDeadline" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- TABLA 7: Registration (Inscripciones, asignación QR y check-in en puerta)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Registration" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT REFERENCES "User"("id") ON DELETE CASCADE,
    "subEventId" TEXT NOT NULL REFERENCES "SubEvent"("id") ON DELETE CASCADE,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'INSCRITO',
    "qrCode" TEXT NOT NULL UNIQUE,
    "isGuest" BOOLEAN NOT NULL DEFAULT false,
    "guestName" TEXT,
    "guestDocument" TEXT,
    "waitlistPos" INTEGER,
    "checkedInAt" TIMESTAMPTZ,
    "checkedInById" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
    "cancelReason" TEXT,
    "reminder24SentAt" TIMESTAMPTZ,
    "reminder1hSentAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "Registration_user_subevent_unique" UNIQUE ("userId", "subEventId")
);

-- ----------------------------------------------------------------------------
-- TABLA 8: OperatorAssignment (Operadores asignados para escaneo)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "OperatorAssignment" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "operatorId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "eventId" TEXT NOT NULL REFERENCES "Event"("id") ON DELETE CASCADE,
    "subEventId" TEXT REFERENCES "SubEvent"("id") ON DELETE CASCADE,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "OperatorAssignment_unique" UNIQUE ("operatorId", "eventId", "subEventId")
);

-- ----------------------------------------------------------------------------
-- TABLA 9: BuyerProfile (Perfil de Compradores e Inversionistas)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "BuyerProfile" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE,
    "nit" TEXT NOT NULL UNIQUE,
    "companyName" TEXT NOT NULL,
    "economicSector" TEXT NOT NULL,
    "website" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- TABLA 10: ProviderProfile (Perfil de Emprendedores SENA con portafolio)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ProviderProfile" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL UNIQUE REFERENCES "User"("id") ON DELETE CASCADE,
    "ventureName" TEXT NOT NULL,
    "economicSector" TEXT NOT NULL,
    "description" TEXT,
    "portfolioPdfUrl" TEXT,
    "socialLinks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- TABLA 11: Appointment (Citas 1 a 1 de Ruedas de Negocios)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "Appointment" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "eventId" TEXT NOT NULL REFERENCES "Event"("id") ON DELETE CASCADE,
    "buyerId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "providerId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "startAt" TIMESTAMPTZ NOT NULL,
    "endAt" TIMESTAMPTZ NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'SOLICITUD',
    "tableNumber" TEXT,
    "meetingUrl" TEXT,
    "rating" INTEGER CHECK (rating >= 1 AND rating <= 5),
    "comment" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- TABLA 12: EmailOutbox (Bandeja de salida de correos transaccionales)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "EmailOutbox" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'PENDIENTE',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "nextAttemptAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "sentAt" TIMESTAMPTZ,
    "createdById" TEXT REFERENCES "User"("id") ON DELETE SET NULL
);

-- ----------------------------------------------------------------------------
-- TABLA 13: AuditLog (Trazabilidad y auditoría de acciones sensibles)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "detail" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- TABLA 14: ReportExport (Control y almacenamiento de exportación de reportes)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "ReportExport" (
    "id" TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
    "type" TEXT NOT NULL,
    "filters" JSONB,
    "filePath" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 3. ÍNDICES DE RENDIMIENTO
-- ============================================================================

CREATE INDEX IF NOT EXISTS "AccessLog_userId_createdAt_idx" ON "AccessLog"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "Event_status_visibility_idx" ON "Event"("status", "visibilityStart", "visibilityEnd");
CREATE INDEX IF NOT EXISTS "Event_date_idx" ON "Event"("date");
CREATE INDEX IF NOT EXISTS "SubEvent_eventId_date_idx" ON "SubEvent"("eventId", "date");
CREATE INDEX IF NOT EXISTS "Registration_subEventId_status_idx" ON "Registration"("subEventId", "status");
CREATE INDEX IF NOT EXISTS "Registration_qrCode_idx" ON "Registration"("qrCode");
CREATE INDEX IF NOT EXISTS "Appointment_eventId_startAt_idx" ON "Appointment"("eventId", "startAt");
CREATE INDEX IF NOT EXISTS "Appointment_buyerId_startAt_idx" ON "Appointment"("buyerId", "startAt");
CREATE INDEX IF NOT EXISTS "Appointment_providerId_startAt_idx" ON "Appointment"("providerId", "startAt");
CREATE INDEX IF NOT EXISTS "EmailOutbox_status_nextAttemptAt_idx" ON "EmailOutbox"("status", "nextAttemptAt");
CREATE INDEX IF NOT EXISTS "AuditLog_entity_entityId_idx" ON "AuditLog"("entity", "entityId");
CREATE INDEX IF NOT EXISTS "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "ReportExport_userId_createdAt_idx" ON "ReportExport"("userId", "createdAt");

-- ============================================================================
-- 4. BUCKETS DE ALMACENAMIENTO DE SUPABASE STORAGE
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('portadas', 'portadas', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp']),
  ('portfolios', 'portfolios', false, 10485760, ARRAY['application/pdf'])
ON CONFLICT (id) DO NOTHING;

-- Políticas de Supabase Storage para portadas públicas
DO $$ BEGIN
    CREATE POLICY "Portadas publicas legibles por todos"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'portadas');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 5. TRIGGER DE ACTUALIZACIÓN AUTOMÁTICA (updatedAt)
-- ============================================================================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
    CREATE TRIGGER tr_user_updated_at BEFORE UPDATE ON "User" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TRIGGER tr_event_updated_at BEFORE UPDATE ON "Event" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TRIGGER tr_subevent_updated_at BEFORE UPDATE ON "SubEvent" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TRIGGER tr_registration_updated_at BEFORE UPDATE ON "Registration" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TRIGGER tr_buyer_updated_at BEFORE UPDATE ON "BuyerProfile" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TRIGGER tr_provider_updated_at BEFORE UPDATE ON "ProviderProfile" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TRIGGER tr_appointment_updated_at BEFORE UPDATE ON "Appointment" FOR EACH ROW EXECUTE FUNCTION set_updated_at();
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================================
-- 6. TRIGGER DE SINCRONIZACIÓN AUTOMÁTICA CON SUPABASE AUTH (auth.users)
-- ============================================================================
-- Cuando un usuario se crea en auth.users, sincroniza automáticamente su
-- perfil en la tabla User pública si se envían metadatos.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public."User" (
        "authId",
        "email",
        "documentNumber",
        "documentType",
        "firstName",
        "lastName",
        "activeRole",
        "emailVerifiedAt"
    )
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'document_number', 'PENDIENTE-' || substr(NEW.id::text, 1, 8)),
        COALESCE(NEW.raw_user_meta_data->>'document_type', 'CC'),
        COALESCE(NEW.raw_user_meta_data->>'first_name', split_part(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), ' ', 1)),
        COALESCE(NEW.raw_user_meta_data->>'last_name', 'SENA'),
        'ASISTENTE'::public."Role",
        CASE WHEN NEW.email_confirmed_at IS NOT NULL THEN NEW.email_confirmed_at ELSE NULL END
    )
    ON CONFLICT ("email") DO UPDATE SET 
        "authId" = EXCLUDED."authId",
        "emailVerifiedAt" = COALESCE("User"."emailVerifiedAt", EXCLUDED."emailVerifiedAt");

    RETURN NEW;
END;
$$;

DO $$ BEGIN
    CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============================================================================
-- 7. ROW LEVEL SECURITY (RLS) - SEGURIDAD BASE
-- ============================================================================

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "UserRole" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AccessLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Event" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "SubEvent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Registration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "OperatorAssignment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "BuyerProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ProviderProfile" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Appointment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailOutbox" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AuditLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ReportExport" ENABLE ROW LEVEL SECURITY;

-- Acceso público de lectura a eventos publicados y categorías
DO $$ BEGIN
    CREATE POLICY "Categorias visibles para todos" ON "Category" FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Eventos publicados visibles para todos" ON "Event" FOR SELECT USING (status = 'PUBLICADO');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "SubEventos de eventos publicados visibles" ON "SubEvent" FOR SELECT USING (
        EXISTS (SELECT 1 FROM "Event" WHERE "Event"."id" = "SubEvent"."eventId" AND "Event"."status" = 'PUBLICADO')
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Políticas de usuario autenticado
DO $$ BEGIN
    CREATE POLICY "Usuarios pueden ver su propio perfil" ON "User" FOR SELECT USING (auth.uid() = "authId");
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE POLICY "Usuarios pueden ver sus inscripciones" ON "Registration" FOR SELECT USING (
        EXISTS (SELECT 1 FROM "User" WHERE "User"."id" = "Registration"."userId" AND "User"."authId" = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- El backend con SERVICE_ROLE_KEY tiene bypass total automático en Supabase.
