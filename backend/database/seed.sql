-- Datos de demostración. Contraseña de todos los usuarios: FondoEmprender2026
-- El valor almacenado es un hash bcrypt ($2b$, costo 10). No guardar la clave en claro.

USE fondo_emprender;

INSERT INTO usuarios (id, nombre, correo, clave_hash, rol, identificacion, telefono) VALUES
    (1, 'Administrador Plataforma', 'admin@fondoemprender.sena.edu.co', '$2b$10$Sq17XHcMtk0d38QS9nImNOdza0uEugYLLRzIvRgrS1mB35jtYVLRa', 'ADMIN', '1000000001', '3000000001'),
    (2, 'Comité Directivo', 'comite@fondoemprender.sena.edu.co', '$2b$10$Sq17XHcMtk0d38QS9nImNOdza0uEugYLLRzIvRgrS1mB35jtYVLRa', 'COMITE', '1000000002', '3000000002'),
    (3, 'Operador Logístico', 'logistica@fondoemprender.sena.edu.co', '$2b$10$Sq17XHcMtk0d38QS9nImNOdza0uEugYLLRzIvRgrS1mB35jtYVLRa', 'LOGISTICO', '1000000003', '3000000003'),
    (4, 'Ana Lucía Gómez', 'proveedor@fondoemprender.sena.edu.co', '$2b$10$Sq17XHcMtk0d38QS9nImNOdza0uEugYLLRzIvRgrS1mB35jtYVLRa', 'PROVEEDOR', '1000000004', '3000000004'),
    (5, 'Carlos Andrés Mendoza', 'comprador@fondoemprender.sena.edu.co', '$2b$10$Sq17XHcMtk0d38QS9nImNOdza0uEugYLLRzIvRgrS1mB35jtYVLRa', 'COMPRADOR', '1000000005', '3000000005'),
    (6, 'María Camila Rodríguez', 'asistente@soy.sena.edu.co', '$2b$10$Sq17XHcMtk0d38QS9nImNOdza0uEugYLLRzIvRgrS1mB35jtYVLRa', 'ASISTENTE', '1098765432', '3000000006');

INSERT INTO perfiles_empresa (usuario_id, nit, razon_social, sector_economico, portafolio_pdf_url) VALUES
    (4, '901234567-1', 'AgroVerde SENA', 'Negocios verdes', NULL),
    (5, '900111222-3', 'Comercial Andina SAS', 'Compras institucionales', NULL);

INSERT INTO eventos (
    id, titulo, descripcion, categoria, modalidad, estado, lugar, imagen_url,
    aforo_maximo, fecha_inicio, fecha_fin, presupuesto_cop, creado_por
) VALUES
    (
        1,
        'Macro Macrorrueda de Negocios Fondo Emprender 2026',
        'Espacio de emparejamiento comercial entre emprendedores SENA y compradores nacionales del sector agroindustrial y tecnológico.',
        'RUEDA',
        'PRESENCIAL',
        'APROBADO',
        'Centro de Convenciones SENA - Bogotá',
        'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&auto=format&fit=crop&q=80',
        200,
        '2026-10-15 08:00:00',
        '2026-10-15 17:00:00',
        25000000.00,
        1
    ),
    (
        2,
        'Convocatoria Abierta: Economía Verde y Sostenibilidad',
        'Presentación de bases de postulación para capital semilla de proyectos de innovación ambiental e impacto social regional.',
        'CONVOCATORIA',
        'HIBRIDO',
        'APROBADO',
        'Auditorio Central Complejo Paloquemao / Vía Teams',
        'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=600&auto=format&fit=crop&q=80',
        100,
        '2026-10-22 10:00:00',
        '2026-10-22 12:30:00',
        8000000.00,
        1
    ),
    (
        3,
        'Taller Práctico: Modelado de Negocios CANVAS para Emprendedores',
        'Capacitación intensiva para estructurar la propuesta de valor y canales de distribución con mentores del Fondo Emprender.',
        'TALLER',
        'VIRTUAL',
        'APROBADO',
        'Plataforma SENA Territorium / Zoom',
        'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?w=600&auto=format&fit=crop&q=80',
        300,
        '2026-11-05 14:00:00',
        '2026-11-05 18:00:00',
        4500000.00,
        1
    ),
    (
        4,
        'Foro Internacional de Innovación y Tecnología Aplicada',
        'Encuentro con ponentes internacionales sobre automatización, IA en agrotech y transformación digital de PyMES.',
        'CONFERENCIA',
        'PRESENCIAL',
        'APROBADO',
        'Sede Tecnoparque SENA Cazucá',
        'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=600&auto=format&fit=crop&q=80',
        150,
        '2026-11-18 09:00:00',
        '2026-11-18 16:00:00',
        12000000.00,
        1
    );

INSERT INTO historial_aprobaciones (evento_id, usuario_id, estado_anterior, estado_nuevo, observacion) VALUES
    (1, 2, 'PENDIENTE_APROBACION', 'APROBADO', 'Aprobado por el comité directivo para el calendario público.'),
    (2, 2, 'PENDIENTE_APROBACION', 'APROBADO', 'Aprobado por el comité directivo para el calendario público.'),
    (3, 2, 'PENDIENTE_APROBACION', 'APROBADO', 'Aprobado por el comité directivo para el calendario público.'),
    (4, 2, 'PENDIENTE_APROBACION', 'APROBADO', 'Aprobado por el comité directivo para el calendario público.');

INSERT INTO citas_negocio (evento_id, comprador_id, proveedor_id, fecha_hora, estado, mesa_stand) VALUES
    (1, 5, 4, '2026-10-15 09:00:00', 'CONFIRMADA', 'A-01');

INSERT INTO inscripciones_asistencia (evento_id, usuario_id, perfil_registro, codigo_qr, estado_asistencia, fecha_ingreso) VALUES
    (1, 4, 'EMPRENDEDOR_SENA', 'FE-SENA-100001', 'INSCRITO', NULL),
    (1, 5, 'COMPRADOR', 'FE-SENA-100002', 'INSCRITO', NULL),
    (1, 6, 'APRENDIZ', 'FE-SENA-100003', 'INSCRITO', NULL),
    (2, 6, 'PUBLICO_GENERAL', 'FE-SENA-100004', 'INSCRITO', NULL),
    (4, 6, 'APRENDIZ', 'FE-SENA-100005', 'ASISTIO', '2026-11-18 09:12:00');
