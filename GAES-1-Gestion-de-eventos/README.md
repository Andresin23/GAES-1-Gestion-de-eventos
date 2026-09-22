# 🚀 Sistema de Gestión de Eventos - Fondo Emprender (SENA)

Plataforma web integral para la planificación, aprobación, gestión logística y analítica de eventos institucionales del **Fondo Emprender del SENA**. Desarrollado por el equipo **GAES-1**.

El sistema automatiza los procesos operativos y logísticos, priorizando la ejecución de **ruedas de negocios** para facilitar el matchmaking entre emprendedores (proveedores) y compradores externos, con control de comités institucionales y reportes analíticos.

---

## 📋 Tabla de Contenidos

- [Características Principales](#-características-principales)
- [Flujo de Uso por Roles](#-flujo-de-uso-por-roles)
- [Requerimientos Principales del Sistema](#-requerimientos-principales-del-sistema)
- [Stack Tecnológico](#-stack-tecnológico)
- [Instalación y Configuración](#-instalación-y-configuración)
- [Seguridad y Normativa](#-seguridad-y-normativa)

---

## ✨ Características Principales

- **🤝 Ruedas de Negocios (Matchmaking):** Compradores y proveedores visualizan perfiles, agendan citas 1 a 1 en franjas de tiempo definidas y califican las reuniones.
- **🛡️ Flujo estricto de aprobación:** Los eventos propuestos permanecen en estado **Borrador** hasta que el Comité Directivo los valida y aprueba según la estrategia anual del SENA.
- **📅 Calendario y pre-eventos:** Parrilla anual pública con filtros por categoría, fecha y modalidad, para generar expectativa e inscripciones tempranas.
- **📲 Logística mobile-first (control QR):** Vista web responsiva para operadores logísticos: escaneo de códigos QR en puerta, validación de aforo en tiempo real y registro de walk-ins.
- **📜 Certificación automática:** Generación de PDF y envío de certificados de asistencia solo a usuarios con ingreso validado.
- **📊 Analítica avanzada:** Dashboard con participación por sector económico (agro, tecnología, entre otros), exportación a Excel/PDF y métricas de satisfacción institucional.

---

## 👥 Flujo de Uso por Roles

| Rol | Qué hace en la plataforma |
| :--- | :--- |
| **Administradores y Comité Directivo** | Proponen eventos, asignan presupuestos, evalúan viabilidad y aprueban la publicación en el calendario oficial. Acceden a analítica prospectiva. |
| **Compradores** | Se registran con datos empresariales, exploran el directorio de emprendedores filtrando por sector y solicitan citas para las ruedas de negocios. |
| **Proveedores (Emprendedores SENA)** | Configuran su portafolio de productos y servicios, reciben solicitudes de citas y gestionan su agenda para conectar con compradores. |
| **Asistentes generales** | Exploran la parrilla de eventos, se inscriben a conferencias o ferias y reciben su código QR de acceso. |
| **Operador logístico** | Usa la vista móvil en sitio para escanear QR, controlar el aforo máximo e imprimir escarapelas. |

---

## ⚙️ Requerimientos Principales del Sistema

### Requerimientos funcionales

- **Gestión de usuarios:** Control de acceso basado en roles (RBAC), unicidad de documento (cédula/NIT) y verificación por correo electrónico.
- **Gestión de eventos:** Estados **Borrador**, **Aprobado**, **Cancelado** y **Publicado**, con sub-eventos (talleres, conferencias) asociados a un evento principal.
- **Módulo de matchmaking:** Agendamiento asíncrono con topes diarios, bloqueo de horarios ocupados y asignación de salas virtuales o stands físicos.
- **Aforo e inscripciones:** Cierre automático al alcanzar la capacidad máxima, listas de espera y recordatorios 24 h y 1 h antes del evento.
- **Ejecución y reportes:** Escaneo de QR en tiempo real que cambia el estado a **Asistió**. Exportación cruzando rol, sector económico y nivel de satisfacción.

### Requerimientos no funcionales

- **Rendimiento:** Mínimo 5.000 usuarios concurrentes, consulta de eventos en menos de 1,5 s y peso inicial del frontend menor a 3 MB.
- **Disponibilidad y confiabilidad:** Uptime del 99,9 %, copias de seguridad diarias e incrementales, y despliegue con tolerancia a fallos.
- **Usabilidad (UX/UI):** Diseño 100 % mobile-first alineado a los lineamientos gráficos del SENA, inscripción en máximo 3 clics y accesibilidad WCAG 2.1 AA.
- **Mantenibilidad:** Arquitectura modular con APIs REST, pruebas unitarias en CI/CD con GitHub Actions y variables de entorno separadas del código.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnología |
| :--- | :--- |
| **Backend** | Node.js / Express.js |
| **Base de datos** | PostgreSQL o MySQL, con ORM (Prisma o Sequelize) |
| **Frontend** | HTML5, CSS3, JavaScript (ES6+), diseño mobile-first |
| **PDF y QR** | Librerías especializadas (pdfkit, qrcode) para certificados y pases |
| **Correo** | SMTP (Nodemailer) para notificaciones y certificados |
| **Control de versiones** | Git y GitHub, con GitHub Actions para CI/CD |

El repositorio actual publica el cliente estático (calendario público y control de aforo) en **GitHub Pages**. El backend, la base de datos y el envío de correo forman parte de la arquitectura objetivo descrita arriba.

---

## 🚀 Instalación y Configuración

### Cliente web actual

```bash
git clone https://github.com/Andresin23/GAES-1-Gestion-de-eventos.git
cd GAES-1-Gestion-de-eventos
```

Abre `index.html` en el navegador, o sirve la carpeta con un servidor estático. Las vistas disponibles son:

- `index.html` — calendario público de eventos
- `control-aforo.html` — control de aforo en puerta

Cada push a `main` despliega el sitio estático mediante el workflow `.github/workflows/static.yml`.

### Arquitectura objetivo (API)

Cuando el backend esté en el repositorio:

```bash
cd backend
npm install

cd ../frontend
npm install
```

Crea un archivo `.env` en la raíz del backend a partir de `.env.example`:

```env
PORT=3000
DATABASE_URL="postgresql://usuario:password@localhost:5432/eventos_sena"
JWT_SECRET="clave_super_secreta_aqui"
SMTP_HOST="smtp.tudominio.com"
SMTP_PORT=587
SMTP_USER="notificaciones@eventos.sena.edu.co"
SMTP_PASS="tu_contraseña_segura"
```

```bash
npm run db:migrate
npm run db:seed
npm run dev
```

La API quedará en `http://localhost:3000`. El cliente web se sirve según la configuración del frontend.

---

## 🔒 Seguridad y Normativa

- **Habeas Data (Ley 1581 de 2012):** Protección de datos personales en Colombia. Cada registro exige la aceptación explícita de las políticas de tratamiento de datos.
- **Criptografía:** Contraseñas con bcrypt o Argon2. Intercambio de datos bajo HTTPS/TLS.
- **Protección de API:** Endpoints administrativos y transaccionales protegidos con JSON Web Tokens (JWT) y middlewares de validación de roles.
