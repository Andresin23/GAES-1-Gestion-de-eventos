-- Base de datos del Sistema de Gestión de Eventos - Fondo Emprender (GAES-1)
-- Motor: MySQL 8, InnoDB, utf8mb4

CREATE DATABASE IF NOT EXISTS fondo_emprender
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE fondo_emprender;

-- Usuarios y autenticación (RBAC)
CREATE TABLE usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(150) NOT NULL,
    clave_hash VARCHAR(255) NOT NULL,
    rol ENUM('ADMIN', 'COMITE', 'LOGISTICO', 'PROVEEDOR', 'COMPRADOR', 'ASISTENTE') NOT NULL,
    identificacion VARCHAR(20) NOT NULL,
    telefono VARCHAR(20),
    fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_usuarios_correo (correo),
    UNIQUE KEY uk_usuarios_identificacion (identificacion)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Perfiles de empresas / emprendimientos
CREATE TABLE perfiles_empresa (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    nit VARCHAR(20),
    razon_social VARCHAR(150),
    sector_economico VARCHAR(100),
    portafolio_pdf_url VARCHAR(255),
    UNIQUE KEY uk_perfiles_usuario (usuario_id),
    CONSTRAINT fk_perfiles_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Eventos institucionales
CREATE TABLE eventos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT,
    categoria ENUM('RUEDA', 'CONVOCATORIA', 'TALLER', 'CONFERENCIA') NOT NULL,
    modalidad ENUM('PRESENCIAL', 'VIRTUAL', 'HIBRIDO') NOT NULL,
    estado ENUM('BORRADOR', 'PENDIENTE_APROBACION', 'APROBADO', 'RECHAZADO', 'CANCELADO') NOT NULL DEFAULT 'BORRADOR',
    lugar VARCHAR(200),
    imagen_url VARCHAR(255),
    aforo_maximo INT NOT NULL,
    fecha_inicio DATETIME NOT NULL,
    fecha_fin DATETIME NOT NULL,
    presupuesto_cop DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    creado_por INT,
    CONSTRAINT fk_eventos_creado_por
        FOREIGN KEY (creado_por) REFERENCES usuarios(id),
    CONSTRAINT chk_eventos_fechas CHECK (fecha_fin > fecha_inicio),
    CONSTRAINT chk_eventos_aforo CHECK (aforo_maximo > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Auditoría del flujo de aprobación del comité
CREATE TABLE historial_aprobaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    evento_id INT NOT NULL,
    usuario_id INT NOT NULL,
    estado_anterior ENUM('BORRADOR', 'PENDIENTE_APROBACION', 'APROBADO', 'RECHAZADO', 'CANCELADO') NOT NULL,
    estado_nuevo ENUM('BORRADOR', 'PENDIENTE_APROBACION', 'APROBADO', 'RECHAZADO', 'CANCELADO') NOT NULL,
    observacion VARCHAR(500),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_historial_evento
        FOREIGN KEY (evento_id) REFERENCES eventos(id),
    CONSTRAINT fk_historial_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Rueda de negocios: citas entre comprador y proveedor
CREATE TABLE citas_negocio (
    id INT AUTO_INCREMENT PRIMARY KEY,
    evento_id INT NOT NULL,
    comprador_id INT NOT NULL,
    proveedor_id INT NOT NULL,
    fecha_hora DATETIME NOT NULL,
    estado ENUM('SOLICITADA', 'CONFIRMADA', 'RECHAZADA', 'CANCELADA', 'REALIZADA') NOT NULL DEFAULT 'SOLICITADA',
    mesa_stand VARCHAR(20),
    enlace_virtual VARCHAR(255),
    calificacion INT,
    CONSTRAINT fk_citas_evento
        FOREIGN KEY (evento_id) REFERENCES eventos(id),
    CONSTRAINT fk_citas_comprador
        FOREIGN KEY (comprador_id) REFERENCES usuarios(id),
    CONSTRAINT fk_citas_proveedor
        FOREIGN KEY (proveedor_id) REFERENCES usuarios(id),
    CONSTRAINT uk_cita_proveedor UNIQUE (evento_id, proveedor_id, fecha_hora),
    CONSTRAINT uk_cita_comprador UNIQUE (evento_id, comprador_id, fecha_hora),
    CONSTRAINT chk_citas_actores CHECK (comprador_id <> proveedor_id),
    CONSTRAINT chk_citas_calificacion CHECK (calificacion IS NULL OR calificacion BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Inscripción, pase QR y control de aforo
-- perfil_registro es el perfil del formulario público, distinto del rol RBAC de usuarios.
CREATE TABLE inscripciones_asistencia (
    id INT AUTO_INCREMENT PRIMARY KEY,
    evento_id INT NOT NULL,
    usuario_id INT NOT NULL,
    perfil_registro ENUM('EMPRENDEDOR_SENA', 'COMPRADOR', 'APRENDIZ', 'PUBLICO_GENERAL') NOT NULL,
    codigo_qr VARCHAR(255) NOT NULL,
    estado_asistencia ENUM('INSCRITO', 'ASISTIO', 'CANCELADO') NOT NULL DEFAULT 'INSCRITO',
    fecha_ingreso DATETIME,
    CONSTRAINT fk_inscripciones_evento
        FOREIGN KEY (evento_id) REFERENCES eventos(id),
    CONSTRAINT fk_inscripciones_usuario
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
    CONSTRAINT uk_inscripciones_qr UNIQUE (codigo_qr),
    CONSTRAINT uk_inscripciones_evento_usuario UNIQUE (evento_id, usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
