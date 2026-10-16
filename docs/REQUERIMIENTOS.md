# Sistema de Gestión de Eventos - Fondo Emprender (SENA)

Especificación de requerimientos del MVP. Las reglas de este documento sustituyen las versiones anteriores del mismo archivo.

El sistema cubre la autenticación propia, el ciclo de vida del evento, el calendario público, la rueda de negocios, el control de acceso por QR y la exportación de reportes. Lo que queda fuera del MVP está en [Fase 2](#6-fase-2--backlog-futuro) o en [Fuera de alcance](#7-fuera-de-alcance).

---

## 1. Reglas de negocio

### 1.1 Estados del evento

El evento principal recorre cuatro estados, en este orden:

| Estado | Significado | Visible en el calendario público |
| :--- | :--- | :--- |
| **Borrador** | El Administrador crea y edita el evento. | No |
| **Aprobado** | El Comité Directivo da el visto bueno interno de presupuesto y viabilidad. | No |
| **Publicado** | El Administrador lo publica. Aparece en el calendario dentro de su ventana de visibilidad. | Sí |
| **Cancelado** | El evento no se realiza. Se conserva el histórico y se avisa a los inscritos. | No |

Transiciones permitidas:

1. **Borrador → Aprobado.** La decide el Comité Directivo cuando el presupuesto estimado y la viabilidad son aceptables.
2. **Borrador → Borrador.** Si el Comité no da el visto bueno, el evento sigue en Borrador. El comentario de justificación es obligatorio.
3. **Aprobado → Publicado.** La decide el Administrador. Define la fecha de inicio y la fecha de fin de la visibilidad en el calendario.
4. **Aprobado → Cancelado** o **Publicado → Cancelado.** La decide el Administrador, con justificación, y el sistema notifica a los inscritos.
5. No hay vuelta atrás. Un evento Cancelado no regresa a Borrador, Aprobado ni Publicado.

No existen los estados Rechazado ni Oculto. Quitar un evento del calendario público es Cancelado, o simplemente no haberlo pasado a Publicado.

### 1.2 Sub-eventos

Un evento principal agrupa sub-eventos (charla, taller, conferencia u otro espacio con aforo propio).

- La inscripción del asistente es al **sub-evento**, no al evento global.
- El código QR y su validación en puerta son del **sub-evento**.
- El aforo, la lista de espera y el cierre de inscripciones se calculan por sub-evento.
- Un sub-evento solo admite inscripciones cuando el evento principal está en **Publicado** y dentro de su ventana de visibilidad.

### 1.3 Inscripción en tres clics

La regla de máximo tres clics desde la página principal hasta quedar inscrito aplica solo a un usuario **ya autenticado**.

El registro inicial es otro flujo: crear cuenta, aceptar la política de datos, verificar el correo y completar el perfil (empresa, emprendimiento o intereses, según el rol). Ese onboarding no entra en la cuenta de los tres clics.

### 1.4 Control QR

- El Operador Logístico necesita conexión a internet para validar un QR.
- La validación debe responder en menos de 1 segundo.
- Cada QR es de un solo uso, ligado a una persona y a un sub-evento.
- El primer escaneo válido pasa el estado de **Inscrito** a **Asistió** y registra la hora de ingreso.
- Un segundo escaneo del mismo QR se rechaza. Eso impide el ingreso doble.
- El sistema no define salida ni reingreso. El escaneo válido es la confirmación oficial de asistencia.

### 1.5 Privacidad y auditoría

Si una persona elimina su cuenta, el sistema anonimiza sus datos personales (nombre, correo, documento, teléfono, empresa y perfil).

El registro histórico de asistencia se conserva **5 años** para las métricas institucionales, ya sin datos que identifiquen a la persona. Los logs de aprobación del Comité y de exportación de reportes se conservan el mismo periodo.

### 1.6 Presupuesto

El presupuesto del evento es una **estimación interna en pesos colombianos (COP)** para el Administrador y el Comité Directivo.

El sistema no tiene pasarela de pago y no almacena datos financieros de los usuarios (tarjetas, cuentas bancarias ni medios de pago).

### 1.7 Satisfacción

El índice de satisfacción de una rueda de negocios es el promedio de calificaciones de **1 a 5 estrellas** que las partes dejan al cerrar la cita.

No se recolectan firmas digitales. La asistencia queda confirmada con el QR.

### 1.8 Cita virtual

Si la cita es virtual, el Proveedor pega un enlace externo (Microsoft Teams, Google Meet u otro). El sistema guarda y muestra ese enlace. No crea ni administra la videollamada.

---

## 2. Alcance del MVP

Prioridad alta de esta versión:

- Autenticación propia con JWT y seis roles.
- CRUD de eventos con el flujo Borrador → Aprobado → Publicado → Cancelado y sub-eventos.
- Calendario público e inscripción al sub-evento.
- Rueda de negocios: directorio, filtros y agendamiento simple.
- Generación y lectura de QR en línea.
- Exportación de reportes en Excel (XLSX) y CSV.

---

## 3. Roles

| Rol | Responsabilidad en el MVP |
| :--- | :--- |
| **Administrador** | Cuentas, eventos en Borrador, presupuesto estimado, publicación, cancelación, operadores del evento y reportes. |
| **Comité Directivo** | Visto bueno de presupuesto y viabilidad (Borrador → Aprobado) y consulta de reportes. |
| **Operador Logístico** | Control de acceso del sub-evento asignado: lectura de QR, registro manual y walk-in. |
| **Comprador** | Perfil de empresa, directorio de proveedores y solicitud de citas. |
| **Proveedor (Emprendedor)** | Perfil del emprendimiento, portafolio, aceptación o rechazo de citas y enlace externo de la reunión. |
| **Asistente** | Exploración del calendario e inscripción a sub-eventos. |

Un mismo documento de identidad puede tener varios roles solo si el Administrador los asigna. La persona elige el rol activo al entrar; el panel corresponde a ese rol.

---

## 4. Requerimientos funcionales

### 4.1 Usuarios y acceso

- **RF-01.** El registro ofrece los roles Administrador, Comité Directivo, Operador Logístico, Comprador, Proveedor y Asistente. Los roles institucionales (Administrador, Comité y Operador) los asigna el Administrador; el autoregistro público cubre Comprador, Proveedor y Asistente.
- **RF-02.** La autenticación es con correo y contraseña. La sesión se emite con JWT.
- **RF-03.** La recuperación de contraseña se envía por correo electrónico.
- **RF-04.** El Administrador crea, edita, suspende y elimina cuentas.
- **RF-05.** El registro exige verificar el correo con un enlace o un código OTP antes de usar el resto de la plataforma. Este paso pertenece al onboarding, no a la inscripción de tres clics.
- **RF-06.** El Comprador registra NIT, razón social y sector económico.
- **RF-07.** El Proveedor registra los datos del emprendimiento, sus productos o servicios, un portafolio en PDF y enlaces a redes comerciales.
- **RF-08.** El Asistente registra intereses temáticos al crear la cuenta.
- **RF-09.** Un número de identificación (cédula o NIT) no puede registrarse dos veces.
- **RF-10.** El Administrador puede asignar más de un rol a la misma cuenta.
- **RF-11.** Cada rol activo tiene su propio panel.
- **RF-12.** La persona puede actualizar su perfil mientras la cuenta exista.
- **RF-13.** El registro incluye un checkbox obligatorio de aceptación de la política de tratamiento de datos (Ley 1581 de 2012).
- **RF-14.** Cada acceso queda en un historial con fecha, hora y dirección IP.
- **RF-15.** Al eliminar la cuenta se anonimizan los datos personales y se conserva 5 años el histórico de asistencia, según la sección 1.5.

### 4.2 Eventos y sub-eventos

- **RF-16.** El Administrador crea el evento en estado Borrador con nombre, descripción, fecha, categoría y modalidad (presencial, virtual o híbrido).
- **RF-17.** Las categorías incluyen, como mínimo, Economía Circular, Tecnología y Agro, y el Administrador puede agregar otras.
- **RF-18.** El Administrador registra un presupuesto estimado en COP. Solo Administrador y Comité Directivo lo consultan.
- **RF-19.** Al dejar un Borrador listo para revisión, el sistema avisa por correo al Comité Directivo.
- **RF-20.** El Comité Directivo aprueba el evento o lo devuelve con un comentario obligatorio. Aprobar lo pasa a Aprobado. Devolverlo lo deja en Borrador.
- **RF-21.** El Administrador publica un evento Aprobado. La publicación exige fecha de inicio y fecha de fin de visibilidad. El estado pasa a Publicado.
- **RF-22.** El calendario público lista únicamente eventos en estado Publicado y dentro de su ventana de visibilidad.
- **RF-23.** El Administrador cancela un evento Aprobado o Publicado. El estado pasa a Cancelado, el comentario queda guardado y los inscritos reciben un correo.
- **RF-24.** El Administrador asocia uno o varios sub-eventos al evento principal. Cada sub-evento tiene nombre, fecha, horario, modalidad y aforo propio.
- **RF-25.** La inscripción, el cupo, la lista de espera y el QR se administran por sub-evento.
- **RF-26.** El Administrador puede duplicar la estructura de un evento pasado. La copia nace en Borrador, sin inscritos ni QR anteriores.
- **RF-27.** El Administrador asigna uno o varios Operadores Logísticos a un evento. Esos operadores validan los QR de sus sub-eventos.
- **RF-28.** El Administrador edita libremente el evento mientras está en Borrador. En Aprobado o Publicado solo puede ajustar datos operativos que no cambian el visto bueno: operadores asignados, ventana de visibilidad y aforo de un sub-evento que aún no tenga inscritos. El presupuesto y la viabilidad solo se modifican en Borrador. Si hay que rehacerlos después del visto bueno, el Administrador cancela el evento y duplica su estructura (RF-26); la copia nace otra vez en Borrador.

### 4.3 Calendario, inscripción y aforo

- **RF-29.** El calendario público muestra la parrilla de eventos Publicados y permite filtrar por mes, categoría y modalidad.
- **RF-30.** Cada sub-evento muestra el estado de inscripción: Abiertas, Cerradas o Próximamente.
- **RF-31.** Un usuario autenticado se inscribe a un sub-evento en un máximo de tres clics desde la página principal.
- **RF-32.** Quien no tiene sesión recorre primero el onboarding (RF-05 a RF-08). Esos pasos no cuentan como clics de inscripción.
- **RF-33.** Cada sub-evento presencial tiene un aforo máximo. Cada sub-evento virtual tiene un tope de inscritos.
- **RF-34.** Al alcanzar el cupo, las inscripciones de ese sub-evento se cierran solas.
- **RF-35.** Con el cupo lleno se abre lista de espera. Si alguien cancela su inscripción, el cupo pasa a la primera persona de la lista y se le avisa por correo.
- **RF-36.** Toda inscripción confirmada genera un correo con los datos del sub-evento.
- **RF-37.** El sistema genera un QR único por persona y sub-evento.
- **RF-38.** El Administrador puede inscribir invitados especiales a un sub-evento sin descontar el aforo público. El invitado también recibe un QR de un solo uso.
- **RF-39.** La persona cancela su propia inscripción desde el panel, siempre que el sub-evento no haya empezado y su QR no haya sido usado.
- **RF-40.** Cada sub-evento tiene una fecha límite de inscripción.
- **RF-41.** El sistema envía recordatorios por correo 24 horas y 1 hora antes del sub-evento, solo a quienes siguen inscritos.

### 4.4 Rueda de negocios

- **RF-42.** El Administrador puede activar la rueda de negocios en un evento Publicado.
- **RF-43.** El Comprador consulta el directorio de Proveedores inscritos en ese evento y lo filtra por sector económico.
- **RF-44.** El Proveedor consulta el perfil público del Comprador (razón social y sector). El correo de la otra parte no se muestra.
- **RF-45.** El Comprador solicita una cita a un Proveedor en una franja libre.
- **RF-46.** El Proveedor acepta o rechaza la solicitud. No hay reprogramación dentro del MVP: si la franja no sirve, la solicitud se rechaza y el Comprador puede pedir otra franja libre.
- **RF-47.** Cuando la cita queda confirmada, las dos partes reciben un correo.
- **RF-48.** La agenda de cada persona bloquea los horarios ya ocupados por una cita confirmada.
- **RF-49.** El Administrador define la duración estándar de las citas del evento.
- **RF-50.** El Administrador define el máximo de citas confirmadas por persona y por día.
- **RF-51.** En una cita presencial el sistema asigna un número de mesa o stand.
- **RF-52.** En una cita virtual el Proveedor pega un enlace externo. El sistema no genera la sala.
- **RF-53.** Al terminar la cita, cada parte puede calificarla de 1 a 5 estrellas. El índice de satisfacción del evento es el promedio de esas calificaciones.

### 4.5 Logística y QR

- **RF-54.** El Operador Logístico tiene una vista de control de acceso usable en teléfono y tableta.
- **RF-55.** Esa vista lee el QR con la cámara del dispositivo y lo valida contra el servidor. Sin internet no hay validación.
- **RF-56.** La respuesta de validación tarda menos de 1 segundo e indica si el QR pertenece al sub-evento en curso y si aún no fue usado.
- **RF-57.** El primer escaneo válido marca **Asistió**, guarda la hora de ingreso y agota el QR.
- **RF-58.** Un QR ya usado, de otro sub-evento o de una persona no inscrita se rechaza, con un mensaje visible para el operador.
- **RF-59.** Si la cámara falla, el operador registra la asistencia con el número de identificación. Esa acción también es de un solo uso y exige internet.
- **RF-60.** La vista muestra el porcentaje de ocupación del sub-evento en el momento de cada ingreso válido.
- **RF-61.** Si queda cupo, el operador registra un walk-in en el sub-evento. El walk-in queda inscrito y, en el mismo acto, en estado **Asistió**.
- **RF-62.** El operador puede imprimir una escarapela con nombre, rol y QR de las personas inscritas a ese sub-evento.
- **RF-63.** El Administrador carga asistentes preinscritos de un sub-evento con un archivo CSV (UTF-8). Las filas con documento repetido se rechazan.
- **RF-64.** No hay módulo de firma. El estado **Asistió** sale únicamente de un QR válido, del registro manual por documento o del walk-in.

### 4.6 Reportes y exportación

Los reportes del MVP se consultan en pantalla y se descargan en Excel (XLSX) y CSV (UTF-8). El sistema no genera PDF masivos.

- **RF-65.** Inscritos frente a asistentes reales, por evento y por sub-evento.
- **RF-66.** Asistentes desglosados por rol.
- **RF-67.** Gráficos de barras y de torta para los reportes anteriores.
- **RF-68.** Citas solicitadas, confirmadas y rechazadas de la rueda de negocios.
- **RF-69.** Participación filtrable por sector económico.
- **RF-70.** Índice de satisfacción del evento, como promedio de 1 a 5 estrellas.
- **RF-71.** Listado de proveedores ordenado por cantidad de citas solicitadas.
- **RF-72.** Consolidado anual de eventos en estado Publicado o Cancelado y de personas que quedaron en **Asistió**.
- **RF-73.** Cada archivo exportado incluye la fecha de generación y el usuario que lo solicitó.
- **RF-74.** La lista de personas en estado **Asistió** se exporta en Excel o CSV para elaborar certificados fuera del sistema.

### 4.7 Correo transaccional

- **RF-75.** El sistema envía, con plantillas editables por el Administrador, estos correos: verificación de cuenta, recuperación de contraseña, aviso al Comité, confirmación de inscripción, recordatorios de 24 h y 1 h, confirmación o rechazo de cita, y cancelación de evento.
- **RF-76.** El envío transaccional queda en cola y se reintenta si el proveedor de correo falla, sin bloquear la pantalla de quien hizo la acción.

---

## 5. Requerimientos no funcionales

### 5.1 Rendimiento

- **RNF-01.** La plataforma soporta al menos 5.000 usuarios concurrentes en los flujos de consulta del calendario y de inscripción.
- **RNF-02.** Cualquier página carga en menos de 2 segundos con una conexión estándar.
- **RNF-03.** La búsqueda y el filtro de eventos responden en menos de 1,5 segundos.
- **RNF-04.** Confirmar o rechazar una cita, y bloquear la franja en la agenda, se completa en menos de 3 segundos.
- **RNF-05.** La validación del QR, con internet en el dispositivo del operador, responde en menos de 1 segundo.
- **RNF-06.** Una exportación que tarde más de 5 segundos se genera en segundo plano y se avisa cuando el archivo está listo.
- **RNF-07.** El peso de la carga inicial del frontend no supera 3 MB.
- **RNF-08.** Las imágenes de perfil y los banners se comprimen al subirlas.
- **RNF-09.** El calendario público puede servirse desde caché. Una publicación, cancelación o cambio de cupo invalida esa caché.
- **RNF-10.** Las llamadas a servicios externos (correo) son asíncronas.

### 5.2 Seguridad y privacidad

- **RNF-11.** Las contraseñas se almacenan con bcrypt o Argon2.
- **RNF-12.** Todo el tráfico usa HTTPS con TLS 1.2 o superior.
- **RNF-13.** La sesión termina tras 30 minutos sin actividad.
- **RNF-14.** Tras 5 intentos fallidos de acceso, la cuenta se bloquea de forma temporal.
- **RNF-15.** Todas las entradas se validan para impedir inyección SQL y XSS.
- **RNF-16.** Los formularios que modifican datos incluyen protección CSRF.
- **RNF-17.** El acceso de Administrador y de Comité Directivo exige un segundo factor (MFA).
- **RNF-18.** El tratamiento de datos personales cumple la Ley 1581 de 2012. El checkbox de la política es obligatorio en el registro.
- **RNF-19.** Los correos electrónicos no se muestran en directorios ni perfiles públicos.
- **RNF-20.** Las copias de seguridad de la base de datos se cifran en reposo con AES-256.
- **RNF-21.** Cada ruta de la API comprueba el rol (RBAC) además del JWT.
- **RNF-22.** Los enlaces de descarga de reportes expiran. No son permanentes.
- **RNF-23.** La carga de archivos acepta solo los tipos previstos (PDF de portafolio, CSV de inscritos e imágenes de perfil), validados por tipo MIME. Se rechaza cualquier ejecutable.
- **RNF-24.** Los encabezados HTTP no publican la versión del servidor ni del lenguaje.
- **RNF-25.** La base de datos no queda expuesta a internet.
- **RNF-26.** Antes de cada salida a producción se ejecuta un análisis automático de vulnerabilidades.
- **RNF-27.** Eliminar la cuenta anonimiza los datos personales y conserva 5 años el histórico de asistencia (sección 1.5).
- **RNF-28.** El sistema no solicita ni almacena tarjetas, cuentas ni otros datos financieros.
- **RNF-29.** Los términos de uso obligan al Comprador a no usar los datos de los Proveedores para correo masivo no solicitado.

### 5.3 Usabilidad

- **RNF-30.** La interfaz es mobile-first y funciona en teléfono, tableta y escritorio.
- **RNF-31.** La presentación sigue los lineamientos gráficos del SENA.
- **RNF-32.** Un usuario autenticado completa la inscripción a un sub-evento en un máximo de tres clics desde la página principal. El onboarding queda fuera de esa cuenta.
- **RNF-33.** La navegación interna muestra migas de pan.
- **RNF-34.** Los formularios largos (registro de empresa o de emprendimiento) van por pasos, con barra de progreso.
- **RNF-35.** Los errores se muestran en español de Colombia e indican cómo corregirlos.
- **RNF-36.** Los campos obligatorios se marcan con un asterisco.
- **RNF-37.** La interfaz cumple WCAG 2.1 nivel AA.
- **RNF-38.** El área táctil mínima de un botón en móvil es de 44×44 píxeles.
- **RNF-39.** Los flujos principales se pueden recorrer con teclado.
- **RNF-40.** Las tablas de reportes se ordenan al hacer clic en el encabezado.
- **RNF-41.** Las acciones de carga y de guardado muestran un indicador visible.
- **RNF-42.** El texto de la interfaz usa lenguaje de eventos, sin jerga técnica innecesaria.
- **RNF-43.** Fechas en formato DD/MM/AAAA. La hora se muestra en formato de 24 horas. La zona horaria de la agenda es America/Bogota.
- **RNF-44.** El idioma de la plataforma es español de Colombia.
- **RNF-45.** Los teléfonos se validan con el indicativo +57 por defecto.
- **RNF-46.** Los presupuestos se muestran en pesos colombianos (COP), sin decimales de otra moneda.

### 5.4 Disponibilidad del MVP

Estas condiciones son las de la primera versión. La alta disponibilidad multi-zona y los objetivos estrictos de recuperación están en la Fase 2.

- **RNF-47.** Copia de seguridad completa todos los días a las 02:00 (hora de Bogotá) y copia incremental cada 6 horas.
- **RNF-48.** Durante una ventana de mantenimiento se muestra una página estática que explica la pausa.
- **RNF-49.** Los relojes de los servidores se sincronizan por NTP.
- **RNF-50.** Un monitor avisa al equipo cuando el servicio de autenticación, el de inscripción o el de validación QR deja de responder.
- **RNF-51.** Si el correo transaccional falla, los mensajes permanecen en cola y se reintentan (RF-76).

### 5.5 Arquitectura y mantenibilidad

- **RNF-52.** El backend expone una API REST. El frontend consume esa API y no accede a la base de datos.
- **RNF-53.** El código vive en Git. Las fusiones pasan por un linter y un formateador.
- **RNF-54.** La configuración sensible está en variables de entorno, fuera del código.
- **RNF-55.** Existen tres entornos separados: desarrollo, pruebas y producción.
- **RNF-56.** La aplicación se puede construir y ejecutar con Docker.
- **RNF-57.** Las pruebas unitarias automatizadas cubren al menos el 70 % del backend en los módulos de autenticación, estados del evento, cupos y validación de QR.
- **RNF-58.** Los logs de aplicación son JSON.
- **RNF-59.** Cada exportación de reportes y cada cambio de estado de un evento o de un rol queda en un log de auditoría con usuario, fecha y acción. El visto bueno y la devolución del Comité son inalterables.
- **RNF-60.** La entrega incluye un manual técnico con el modelo de datos, las variables de entorno y los pasos de despliegue.
- **RNF-61.** La política de privacidad, los términos y el aviso de cookies son enlaces visibles en el registro y en el pie de página.
- **RNF-62.** Los CSV exportados e importados usan UTF-8.

---

## 6. Fase 2 / Backlog futuro

Estos enunciados no forman parte de los requerimientos base. No se implementan en el MVP.

### 6.1 Identidad institucional

- **F2-01.** Inicio de sesión contra el Directorio Activo del SENA mediante SSO / SAML 2.0, como alternativa a la autenticación propia. El JWT del MVP se mantiene para quienes no entren por el directorio.

### 6.2 Mensajería SMS

- **F2-02.** Recordatorios por SMS, además del correo ya definido en el MVP.
- **F2-03.** Los SMS no se envían entre las 22:00 y las 06:00 (hora de Bogotá).

### 6.3 Alta disponibilidad

- **F2-04.** Despliegue en varias zonas de disponibilidad.
- **F2-05.** Disponibilidad mensual objetivo del 99,9 %.
- **F2-06.** Tiempo de recuperación (RTO) de hasta 4 horas y punto de recuperación (RPO) de hasta 6 horas.
- **F2-07.** Conmutación automática de la base de datos a un nodo réplica.
- **F2-08.** Despliegues sin cortar el servicio.

### 6.4 Documentos PDF

En el MVP la constancia se resuelve exportando la lista de asistentes (RF-74). La generación masiva de PDF queda aquí:

- **F2-09.** Certificado de asistencia en PDF, enviado por correo solo a quienes estén en estado **Asistió**.
- **F2-10.** Reportes en PDF con la presentación institucional del SENA.
- **F2-11.** Acta de cierre del evento en PDF con las cifras de inscritos, asistentes, citas e índice de satisfacción.
- **F2-12.** Cada PDF de certificado pesa menos de 1 MB.

### 6.5 Analítica y comunicaciones que no entran al MVP

- **F2-13.** Reportes armados por el usuario, eligiendo variables a cruzar.
- **F2-14.** Proyecciones del Comité a partir del histórico de eventos.
- **F2-15.** Métricas de clics en el calendario público.
- **F2-16.** Correo masivo con archivos adjuntos a los inscritos de un sub-evento.
- **F2-17.** Preguntas frecuentes editables, boletines en la portada, banners institucionales y un canal de soporte dentro de la plataforma.
- **F2-18.** Módulo de peticiones, quejas, reclamos y sugerencias (PQRS).
- **F2-19.** Exportación del calendario a iCal (.ics).
- **F2-20.** Conexión futura con el CRM del SENA y con herramientas de inteligencia de negocio (Power BI o Tableau), en modo lectura sobre el modelo de datos.

---

## 7. Fuera de alcance

Estas capacidades no están en el MVP ni en la Fase 2:

- Validación de QR sin internet, cola offline o sincronización posterior.
- Registro de salida y cualquier regla de reingreso. El QR es de un solo uso.
- Recolección de firmas digitales, en pantalla o con validez jurídica. La confirmación de asistencia es el escaneo del QR (o el registro manual y el walk-in descritos en RF-59 y RF-61).
- Creación de salas de videollamada dentro del sistema. La cita virtual solo guarda el enlace que pega el Proveedor.
- Pasarela de pagos, boletería y almacenamiento de datos financieros.
- Estados de evento distintos de Borrador, Aprobado, Publicado y Cancelado.
