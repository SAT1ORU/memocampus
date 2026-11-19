-- ============================================================
-- MEMOCAMPUS — Sistema de Tareas (Phase 2)
-- ============================================================

CREATE TABLE tareas (
    id            SERIAL PRIMARY KEY,
    docente_id    INT NOT NULL REFERENCES usuarios(id),
    grupo_id      INT NOT NULL REFERENCES grupos(id),
    titulo        TEXT NOT NULL,
    descripcion   TEXT,
    fecha_creada  TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_entrega DATE NOT NULL,
    tipo_entrega  TEXT CHECK (tipo_entrega IN ('archivo', 'texto', 'enlace')) DEFAULT 'archivo'
);

CREATE TABLE entregas (
    id            SERIAL PRIMARY KEY,
    tarea_id      INT NOT NULL REFERENCES tareas(id) ON DELETE CASCADE,
    estudiante_id INT NOT NULL REFERENCES estudiantes(id),
    contenido     TEXT,
    archivo_url   TEXT,
    fecha_entrega TIMESTAMPTZ NOT NULL DEFAULT now(),
    calificacion  NUMERIC(2,1),
    UNIQUE (tarea_id, estudiante_id)
);

-- Tabla de notificaciones (para padre/alertas)
CREATE TABLE notificaciones (
    id            SERIAL PRIMARY KEY,
    padre_id      INT NOT NULL REFERENCES usuarios(id),
    estudiante_id INT NOT NULL REFERENCES estudiantes(id),
    tipo          TEXT NOT NULL,
    mensaje       TEXT NOT NULL,
    leida         BOOLEAN DEFAULT FALSE,
    creada_en     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger: cuando se registra inasistencia, generar notificación al padre
CREATE OR REPLACE FUNCTION notificar_inasistencia()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO notificaciones (padre_id, estudiante_id, tipo, mensaje)
    SELECT p.id, NEW.estudiante_id, 'inasistencia',
           'Tu hijo/a tuvo ausencia en ' || m.nombre || ' el ' || NEW.fecha::text
    FROM padres_estudiantes p
    JOIN materias m ON m.id = NEW.materia_id
    WHERE p.estudiante_id = NEW.estudiante_id
      AND NEW.estado = 'ausente';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_inasistencia
AFTER INSERT ON asistencia
FOR EACH ROW
EXECUTE FUNCTION notificar_inasistencia();

-- RLS: estudiantes ven solo tareas de su grupo
CREATE POLICY "estudiantes_ven_tareas_grupo"
ON tareas FOR SELECT
USING (
    grupo_id IN (
        SELECT grupo_id FROM estudiantes
        WHERE usuario_id = (SELECT id FROM usuarios WHERE correo = auth.email())
    )
);

-- RLS: docentes ven solo sus tareas
CREATE POLICY "docentes_ven_sus_tareas"
ON tareas FOR SELECT
USING (docente_id = (SELECT id FROM usuarios WHERE correo = auth.email()));

-- RLS: padres ven entregas de sus hijos
CREATE POLICY "padres_ven_entregas_hijos"
ON entregas FOR SELECT
USING (
    estudiante_id IN (
        SELECT estudiante_id FROM padres_estudiantes
        WHERE padre_id = (SELECT id FROM usuarios WHERE correo = auth.email())
    )
);

-- RLS: estudiantes ven solo sus entregas
CREATE POLICY "estudiantes_ven_sus_entregas"
ON entregas FOR SELECT
USING (
    estudiante_id IN (
        SELECT id FROM estudiantes
        WHERE usuario_id = (SELECT id FROM usuarios WHERE correo = auth.email())
    )
);

-- RLS: padres ven notificaciones suyas
CREATE POLICY "padres_ven_notificaciones"
ON notificaciones FOR SELECT
USING (padre_id = (SELECT id FROM usuarios WHERE correo = auth.email()));
