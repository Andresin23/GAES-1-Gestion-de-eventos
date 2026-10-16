# 🗄️ Guía de Despliegue en Supabase (Base de Datos Oficial)

Esta carpeta contiene la definición oficial en **SQL nativo** para desplegar las **14 tablas relacionales**, tipos enumerados, índices de alto rendimiento, triggers y políticas de seguridad (RLS) del Sistema de Gestión de Eventos del Fondo Emprender del SENA (GAES-1).

---

## 📁 Contenido del Directorio

* [`migrations/20261016000000_official_schema.sql`](migrations/20261016000000_official_schema.sql): Script maestro DDL. Crea las 14 tablas, tipos ENUM, claves foráneas, triggers de sincronización con `auth.users`, buckets de almacenamiento en `storage.buckets` y políticas RLS.
* [`seed.sql`](seed.sql): Datos iniciales institucionales (6 categorías del Fondo Emprender, usuarios base por rol, evento publicado con sub-eventos de aforo y perfiles empresariales).

---

## 🚀 Cómo Desplegar en Supabase (2 Opciones)

### Opción A: Desde el Panel Web de Supabase (Más Rápido, Sin Terminal)

1. Ingresa a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard).
2. En el menú lateral izquierdo, haz clic en **SQL Editor**.
3. Haz clic en **New query** (Nueva consulta).
4. Abre el archivo [`migrations/20261016000000_official_schema.sql`](migrations/20261016000000_official_schema.sql), copia todo su contenido y pégalo en el editor.
5. Haz clic en el botón verde **Run** (Ejecutar). Verás el mensaje `Success. No rows returned`.
6. Crea otra consulta nueva, copia el contenido de [`seed.sql`](seed.sql) y haz clic en **Run**.
7. ¡Listo! Ve al menú **Table Editor** y verás las 14 tablas creadas y pobladas con los datos institucionales.

---

### Opción B: Usando Supabase CLI (Desarrollo Profesional)

Si utilizas la CLI de Supabase en tu máquina local:

```bash
# Iniciar sesión en Supabase CLI
npx supabase login

# Enlazar este repositorio con tu proyecto en la nube
npx supabase link --project-ref TU_PROJECT_REF

# Aplicar las migraciones hacia la base de datos de producción
npx supabase db push

# (Opcional) Ejecutar el seed data
npx supabase db execute --file supabase/seed.sql
```

---

## 🔒 Relación con Supabase Auth y Storage

* **Usuarios:** La tabla pública `"User"` se vincula a la tabla privada `auth.users` mediante la columna `"authId"` (UUID). El trigger `on_auth_user_created` sincroniza automáticamente los usuarios creados en Supabase Auth con la tabla `"User"`.
* **Almacenamiento (Storage):** El script crea automáticamente dos buckets:
  * `portadas` (Público): Para imágenes de presentación de los eventos (máx 5 MB).
  * `portfolios` (Privado): Para portafolios en PDF de los emprendedores SENA (máx 10 MB).
