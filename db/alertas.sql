-- ============================================================
-- MEMOCAMPUS — Reglas de alerta (auditables, sin IA)
-- Umbrales en la tabla parametros. Las alertas NO se envían a padres
-- desde aquí: solo se registran. El envío lo hace un proceso aparte.
-- ============================================================

CREATE OR REPLACE FUNCTION generar_alertas(p_periodo INT)
RETURNS INT
LANGUAGE plpgsql
AS $$
DECLARE
    v_nota_min   NUMERIC := (SELECT valor FROM parametros WHERE clave = 'nota_minima_aprobatoria');
    v_max_faltas NUMERIC := (SELECT valor FROM parametros WHERE clave = 'max_inasistencias_alerta');
    v_nuevas     INT := 0;
    v_otras      INT := 0;
BEGIN
    -- Regla 1: nota baja en dos o más materias en el periodo
    INSERT INTO alertas (estudiante_id, tipo, detalle)
    SELECT n.estudiante_id,
           'nota_baja',
           'Notas bajas (< ' || v_nota_min || ') en ' || COUNT(*) || ' materias, periodo ' || p_periodo
    FROM notas n
    WHERE n.periodo = p_periodo AND n.final < v_nota_min
    GROUP BY n.estudiante_id
    HAVING COUNT(*) >= 2
       AND NOT EXISTS (
           SELECT 1 FROM alertas a
           WHERE a.estudiante_id = n.estudiante_id
             AND a.tipo = 'nota_baja'
             AND a.detalle LIKE '%periodo ' || p_periodo
       );
    GET DIAGNOSTICS v_nuevas = ROW_COUNT;

    -- Regla 2: inasistencias por encima del umbral (total de ausencias en todas las materias)
    INSERT INTO alertas (estudiante_id, tipo, detalle)
    SELECT a.estudiante_id,
           'inasistencias',
           'Ausencias: ' || COUNT(*) || ' (umbral ' || v_max_faltas || ' por materia)'
    FROM asistencia a
    WHERE a.estado = 'ausente'
    GROUP BY a.estudiante_id, a.materia_id
    HAVING COUNT(*) > v_max_faltas
       AND NOT EXISTS (
           SELECT 1 FROM alertas al
           WHERE al.estudiante_id = a.estudiante_id
             AND al.tipo = 'inasistencias'
             AND al.creada_en > now() - interval '7 days'
       );
    GET DIAGNOSTICS v_otras = ROW_COUNT;

    RETURN v_nuevas + v_otras;
END;
$$;

-- Vista para la pantalla de alertas (solo estudiante, seudónimo, detalle)
CREATE OR REPLACE VIEW vw_alertas_pendientes AS
SELECT al.id, e.seudonimo, e.grupo_id, al.tipo, al.detalle, al.creada_en
FROM alertas al
JOIN estudiantes e ON e.id = al.estudiante_id
WHERE al.enviada_a_padres = FALSE;
