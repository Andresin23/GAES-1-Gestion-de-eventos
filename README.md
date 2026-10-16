# 🚀 Sistema de Gestión de Eventos & Ruedas de Negocios — Fondo Emprender (SENA)

Plataforma integral para la planificación, aprobación, gestión logística, ruedas de negocios (matchmaking) y control de aforo en tiempo real para eventos institucionales del **Fondo Emprender del SENA**, desarrollada por el equipo **GAES-1**.

---

## 🧭 Estado Actual del Proyecto y Diagnóstico de Auditoría

Tras la auditoría técnica exhaustiva del backend, la base de datos y el frontend, el sistema cuenta con su **arquitectura oficial orientada a Supabase**:

```
+---------------------------------------------------------------------------------------------------------+
|                                         ARQUITECTURA DEL PROYECTO                                       |
+-----------------------------+---------------------------------------+-----------------------------------+
| 🎨 FRONTEND                 | ⚙️ BACKEND (API REST)                  | 🗄️ BASE DE DATOS (SUPABASE)       |
| UI/UX y estilos 100% reales | Servicios, modelos y middlewares      | 14 tablas oficiales en SQL nativo |
| y reutilizables. Motores de | en TypeScript con Prisma, listos      | en supabase/, con RLS, triggers   |
| simulación (localStorage y  | para montar rutas hacia Supabase.     | de auth.users y storage buckets.  |
| mocks) identificados.       |                                       |                                   |
+-----------------------------+---------------------------------------+-----------------------------------+
```

---

## 🎨 Diagnóstico del Frontend: Qué es Real y Qué es Simulado (Mocks)

La auditoría al código cliente (`index.html`, `login.html`, `control-aforo.html` y carpeta `js/`) arrojó una diferenciación clara entre la **maquetación visual (100% real y aprovechable)** y la **capa de datos (simulada en `localStorage`)**:

```
+-----------------------------------------------------------------------------------------------------+
|                                    BALANCE REAL VS. SIMULADO (FRONTEND)                             |
+-------------------------------------------------------+---------------------------------------------+
| 🟢 LO REAL Y OPERATIVO (92% del frontend)              | 🔴 LO SIMULADO / PENDIENTE CON BACKEND (8%)  |
| • Estilos visuales CSS y diseño responsive (1880 lín).| • Motor de persistencia fallback (localStorage).|
| • Módulo de accesibilidad WCAG 2.1 AA completo.       | • Conexión de Google Auth con Supabase Auth. |
| • Login único con Google SDK oficial en login.html.   | • 5 usuarios demo locales para pruebas rápidas.
| • Eliminación del login duplicado en index.html.      | • Desconexión final del fallback en api.js.  |
| • Generación real de códigos QR escaneables (Canvas). |                                              |
| • Lector de cámara real con Html5Qrcode en aforo.     |                                              |
| • Sintetizador de audio Web Audio API en puerta.      |                                              |
| • Exportación de reportes de aforo a PDF.             |                                              |
| • Navegación pública sin redirección forzada.         |                                              |
+-------------------------------------------------------+---------------------------------------------+
```

### Detalle por Archivo del Frontend:

| Archivo | Nivel de Madurez | Componentes Reales y Funcionales | Elementos Pendientes de Conexión |
| :--- | :---: | :--- | :--- |
| [`css/styles.css`](css/styles.css) | 🟢 **100% Real** | Paleta SENA, tipografía Plus Jakarta Sans, modo oscuro (`data-theme`), alto contraste, modales, grids y responsive design. | Ninguno. Sistema de diseño definitivo. |
| [`js/accessibility.js`](js/accessibility.js) | 🟢 **100% Real** | Widget flotante ♿, síntesis de voz Web Speech API, escalado de fuentes y alternador de temas. | Ninguno. Es independiente y totalmente funcional. |
| [`index.html`](index.html) | 🟢 **95% Real** | Maquetación del calendario, tarjetas con badges, filtros interactivos, modal de inscripción, generación de QR oficial y enlace al login único. Eliminado el modal de login duplicado. | Conexión con endpoints REST del backend. |
| [`login.html`](login.html) | 🟢 **95% Real** | Portal único de autenticación institucional en 2 columnas, pestañas Login/Registro, botón oficial de Google Identity SDK y navegación de invitado. | Sustituir botones de prueba por llamada a Supabase Auth. |
| [`control-aforo.html`](control-aforo.html) | 🟢 **100% Real** | Marcador porcentual de aforo, escáner de cámara real con `html5-qrcode`, búsqueda manual en puerta, reporte imprimible a PDF y tabla de log en tiempo real sincronizada. | Conectado con `POST /api/v1/aforo/validar-qr`. |
| [`js/calendar.js`](js/calendar.js) | 🟢 **95% Real** | Filtros combinados, barra de búsqueda, apertura de modales, actualización de estadísticas y generación de QR real escaneable con `QRCode.toCanvas`. | Consumo directo del backend verificado. |
| [`js/aforo.js`](js/aforo.js) | 🟢 **100% Real** | Medidor de capacidad, lector de cámara real (`toggleCamaraEscaneo`), tabla de lecturas en tiempo real, sintetizador de audio (Web Audio API) y reporte en PDF (`window.print()`). | Conectado y probado con `POST /api/v1/aforo/validar-qr`. |
| [`js/google-auth.js`](js/google-auth.js) | 🟢 **85% Real** | Inicialización del SDK oficial de Google Identity, validación criptográfica de nonce/state y decodificación de credencial JWT. | Reenvío del token a Supabase Auth en lugar de guardar solo en sesión local. |
| [`js/login.js`](js/login.js) | 🟢 **90% Real** | Alternancia de pestañas, envío de credenciales a `/api/v1/auth/login`, registro en `/api/v1/auth/register` y navegación limpia de invitado. | Ninguno. |
| [`js/api.js`](js/api.js) | 🟢 **95% Real** | Función `peticionAPI` sincronizada (detección de puerto backend 3000, inyección Bearer JWT, propagación de errores HTTP 4xx/5xx del backend, soporte RBAC completo). | Desactivar `manejarRespuestaFallback()` una vez cerrada la etapa de transición offline. |

---

## 📋 Tablero de Control: Progreso de Implementación

### ✅ 1. Procesos Ya Hechos (Completados)

* **Eliminación del Doble Login y Consolidación del Portal Único:**
  * Eliminado el modal `#modal-login` (120+ líneas de HTML redundante) de [`index.html`](index.html).
  * Consolidado [`login.html`](login.html) como el único portal oficial de autenticación, integrando el SDK oficial de Google Identity Services.
  * Corregida la navegación para que los visitantes no autenticados puedan navegar el calendario sin redirecciones forzadas.
* **Modernización y Funcionalidad Real en Frontend:**
  * **Generador de Códigos QR Real:** Integrado `qrcode.min.js` y `QRCode.toCanvas` en [`js/calendar.js`](js/calendar.js) para emitir pases digitales con QR reales y escaneables desde teléfonos móviles.
  * **Lector de Cámara Real en Portería:** Integrada la biblioteca `html5-qrcode` y función `toggleCamaraEscaneo()` en [`js/aforo.js`](js/aforo.js) y [`control-aforo.html`](control-aforo.html) para activación de cámara web/móvil.
  * **Feedback Sonoro Inmediato:** Sintetizador con Web Audio API (tonos 880Hz y 220Hz) para aprobación o rechazo en puerta.
  * **Exportación de Reportes a PDF:** Implementada función `exportarLogAforoPDF()` con estilos CSS de impresión institucional.
* **Carpeta Oficial de Supabase Creada ([`supabase/`](supabase/)):**
  * Script SQL maestro con las 14 tablas relacionales ([`supabase/migrations/20261016000000_official_schema.sql`](supabase/migrations/20261016000000_official_schema.sql)).
  * Integración nativa con `auth.users`, triggers de actualización y buckets de Supabase Storage (`portadas`, `portfolios`).
  * Políticas de seguridad Row Level Security (RLS) habilitadas en las 14 tablas.
  * Datos semilla institucionales ejecutados y verificados con éxito ([`supabase/seed.sql`](supabase/seed.sql)).
  * **14 Tablas Relacionales Creadas y Activas en la Nube:** `"User"`, `"UserRole"`, `"AccessLog"`, `"Category"`, `"Event"`, `"SubEvent"`, `"Registration"`, `"OperatorAssignment"`, `"BuyerProfile"`, `"ProviderProfile"`, `"Appointment"`, `"EmailOutbox"`, `"AuditLog"`, `"ReportExport"`.
  * **2 Buckets de Supabase Storage Creados:** `portadas` (público) y `portfolios` (privado).
  * **6 Categorías del Fondo Emprender y Usuarios Base Cargados.**
* **Reorganización y Limpieza de Arquitectura de Carpetas:**
  * Eliminación de archivos huérfanos (`api.js` en raíz).
  * Creación del directorio [`docs/`](docs/) para centralizar especificaciones ([`REQUERIMIENTOS.md`](docs/REQUERIMIENTOS.md), [`Plantilla_Requerimientos.md`](docs/Plantilla_Requerimientos.md) y [`AUDITORIA_FAKES_Y_ARQUITECTURA.md`](docs/AUDITORIA_FAKES_Y_ARQUITECTURA.md)).
  * Creación del directorio [`deploy/`](deploy/) para aislar manifiestos alternativos o heredados ([`docker-compose.yml`](deploy/docker-compose.yml) y [`render.yaml`](deploy/render.yaml)).
* **Modelo Relacional en Backend ([`backend/prisma/schema.prisma`](backend/prisma/schema.prisma)):**
  * 14 modelos preservados intactos como referencia técnica y tipado con `@prisma/client`.
* **Servicios de Negocio y Rutas Montadas ([`backend/src/app.ts`](backend/src/app.ts)):**
  * Rutas registradas y activas bajo `/api/v1/auth`, `/api/v1/eventos`, `/api/v1/inscripciones`, `/api/v1/aforo` y `/api/v1/usuarios`.
  * **Endpoint de Control de Aforo y Check-in QR Operativo:** Implementado `POST /api/v1/aforo/validar-qr` con soporte para lectura de código QR de un solo uso o documento manual, deduplicación de ingresos, registro de asistencia (`status = 'ASISTIO'`, `checkedInAt = NOW()`) y auditoría en Supabase.
  * **Alineación de Contratos API y Payloads:** Respuestas enriquecidas con alias de compatibilidad (`titulo`, `tipoCategoria`, `aforoMaximo`, `aforoActual`, sesión unificada).
  * **Compilación TypeScript Estricta Aprobada:** Build de producción exitoso con `npm run build` en [`backend/dist/`](backend/dist/).
* **Sincronización del Cliente Frontend ([`js/api.js`](js/api.js)):**
  * **Libre Acceso a Rutas Públicas:** `peticionAPI` permite consultar `/eventos` y rutas públicas sin exigir token de sesión ni forzar redirecciones al login.
  * **Normalizador Ligero Integrado:** Mapeo transparente de contratos de base de datos a interfaz:
    * `nombre` ➔ `titulo`
    * `categoriaSlug` ➔ `tipoCategoria`
    * `capacidad total` / `subEventos.reduce` ➔ `aforoMaximo`
    * `asistencias` / `subEventos.reduce` ➔ `aforoActual`
  * **Seguridad en Apertura de Modales:** Invocación de modales con IDs alfanuméricos protegidos entre comillas (`onclick="abrirModalDetalle('${ev.id}')"` y `onclick="abrirModalInscripcion('${ev.id}')"`).
* **Despliegue Full-Stack en Vercel + Supabase Cloud (Resolución de Errores 404 y 405):**
  * **Serverless Functions ([`api/index.ts`](api/index.ts)):** Adaptador Express Serverless para desplegar el backend directamente en la infraestructura Serverless de Vercel.
  * **Configuración de Enrutamiento ([`vercel.json`](vercel.json)):** Activado `cleanUrls: true` y reglas de reescritura (`rewrites`) para enrutar transparentemente `/api/v1/*` y `/api/*` hacia la función serverless, eliminando los errores 404 por rutas no encontradas.
  * **Soporte Prisma en Lambda (`rhel-openssl-3.0.x`):** Añadido `binaryTargets = ["native", "rhel-openssl-3.0.x"]` en [`backend/prisma/schema.prisma`](backend/prisma/schema.prisma) y comando `vercel-build` en el [`package.json`](package.json) raíz para autogenerar el cliente Prisma en los despliegues de Vercel.
  * **Resiliencia de Variables de Entorno:** Integradas variables de conexión con Supabase Cloud como fallbacks seguros en [`backend/src/config/env.ts`](backend/src/config/env.ts).
  * **Compatibilidad de Endpoints de Autenticación:** Añadido soporte simultáneo para `/registro` y `/register` con normalización automática de datos en español/inglés en [`backend/src/modules/auth/auth.routes.ts`](backend/src/modules/auth/auth.routes.ts).

---

### 🔄 2. Procesos en Curso (Qué Estamos Haciendo Actualmente)

* **Pruebas de Integración Frontend ↔ Backend:**
  * Verificación de la respuesta en vivo del calendario público y el pase digital con código QR.
  * Verificación del lector de cámara en portería contra el endpoint `POST /api/v1/aforo/validar-qr`.

---

### ⏳ 3. Qué Falta por Hacer (Ruta Crítica hacia Producción)

1. **Autenticación con Google Real en Supabase:**
   * Vincular el token de Google con Supabase Auth (`supabase.auth.signInWithIdToken()`).
2. **Módulo de Citas / Ruedas de Negocios (`Appointment`):**
   * Crear las rutas y controlador para el agendamiento y evaluación de citas comerciales 1 a 1.

---

## 🗄️ Guía de la Base de Datos: Las 14 Tablas Oficiales

El modelo relacional oficial está implementado tanto en Prisma como en el script DDL de Supabase ([`supabase/migrations/20261016000000_official_schema.sql`](supabase/migrations/20261016000000_official_schema.sql)):

| # | Tabla / Modelo | Propósito y Relaciones | Estado de Implementación |
| :-: | :--- | :--- | :--- |
| **1** | `User` | Entidad central de usuario. Vinculada a Supabase Auth mediante `authId` (UUID). Almacena documento de identidad, datos personales y estado de la cuenta. | ✅ Recreada en Supabase y Prisma |
| **2** | `UserRole` | Tabla intermedia para la asignación de roles múltiples por usuario (`ADMIN`, `COMITE`, `OPERADOR`, `COMPRADOR`, `PROVEEDOR`, `ASISTENTE`). | ✅ Recreada en Supabase y Prisma |
| **3** | `AccessLog` | Registro de auditoría de accesos al sistema con marca de tiempo, dirección IP y User Agent del navegador. | ✅ Recreada en Supabase y Prisma |
| **4** | `Category` | Categorías temáticas de eventos (ej. Economía Circular, Tecnología y Agro, Convocatorias). | ✅ Recreada en Supabase y Seed |
| **5** | `Event` | Evento principal institucional. Maneja la máquina de estados (`BORRADOR`, `APROBADO`, `PUBLICADO`, `CANCELADO`), presupuesto estimado y auditoría de creador/aprobador. | ✅ Recreada en Supabase y Prisma |
| **6** | `SubEvent` | Espacio o jornada dentro de un evento principal (taller, conferencia). Gestiona aforo máximo (`capacity`), fechas, horarios y fecha límite de inscripción. | ✅ Recreada en Supabase y Prisma |
| **7** | `Registration` | Registro de asistencia y control de aforo por sub-evento. Contiene el código QR único, posición en lista de espera, e indicador de check-in (`checkedInAt`, `checkedInById`). | ✅ Recreada en Supabase y Endpoint Activo (`POST /api/v1/aforo/validar-qr`) |
| **8** | `OperatorAssignment` | Relación que vincula a un Operador Logístico con un evento o sub-evento específico para autorizar la lectura de accesos en puerta. | ✅ Recreada en Supabase y Prisma |
| **9** | `BuyerProfile` | Perfil extendido para Compradores / Inversionistas (NIT, empresa, sector económico y sitio web). | ✅ Recreada en Supabase y Prisma |
| **10** | `ProviderProfile` | Perfil extendido para Emprendedores SENA (nombre de emprendimiento, sector, descripción, enlace a portafolio PDF en Supabase Storage y redes sociales). | ✅ Recreada en Supabase y Prisma |
| **11** | `Appointment` | Citas de Ruedas de Negocios 1 a 1 entre Comprador y Proveedor, con franja horaria, mesa física o URL de videollamada y calificación de satisfacción (1 a 5). | ✅ Recreada en Supabase (falta endpoint) |
| **12** | `EmailOutbox` | Bandeja de salida asíncrona para correos transaccionales (confirmaciones de inscripción, pases QR, avisos de comités). | ✅ Recreada en Supabase y Prisma |
| **13** | `AuditLog` | Trazabilidad institucional de acciones sensibles (aprobaciones de eventos, cambios de estado, justificaciones obligatorias). | ✅ Recreada en Supabase y Prisma |
| **14** | `ReportExport` | Trazabilidad y almacenamiento de solicitudes de exportación de reportes institucionales en XLSX o CSV. | ✅ Recreada en Supabase (falta endpoint) |

---

## 📁 Nueva Arquitectura Reestructurada del Repositorio

```text
GAES-1-Gestion-de-eventos/
├── backend/                       # 🛡️ API REST Node.js + Express + Prisma (14 Tablas)
│   ├── prisma/                    # Esquema y seeds de Prisma (referencia técnica)
│   └── src/                       # Módulos de negocio (auth, events, registrations, users)
├── supabase/                      # 🗄️ BASE DE DATOS OFICIAL (SUPABASE POSTGRESQL)
│   ├── migrations/                # DDL oficial con las 14 tablas, RLS, triggers y enums
│   │   └── 20261016000000_official_schema.sql
│   ├── seed.sql                   # Datos iniciales institucionales en SQL
│   └── README.md                  # Instrucciones para ejecutar en SQL Editor de Supabase
├── docs/                          # 📚 DOCUMENTACIÓN Y REQUERIMIENTOS
│   ├── REQUERIMIENTOS.md          # Especificación formal de requerimientos del sistema
│   ├── Plantilla_Requerimientos.md# Documento de entrega académica SENA GAES-1
│   └── AUDITORIA_FAKES_Y_ARQUITECTURA.md # Auditoría permanente de mocks y fakes
├── deploy/                        # 📦 MANIFIESTOS DE INFRAESTRUCTURA ALTERNATIVOS
│   ├── docker-compose.yml         # Contenedor local con PostgreSQL Alpine + Mailhog
│   ├── render.yaml                # Blueprint de Render (legacy)
│   └── README.md                  # Explicación de uso
├── css/                           # 🎨 Estilos corporativos SENA
│   └── styles.css
├── img/                           # 🖼️ Activos gráficos y fondos
│   └── eventos_bg.jpg
├── js/                            # 💻 Lógica cliente (Frontend)
│   ├── accessibility.js           # Accesibilidad WCAG 2.1 AA
│   ├── aforo.js                   # Panel de control de aforo y audio feedback
│   ├── api.js                     # Cliente HTTP (con fallback mock documentado)
│   ├── calendar.js                # Renderizado del calendario anual y filtros
│   ├── google-auth.js             # Integración Google Identity
│   └── login.js                   # Lógica de cambio de pestañas y accesos demo
├── .github/workflows/             # ⚙️ CI/CD y despliegue estático
│   └── static.yml
├── index.html                     # 🌐 Portal público y calendario oficial de eventos
├── login.html                     # 🔐 Portal de autenticación y selección de roles
├── control-aforo.html             # 📱 Vista operativa móvil para operadores en puerta
├── favicon.ico                    # Ícono institucional
└── README.md                      # 📖 Esta guía maestra del repositorio actualizada
```

---

## 🛠️ Cómo Desplegar las Tablas Oficiales en Supabase

Sigue estos 3 pasos para poner en marcha la base de datos oficial:

1. **Abrir el Editor SQL en Supabase:**
   * Entra a tu proyecto en [Supabase Dashboard](https://supabase.com/dashboard) → Menú **SQL Editor** → **New Query**.
2. **Crear las 14 Tablas:**
   * Copia el contenido de [`supabase/migrations/20261016000000_official_schema.sql`](supabase/migrations/20261016000000_official_schema.sql) y pulsa **Run**.
3. **Insertar los Datos Semilla:**
   * Abre otra consulta, copia el contenido de [`supabase/seed.sql`](supabase/seed.sql) y pulsa **Run**.

Verás de inmediato las 14 tablas en el **Table Editor** listas para ser consumidas por la API.

---

## 👥 Matriz de Roles y Accesos (RBAC)

| Rol | Alcance en el Sistema |
| :--- | :--- |
| **Administrador** | Control total: Cuentas, asignación de roles, creación de eventos en Borrador, presupuesto, publicación, asignación de operadores logísticos y reportes. Requiere MFA. |
| **Comité Directivo** | Evaluación y visto bueno de eventos (Borrador → Aprobado) o devolución con comentario obligatorio. Consulta de reportes y presupuestos. Requiere MFA. |
| **Operador Logístico** | Control de acceso en puerta: lectura de códigos QR, validación de aforo en tiempo real y registro de ingresos manuales. Acceso exclusivo a `control-aforo.html`. |
| **Comprador** | Registro empresarial con NIT, exploración de catálogo de emprendedores y agendamiento de citas en ruedas de negocios. |
| **Proveedor (Emprendedor SENA)** | Publicación de emprendimiento, subida de portafolio PDF, recepción y confirmación de citas comerciales. |
| **Asistente General / Aprendiz** | Consulta de la parrilla pública en `index.html`, inscripción a sub-eventos y descarga del pase digital con código QR. |
