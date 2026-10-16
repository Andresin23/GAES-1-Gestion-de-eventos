# 📦 Manifiestos de Despliegue Alternativos / Legacy

Este directorio almacena archivos de configuración y contenerización que se han desacoplado de la raíz del proyecto para evitar confusión con el despliegue oficial objetivo en **Supabase**.

---

## 📁 Archivos en este Directorio

* [`docker-compose.yml`](docker-compose.yml): Entorno local autocontenido con PostgreSQL Alpine y servidor de pruebas SMTP (Mailhog). Se conserva como alternativa si el equipo requiere realizar pruebas locales desconectadas de internet.
* [`render.yaml`](render.yaml): Blueprint de infraestructura como código para la plataforma Render (Web Service Docker).

---

> [!NOTE]
> La arquitectura oficial y objetivo del proyecto GAES-1 utiliza **Supabase** para la base de datos PostgreSQL, autenticación y storage, ubicada en la carpeta [`../supabase/`](../supabase/).
