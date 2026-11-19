-- ============================================================
-- MEMOCAMPUS — Parche de permisos para tareas y notificaciones
-- Ejecutar después de db/tareas.sql
-- ============================================================

-- El trigger corre como el usuario que registra la asistencia (p. ej. docente),
-- que no tiene permiso de INSERT en notificaciones. SECURITY DEFINER lo resuelve.
CREATE OR REPLACE FUNCTION notificar_inasistencia()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO notificaciones (padre_id, estudiante_id, tipo, mensaje)
    SELECT p.id, NEW.estudiante_id, 'inasistencia',
           'Tu hijo/a tuvo ausencia en ' || m.nombre || ' el ' || NEW.fecha::text
    FROM padres_estudiantes pe
    JOIN usuarios p ON p.id = pe.padre_id
    JOIN materias m ON m.id = NEW.materia_id
    WHERE pe.estudiante_id = NEW.estudiante_id
      AND NEW.estado = 'ausente';
    RETURN NEW;
END;
$$;

-- Docentes: crear tareas propias
CREATE POLICY "docentes_crean_tareas" ON tareas FOR INSERT
WITH CHECK (docente_id = (SELECT id FROM usuarios WHERE correo = auth.email()));

-- Docentes: ver entregas de sus tareas
CREATE POLICY "docentes_ven_entregas_sus_tareas" ON entregas FOR SELECT
USING (tarea_id IN (
    SELECT id FROM tareas WHERE docente_id = (SELECT id FROM usuarios WHERE correo = auth.email())
));

-- Docentes: calificar entregas de sus tareas
CREATE POLICY "docentes_califican_entregas" ON entregas FOR UPDATE
USING (tarea_id IN (
    SELECT id FROM tareas WHERE docente_id = (SELECT id FROM usuarios WHERE correo = auth.email())
));
