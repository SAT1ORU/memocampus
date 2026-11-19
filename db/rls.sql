-- MEMOCAMPUS — Row Level Security
-- Acceso por correo autenticado; no usa service_role en el frontend.
-- Las cuentas de demostración no sustituyen una sesión Auth real.

CREATE OR REPLACE FUNCTION public.mc_usuario_id()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.usuarios
  WHERE lower(correo) = lower(coalesce(auth.jwt() ->> 'email', ''))
    AND activo = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.mc_tiene_rol(roles public.rol_usuario[])
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.usuarios
    WHERE id = public.mc_usuario_id()
      AND rol = ANY(roles)
      AND activo = true
  );
$$;

REVOKE ALL ON FUNCTION public.mc_usuario_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mc_tiene_rol(public.rol_usuario[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mc_usuario_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.mc_tiene_rol(public.rol_usuario[]) TO authenticated;

ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materias ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asignaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estudiantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.padres_estudiantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asistencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parametros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encuestas_animo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.casos_psicologicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accesos_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS usuarios_select_self_or_staff ON public.usuarios;
CREATE POLICY usuarios_select_self_or_staff ON public.usuarios FOR SELECT TO authenticated
USING (id = public.mc_usuario_id() OR public.mc_tiene_rol(ARRAY['coordinacion','rectoria']::public.rol_usuario[]) OR (public.mc_tiene_rol(ARRAY['docente']::public.rol_usuario[]) AND rol = 'padre') OR (public.mc_tiene_rol(ARRAY['padre']::public.rol_usuario[]) AND rol = 'docente'));

DROP POLICY IF EXISTS grupos_select_authenticated ON public.grupos;
CREATE POLICY grupos_select_authenticated ON public.grupos FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS materias_select_authenticated ON public.materias;
CREATE POLICY materias_select_authenticated ON public.materias FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS asignaciones_select_authenticated ON public.asignaciones;
CREATE POLICY asignaciones_select_authenticated ON public.asignaciones FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS estudiantes_select_scoped ON public.estudiantes;
CREATE POLICY estudiantes_select_scoped ON public.estudiantes FOR SELECT TO authenticated
USING (
  usuario_id = public.mc_usuario_id()
  OR EXISTS (SELECT 1 FROM public.padres_estudiantes pe WHERE pe.estudiante_id = estudiantes.id AND pe.padre_id = public.mc_usuario_id())
  OR public.mc_tiene_rol(ARRAY['docente','coordinacion','rectoria']::public.rol_usuario[])
);

DROP POLICY IF EXISTS padres_estudiantes_select_scoped ON public.padres_estudiantes;
CREATE POLICY padres_estudiantes_select_scoped ON public.padres_estudiantes FOR SELECT TO authenticated
USING (padre_id = public.mc_usuario_id() OR public.mc_tiene_rol(ARRAY['docente','coordinacion','rectoria']::public.rol_usuario[]));

DROP POLICY IF EXISTS notas_select_scoped ON public.notas;
CREATE POLICY notas_select_scoped ON public.notas FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.estudiantes e WHERE e.id = notas.estudiante_id AND e.usuario_id = public.mc_usuario_id())
  OR EXISTS (SELECT 1 FROM public.padres_estudiantes pe WHERE pe.estudiante_id = notas.estudiante_id AND pe.padre_id = public.mc_usuario_id())
  OR public.mc_tiene_rol(ARRAY['docente','coordinacion','rectoria']::public.rol_usuario[])
);

DROP POLICY IF EXISTS notas_update_docente ON public.notas;
CREATE POLICY notas_update_docente ON public.notas FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.asignaciones a
    JOIN public.estudiantes e ON a.grupo_id = e.grupo_id
    WHERE a.docente_id = public.mc_usuario_id()
      AND a.materia_id = notas.materia_id
      AND e.id = notas.estudiante_id
  )
  OR public.mc_tiene_rol(ARRAY['coordinacion','rectoria']::public.rol_usuario[])
);

DROP POLICY IF EXISTS notas_insert_docente ON public.notas;
CREATE POLICY notas_insert_docente ON public.notas FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.asignaciones a
    JOIN public.estudiantes e ON a.grupo_id = e.grupo_id
    WHERE a.docente_id = public.mc_usuario_id()
      AND a.materia_id = notas.materia_id
      AND e.id = notas.estudiante_id
  )
  OR public.mc_tiene_rol(ARRAY['coordinacion','rectoria']::public.rol_usuario[])
);

DROP POLICY IF EXISTS asistencia_select_scoped ON public.asistencia;
CREATE POLICY asistencia_select_scoped ON public.asistencia FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.estudiantes e WHERE e.id = asistencia.estudiante_id AND e.usuario_id = public.mc_usuario_id())
  OR EXISTS (SELECT 1 FROM public.padres_estudiantes pe WHERE pe.estudiante_id = asistencia.estudiante_id AND pe.padre_id = public.mc_usuario_id())
  OR public.mc_tiene_rol(ARRAY['docente','coordinacion','rectoria']::public.rol_usuario[])
);

DROP POLICY IF EXISTS asistencia_insert_docente ON public.asistencia;
CREATE POLICY asistencia_insert_docente ON public.asistencia FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.asignaciones a
    JOIN public.estudiantes e ON a.grupo_id = e.grupo_id
    WHERE a.docente_id = public.mc_usuario_id()
      AND a.materia_id = asistencia.materia_id
      AND e.id = asistencia.estudiante_id
  )
  OR public.mc_tiene_rol(ARRAY['coordinacion','rectoria']::public.rol_usuario[])
);

DROP POLICY IF EXISTS asistencia_update_docente ON public.asistencia;
CREATE POLICY asistencia_update_docente ON public.asistencia FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.asignaciones a
    JOIN public.estudiantes e ON a.grupo_id = e.grupo_id
    WHERE a.docente_id = public.mc_usuario_id()
      AND a.materia_id = asistencia.materia_id
      AND e.id = asistencia.estudiante_id
  )
  OR public.mc_tiene_rol(ARRAY['coordinacion','rectoria']::public.rol_usuario[])
);

DROP POLICY IF EXISTS parametros_select_staff ON public.parametros;
CREATE POLICY parametros_select_staff ON public.parametros FOR SELECT TO authenticated
USING (public.mc_tiene_rol(ARRAY['docente','coordinacion','rectoria']::public.rol_usuario[]));

DROP POLICY IF EXISTS encuestas_animo_select_scoped ON public.encuestas_animo;
CREATE POLICY encuestas_animo_select_scoped ON public.encuestas_animo FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.estudiantes e WHERE e.id = encuestas_animo.estudiante_id AND e.usuario_id = public.mc_usuario_id())
  OR EXISTS (SELECT 1 FROM public.padres_estudiantes pe WHERE pe.estudiante_id = encuestas_animo.estudiante_id AND pe.padre_id = public.mc_usuario_id())
  OR public.mc_tiene_rol(ARRAY['coordinacion','rectoria']::public.rol_usuario[])
  OR (
    requiere_atencion = true
    AND public.mc_tiene_rol(ARRAY['docente']::public.rol_usuario[])
    AND EXISTS (
      SELECT 1 FROM public.estudiantes e
      JOIN public.asignaciones a ON a.grupo_id = e.grupo_id
      WHERE e.id = encuestas_animo.estudiante_id AND a.docente_id = public.mc_usuario_id()
    )
  )
);

-- Conteos anónimos por grupo para el docente asignado (sin estudiante ni comentario)
CREATE OR REPLACE FUNCTION public.animo_grupo_semanal(p_grupo_id INT)
RETURNS TABLE (semana DATE, animo public.nivel_animo, total BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e_s.semana, e_s.animo, COUNT(*)
  FROM public.encuestas_animo e_s
  JOIN public.estudiantes e ON e.id = e_s.estudiante_id
  WHERE e.grupo_id = p_grupo_id
    AND EXISTS (SELECT 1 FROM public.asignaciones a WHERE a.grupo_id = p_grupo_id AND a.docente_id = public.mc_usuario_id())
  GROUP BY e_s.semana, e_s.animo;
$$;
REVOKE ALL ON FUNCTION public.animo_grupo_semanal(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.animo_grupo_semanal(INT) TO authenticated;

DROP POLICY IF EXISTS casos_psicologicos_select_rectoria ON public.casos_psicologicos;
CREATE POLICY casos_psicologicos_select_rectoria ON public.casos_psicologicos FOR SELECT TO authenticated
USING (public.mc_tiene_rol(ARRAY['rectoria']::public.rol_usuario[]));

DROP POLICY IF EXISTS casos_psicologicos_insert_docente ON public.casos_psicologicos;
CREATE POLICY casos_psicologicos_insert_docente ON public.casos_psicologicos FOR INSERT TO authenticated
WITH CHECK (
  public.mc_tiene_rol(ARRAY['docente']::public.rol_usuario[])
  AND origen = 'docente'
  AND EXISTS (
    SELECT 1 FROM public.estudiantes e
    JOIN public.asignaciones a ON a.grupo_id = e.grupo_id
    WHERE e.id = casos_psicologicos.estudiante_id
      AND a.docente_id = public.mc_usuario_id()
  )
);

DROP POLICY IF EXISTS alertas_select_scoped ON public.alertas;
CREATE POLICY alertas_select_scoped ON public.alertas FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.estudiantes e WHERE e.id = alertas.estudiante_id AND e.usuario_id = public.mc_usuario_id())
  OR EXISTS (SELECT 1 FROM public.padres_estudiantes pe WHERE pe.estudiante_id = alertas.estudiante_id AND pe.padre_id = public.mc_usuario_id() AND alertas.enviada_a_padres = true)
  OR public.mc_tiene_rol(ARRAY['docente','coordinacion','rectoria']::public.rol_usuario[])
);

DROP POLICY IF EXISTS accesos_log_select_staff ON public.accesos_log;
CREATE POLICY accesos_log_select_staff ON public.accesos_log FOR SELECT TO authenticated
USING (public.mc_tiene_rol(ARRAY['coordinacion','rectoria']::public.rol_usuario[]));

-- Derivación a psicología: valida que el docente sea de su grupo y limpia la alerta activa.
CREATE OR REPLACE FUNCTION public.derivar_estudiante(p_estudiante_id INT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.mc_tiene_rol(ARRAY['docente']::public.rol_usuario[]) THEN
    RAISE EXCEPTION 'Solo docentes pueden derivar casos';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.estudiantes e
    JOIN public.asignaciones a ON a.grupo_id = e.grupo_id
    WHERE e.id = p_estudiante_id AND a.docente_id = public.mc_usuario_id()
  ) THEN
    RAISE EXCEPTION 'El estudiante no pertenece a tus grupos';
  END IF;
  INSERT INTO public.casos_psicologicos (estudiante_id, origen) VALUES (p_estudiante_id, 'docente');
  UPDATE public.encuestas_animo SET requiere_atencion = false
  WHERE estudiante_id = p_estudiante_id AND requiere_atencion = true;
END;
$$;
REVOKE ALL ON FUNCTION public.derivar_estudiante(INT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.derivar_estudiante(INT) TO authenticated;

-- Sin políticas INSERT/UPDATE/DELETE para el cliente: las escrituras requieren backend seguro.
