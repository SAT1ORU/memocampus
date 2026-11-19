-- ============================================================
-- Mensajería directa padre <-> docente (solo texto, sin tiempo real)
-- Ejecutar en Supabase > SQL Editor. Idempotente.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.mensajes (
    id               BIGSERIAL PRIMARY KEY,
    de_usuario_id   INT NOT NULL REFERENCES public.usuarios(id),
    para_usuario_id INT NOT NULL REFERENCES public.usuarios(id),
    contenido        TEXT NOT NULL CHECK (length(trim(contenido)) > 0),
    creado_en        TIMESTAMPTZ NOT NULL DEFAULT now(),
    leido            BOOLEAN NOT NULL DEFAULT false
);

ALTER TABLE public.mensajes ADD COLUMN IF NOT EXISTS leido BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.mensajes ENABLE ROW LEVEL SECURITY;

-- Marcar como leído: el destinatario solo puede cambiar la columna "leido"
REVOKE UPDATE ON public.mensajes FROM authenticated;
GRANT UPDATE (leido) ON public.mensajes TO authenticated;
DROP POLICY IF EXISTS mensajes_update_leido_destinatario ON public.mensajes;
CREATE POLICY mensajes_update_leido_destinatario ON public.mensajes FOR UPDATE TO authenticated
USING (para_usuario_id = (SELECT id FROM public.usuarios WHERE lower(correo) = lower(auth.jwt() ->> 'email') AND activo))
WITH CHECK (para_usuario_id = (SELECT id FROM public.usuarios WHERE lower(correo) = lower(auth.jwt() ->> 'email') AND activo));

-- Ver: solo mensajes donde soy remitente o destinatario
DROP POLICY IF EXISTS mensajes_select_participante ON public.mensajes;
CREATE POLICY mensajes_select_participante ON public.mensajes FOR SELECT TO authenticated
USING (
    de_usuario_id = (SELECT id FROM public.usuarios WHERE lower(correo) = lower(auth.jwt() ->> 'email') AND activo)
    OR para_usuario_id = (SELECT id FROM public.usuarios WHERE lower(correo) = lower(auth.jwt() ->> 'email') AND activo)
);

-- Enviar: solo como yo mismo, y solo entre un padre y un docente
-- que tengan un vínculo real (el hijo del padre está en un grupo que el docente dicta).
DROP POLICY IF EXISTS mensajes_insert_padre_docente ON public.mensajes;
CREATE POLICY mensajes_insert_padre_docente ON public.mensajes FOR INSERT TO authenticated
WITH CHECK (
    de_usuario_id = (SELECT id FROM public.usuarios WHERE lower(correo) = lower(auth.jwt() ->> 'email') AND activo)
    AND EXISTS (
        SELECT 1
        FROM public.padres_estudiantes pe
        JOIN public.estudiantes e ON e.id = pe.estudiante_id
        JOIN public.asignaciones a ON a.grupo_id = e.grupo_id
        WHERE (pe.padre_id = public.mensajes.de_usuario_id AND a.docente_id = public.mensajes.para_usuario_id)
           OR (a.docente_id = public.mensajes.de_usuario_id AND pe.padre_id = public.mensajes.para_usuario_id)
    )
);

CREATE INDEX IF NOT EXISTS mensajes_de_idx   ON public.mensajes (de_usuario_id, creado_en);
CREATE INDEX IF NOT EXISTS mensajes_para_idx ON public.mensajes (para_usuario_id, creado_en);
