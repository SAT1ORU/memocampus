-- ============================================================
-- MEMOCAMPUS — Esquema de base de datos (PostgreSQL / Supabase)
-- Fase 1: estructura para dashboards de notas, asistencia,
-- alertas a padres, encuesta de ánimo y apartado de rectoría.
--
-- AVISO: los datos generados por db/seed_generator.py son FICTICIOS.
-- ============================================================

-- ---------- Roles de usuario del sistema ----------
-- rectoria incluye el apartado psicológico (decisión del colegio).
CREATE TYPE rol_usuario AS ENUM ('estudiante', 'padre', 'docente', 'coordinacion', 'rectoria');
CREATE TYPE estado_asistencia AS ENUM ('presente', 'ausente', 'tardanza', 'excusa');
CREATE TYPE nivel_animo AS ENUM ('muy_bien', 'bien', 'regular', 'mal', 'muy_mal');
CREATE TYPE estado_caso AS ENUM ('abierto', 'en_seguimiento', 'remitido', 'cerrado');

-- ---------- Usuarios (vinculados a la cuenta institucional de Google) ----------
CREATE TABLE usuarios (
    id            SERIAL PRIMARY KEY,
    correo        TEXT UNIQUE NOT NULL,          -- correo institucional o de padre
    nombre        TEXT NOT NULL,
    rol           rol_usuario NOT NULL,
    activo        BOOLEAN NOT NULL DEFAULT TRUE,
    creado_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Estructura académica ----------
CREATE TABLE grupos (
    id       SERIAL PRIMARY KEY,
    grado    SMALLINT NOT NULL,                  -- 6 a 11
    seccion  CHAR(1) NOT NULL,                   -- A, B, ...
    anio     SMALLINT NOT NULL DEFAULT 2026,
    UNIQUE (grado, seccion, anio)
);

CREATE TABLE materias (
    id      SERIAL PRIMARY KEY,
    nombre  TEXT UNIQUE NOT NULL
);

-- Qué docente dicta qué materia a qué grupo
CREATE TABLE asignaciones (
    id          SERIAL PRIMARY KEY,
    grupo_id    INT NOT NULL REFERENCES grupos(id),
    materia_id  INT NOT NULL REFERENCES materias(id),
    docente_id  INT NOT NULL REFERENCES usuarios(id),
    UNIQUE (grupo_id, materia_id)
);

-- ---------- Estudiantes y familias ----------
CREATE TABLE estudiantes (
    id            SERIAL PRIMARY KEY,
    seudonimo     TEXT UNIQUE NOT NULL,          -- ID que se usa en reportes y con la IA
    nombre        TEXT NOT NULL,                 -- dato identificable: no se envía a servicios de IA
    grupo_id      INT NOT NULL REFERENCES grupos(id),
    usuario_id    INT UNIQUE REFERENCES usuarios(id)  -- cuenta del estudiante, si la tiene
);

-- Relación padre–hijo: un padre solo ve a los hijos vinculados aquí
CREATE TABLE padres_estudiantes (
    padre_id       INT NOT NULL REFERENCES usuarios(id),
    estudiante_id  INT NOT NULL REFERENCES estudiantes(id),
    PRIMARY KEY (padre_id, estudiante_id)
);

-- ---------- Académico ----------
CREATE TABLE asistencia (
    estudiante_id  INT NOT NULL REFERENCES estudiantes(id),
    materia_id     INT NOT NULL REFERENCES materias(id),
    fecha          DATE NOT NULL,
    estado         estado_asistencia NOT NULL,
    PRIMARY KEY (estudiante_id, materia_id, fecha)
);

CREATE TABLE notas (
    estudiante_id  INT NOT NULL REFERENCES estudiantes(id),
    materia_id     INT NOT NULL REFERENCES materias(id),
    periodo        SMALLINT NOT NULL CHECK (periodo BETWEEN 1 AND 4),
    ser            NUMERIC(2,1) NOT NULL CHECK (ser  BETWEEN 0 AND 5),
    saber          NUMERIC(2,1) NOT NULL CHECK (saber BETWEEN 0 AND 5),
    hacer          NUMERIC(2,1) NOT NULL CHECK (hacer BETWEEN 0 AND 5),
    -- Ponderación oficial de la plataforma: Ser 30% · Saber 40% · Hacer 30%
    final          NUMERIC(3,2) GENERATED ALWAYS AS
                     (ROUND(ser*0.30 + saber*0.40 + hacer*0.30, 2)) STORED,
    PRIMARY KEY (estudiante_id, materia_id, periodo)
);

-- Umbral de nota baja usado por las alertas (ver tabla parametros)
CREATE TABLE parametros (
    clave  TEXT PRIMARY KEY,
    valor  NUMERIC NOT NULL
);
INSERT INTO parametros (clave, valor) VALUES
    ('nota_minima_aprobatoria', 3.0),
    ('max_inasistencias_alerta', 4);   -- faltas por periodo antes de alertar

-- ---------- Bienestar emocional ----------
-- Respuestas individuales: SOLO rectoría (apartado psicológico).
-- Los docentes consultan la vista agregada vw_animo_grupo.
CREATE TABLE encuestas_animo (
    id             SERIAL PRIMARY KEY,
    estudiante_id  INT NOT NULL REFERENCES estudiantes(id),
    semana        DATE NOT NULL,                 -- lunes de la semana respondida
    animo          nivel_animo NOT NULL,
    comentario     TEXT,                         -- texto libre, dato sensible
    requiere_atencion BOOLEAN NOT NULL DEFAULT FALSE,  -- activa protocolo, no alerta a padres
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (estudiante_id, semana)
);

CREATE TABLE casos_psicologicos (
    id             SERIAL PRIMARY KEY,
    estudiante_id  INT NOT NULL REFERENCES estudiantes(id),
    origen         TEXT NOT NULL,                -- encuesta, docente, coordinación, etc.
    estado         estado_caso NOT NULL DEFAULT 'abierto',
    notas          TEXT,                         -- datos clínicos: solo rectoría
    abierto_en     TIMESTAMPTZ NOT NULL DEFAULT now(),
    cerrado_en     TIMESTAMPTZ
);

-- ---------- Alertas enviadas ----------
CREATE TABLE alertas (
    id             SERIAL PRIMARY KEY,
    estudiante_id  INT NOT NULL REFERENCES estudiantes(id),
    tipo           TEXT NOT NULL CHECK (tipo IN ('nota_baja', 'inasistencias')),
    detalle        TEXT NOT NULL,                -- explicación con reglas, no generada por IA
    enviada_a_padres BOOLEAN NOT NULL DEFAULT FALSE,
    creada_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Auditoría de acceso a datos sensibles ----------
CREATE TABLE accesos_log (
    id          BIGSERIAL PRIMARY KEY,
    usuario_id  INT NOT NULL REFERENCES usuarios(id),
    recurso     TEXT NOT NULL,                   -- ej. 'casos_psicologicos:12'
    accion      TEXT NOT NULL,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------- Vistas agregadas ----------
-- Lo que ve un docente de la encuesta de ánimo: solo conteos por grupo,
-- nunca respuestas individuales ni comentarios.
CREATE VIEW vw_animo_grupo AS
SELECT g.id AS grupo_id, e_s.semana, e_s.animo, COUNT(*) AS total
FROM encuestas_animo e_s
JOIN estudiantes e ON e.id = e_s.estudiante_id
JOIN grupos g ON g.id = e.grupo_id
GROUP BY g.id, e_s.semana, e_s.animo;

-- Promedio de notas y porcentaje de asistencia por grupo y materia (dashboard docente)
CREATE VIEW vw_resumen_grupo AS
SELECT
    e.grupo_id,
    n.materia_id,
    n.periodo,
    ROUND(AVG(n.final), 2) AS promedio,
    SUM(CASE WHEN n.final < p.valor THEN 1 ELSE 0 END) AS notas_bajas,
    COUNT(*) AS estudiantes
FROM notas n
JOIN estudiantes e ON e.id = n.estudiante_id
CROSS JOIN parametros p
WHERE p.clave = 'nota_minima_aprobatoria'
GROUP BY e.grupo_id, n.materia_id, n.periodo;

CREATE VIEW vw_asistencia_grupo AS
SELECT
    e.grupo_id,
    a.materia_id,
    ROUND(100.0 * SUM(CASE WHEN a.estado IN ('presente', 'tardanza') THEN 1 ELSE 0 END)
          / COUNT(*), 1) AS porcentaje_asistencia,
    COUNT(*) FILTER (WHERE a.estado = 'ausente') AS ausencias
FROM asistencia a
JOIN estudiantes e ON e.id = a.estudiante_id
GROUP BY e.grupo_id, a.materia_id;
