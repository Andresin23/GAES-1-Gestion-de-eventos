# 🔍 Informe de Auditoría de Código Falso (Mocks) y Reestructuración de Arquitectura

**Proyecto:** Sistema de Gestión de Eventos — Fondo Emprender SENA (GAES-1)  
**Fecha:** Octubre 2026  
**Objetivo:** Identificar, documentar y catalogar todos los elementos simulados ("fake") del proyecto y formalizar la reestructuración de carpetas hacia la arquitectura oficial con Supabase.

---

## 1. Inventario Detallado de Elementos Falsos y Código Simulado

La siguiente matriz documenta los elementos que operan como simulación en el frontend y deben desconectarse en la fase de integración:

| Elemento / Código Falso | Archivo y Ubicación | Mecanismo de Simulación | Riesgo / Confusión para el Equipo |
| :--- | :--- | :--- | :--- |
| **`USUARIOS_DEFAULT`** | [`js/api.js:L17-58`](../js/api.js#L17-L58) | Arreglo de 5 usuarios estáticos con contraseñas en texto plano (`Admin123!`, etc.) que se auto-graban en `localStorage.getItem('sena_usuarios')`. | No coinciden con los usuarios reales del backend ni de Supabase Auth. Da la falsa impresión de que el login valida contra una base de datos. |
| **`EVENTOS_MOCK_INICIAL`** | [`js/api.js:L103-164`](../js/api.js#L103-L164) | Arreglo de 4 eventos con aforos predefinidos (`aforoMaximo: 200, aforoActual: 145`) que se guardan en `sena_eventos`. | Tienen un esquema plano (`titulo`, `aforoMaximo`) incompatible con la estructura relacional de `Event` y `SubEvent`. |
| **`JWT-SENA-MOCK-${Date.now()}`** | [`js/api.js:L405`](../js/api.js#L405) | Cadena de texto generada con `Date.now()` para simular una firma JWT exitosa. | Cualquier petición al backend con este token fallará con `401 Unauthorized` porque no está firmado con Supabase JWT Secret. |
| **`GUEST-TOKEN-VISOR`** | [`js/login.js:L89-105`](../js/login.js#L89-L105) | Token quemado que otorga rol `Visor Público (Invitado)` con ID numérico `0`. | Genera una sesión artificial en el navegador sin registro en la tabla `User`. |
| **`manejarRespuestaFallback()`** | [`js/api.js:L389-614`](../js/api.js#L389-L614) | "Mini-backend" embebido en el navegador que intercepta llamadas HTTP fallidas a `/auth/login`, `/auth/register`, `/eventos`, `/inscripciones` y `/aforo/validar-qr`. | **Es la causa principal del engaño:** cuando el backend real falla o está apagado, el usuario no ve ningún error porque esta función inventa respuestas exitosas. |
| **Generador de Pases QR al Vuelo** | [`js/api.js:L569-581`](../js/api.js#L569-L581) | Código que acepta cualquier número o código que empiece por `FE-SENA-` inventando un registro en memoria. | Permite que el escáner de [`control-aforo.html`](../control-aforo.html) apruebe códigos inexistentes. |
| **Decodificación Local de Google Auth** | [`js/google-auth.js:L122-180`](../js/google-auth.js#L122-L180) | Lee el ID Token de Google en el cliente con `atob()` y guarda el usuario en `localStorage` sin validación de servidor. | La cuenta nunca se crea en Supabase Auth ni en la base de datos PostgreSQL. |
| **Rutas Desconectadas en Backend** | [`backend/src/app.ts:L26-32`](../backend/src/app.ts#L26-L32) | `crearApp()` solo tiene la ruta `/api/v1/health` y envía todo lo demás a `404 Not Found`. | Todo el trabajo real de servicios en `backend/src/modules/` estaba aislado del servidor HTTP. |

---

## 2. Nueva Arquitectura Limpia del Proyecto

Para resolver la dispersión de archivos y evitar que los desarrolladores se confundan, la estructura del repositorio se ha reorganizado de la siguiente manera:

```
GAES-1-Gestion-de-eventos/
├── backend/                       # 🛡️ API REST Node.js + Express + Prisma (14 Tablas)
│   ├── prisma/                    # Esquema y seeds de Prisma (referencia técnica)
│   └── src/                       # Módulos de negocio (auth, events, registrations, users)
├── supabase/                      # 🗄️ BASE DE DATOS OFICIAL (SUPABASE POSTGRESQL)
│   ├── migrations/                # DDL oficial con las 14 tablas, RLS, triggers y enums
│   ├── seed.sql                   # Datos iniciales institucionales en SQL
│   └── README.md                  # Instrucciones para ejecutar en SQL Editor de Supabase
├── docs/                          # 📚 DOCUMENTACIÓN Y REQUERIMIENTOS
│   ├── REQUERIMIENTOS.md          # Especificación formal de requerimientos del sistema
│   ├── Plantilla_Requerimientos.md# Documento de entrega académica SENA GAES-1
│   └── AUDITORIA_FAKES_Y_ARQUITECTURA.md # Este reporte
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
└── README.md                      # 📖 Guía maestra del repositorio actualizada
```

---

## 3. Verificación de las 14 Tablas Oficiales en Supabase

El script [`supabase/migrations/20261016000000_official_schema.sql`](../supabase/migrations/20261016000000_official_schema.sql) ha sido verificado contra el modelo de Prisma para asegurar compatibilidad 1:1:

1. **`User`**: Tipos nativos PostgreSQL con `authId UUID REFERENCES auth.users(id)` y sincronización por trigger.
2. **`UserRole`**: Clave compuesta `(userId, role)` con cascada de eliminación.
3. **`AccessLog`**: Indexado por `userId` y `createdAt` para auditoría ágil.
4. **`Category`**: Claves únicas en `name` y `slug`.
5. **`Event`**: Estados (`BORRADOR`, `APROBADO`, `PUBLICADO`, `CANCELADO`), índice compuesto de visibilidad y relaciones con creador y aprobador.
6. **`SubEvent`**: Control de capacidad y plazos de inscripción por evento.
7. **`Registration`**: Llave única de `qrCode`, unicidad `(userId, subEventId)` y campos de check-in (`checkedInAt`, `checkedInById`).
8. **`OperatorAssignment`**: Asignación de permisos de escaneo en puerta por evento o sub-evento.
9. **`BuyerProfile`**: NIT único y sector empresarial de inversionistas.
10. **`ProviderProfile`**: Portafolio en PDF, sector y redes de emprendedores SENA.
11. **`Appointment`**: Agendamiento de citas para ruedas de negocios con calificación de 1 a 5.
12. **`EmailOutbox`**: Cola de mensajes con control de intentos y errores.
13. **`AuditLog`**: Registro JSONB para trazabilidad de decisiones del Comité.
14. **`ReportExport`**: Almacenamiento y expiración de archivos exportados.
