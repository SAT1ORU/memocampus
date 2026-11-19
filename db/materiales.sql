-- ============================================================
-- MEMOCAMPUS — Sistema de Materiales (Phase 2)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.materiales (
    id            SERIAL PRIMARY KEY,
    docente_id    INT NOT NULL REFERENCES public.usuarios(id),
    grupo_id      INT NOT NULL REFERENCES public.grupos(id),
    nombre        TEXT NOT NULL,
    tipo          TEXT NOT NULL CHECK (tipo IN ('PDF', 'Enlace', 'Video', 'Presentación', 'Otro')),
    archivo_url   TEXT,
    fecha_creada  TIMESTAMPTZ NOT NULL DEFAULT now(),
    fecha_subida  DATE NOT NULL DEFAULT CURRENT_DATE
);

-- RLS: habilitar seguridad a nivel de fila
ALTER TABLE public.materiales ENABLE ROW LEVEL SECURITY;

-- RLS: estudiantes ven solo materiales de su grupo
DROP POLICY IF EXISTS "estudiantes_ven_materiales_grupo" ON public.materiales;
CREATE POLICY "estudiantes_ven_materiales_grupo"
ON public.materiales FOR SELECT
USING (
    grupo_id IN (
        SELECT grupo_id FROM public.estudiantes
        WHERE usuario_id = public.mc_usuario_id()
    )
);

-- RLS: docentes ven solo sus materiales
DROP POLICY IF EXISTS "docentes_ven_sus_materiales" ON public.materiales;
CREATE POLICY "docentes_ven_sus_materiales"
ON public.materiales FOR SELECT
USING (docente_id = public.mc_usuario_id());

-- RLS: docentes insertan materiales para sus grupos
DROP POLICY IF EXISTS "docentes_insertan_materiales" ON public.materiales;
CREATE POLICY "docentes_insertan_materiales"
ON public.materiales FOR INSERT
TO authenticated
WITH CHECK (
    docente_id = public.mc_usuario_id()
    AND EXISTS (
        SELECT 1 FROM public.asignaciones
        WHERE docente_id = public.mc_usuario_id()
          AND grupo_id = materiales.grupo_id
    )
);

-- RLS: docentes actualizan sus propios materiales
DROP POLICY IF EXISTS "docentes_actualizan_materiales" ON public.materiales;
CREATE POLICY "docentes_actualizan_materiales"
ON public.materiales FOR UPDATE
USING (docente_id = public.mc_usuario_id());

-- RLS: docentes eliminan sus propios materiales
DROP POLICY IF EXISTS "docentes_eliminan_materiales" ON public.materiales;
CREATE POLICY "docentes_eliminan_materiales"
ON public.materiales FOR DELETE
USING (docente_id = public.mc_usuario_id());
