-- ============================================================
-- MEMOCAMPUS — Perfiles demo para iniciar sesión con Google
-- PLANTILLA: copia este archivo a db/usuarios_demo.sql (ignorado por Git),
-- reemplaza los marcadores por las cuentas de Google de prueba y
-- ejecútalo DESPUÉS de db/schema.sql y db/seed.sql.
-- ============================================================

-- Rectoría (incluye apartado psicológico)
INSERT INTO public.usuarios (correo, nombre, rol, activo)
VALUES ('CORREO_RECTORIA', 'Rectoría Demo', 'rectoria', TRUE)
ON CONFLICT (correo) DO UPDATE
SET nombre = EXCLUDED.nombre, rol = EXCLUDED.rol, activo = EXCLUDED.activo;

-- Docente demo
INSERT INTO public.usuarios (correo, nombre, rol, activo)
VALUES ('CORREO_DOCENTE', 'Docente Demo', 'docente', TRUE)
ON CONFLICT (correo) DO UPDATE
SET nombre = EXCLUDED.nombre, rol = EXCLUDED.rol, activo = EXCLUDED.activo;

-- Coordinación demo
INSERT INTO public.usuarios (correo, nombre, rol, activo)
VALUES ('CORREO_COORDINACION', 'Coordinación Demo', 'coordinacion', TRUE)
ON CONFLICT (correo) DO UPDATE
SET nombre = EXCLUDED.nombre, rol = EXCLUDED.rol, activo = EXCLUDED.activo;

-- Padre demo, vinculado a EST-001
INSERT INTO public.usuarios (correo, nombre, rol, activo)
VALUES ('CORREO_PADRE', 'Padre Demo', 'padre', TRUE)
ON CONFLICT (correo) DO UPDATE
SET nombre = EXCLUDED.nombre, rol = EXCLUDED.rol, activo = EXCLUDED.activo;

INSERT INTO public.padres_estudiantes (padre_id, estudiante_id)
SELECT u.id, e.id
FROM public.usuarios u, public.estudiantes e
WHERE u.correo = 'CORREO_PADRE' AND e.seudonimo = 'EST-001'
ON CONFLICT DO NOTHING;

-- Estudiante demo, vinculado a EST-002
INSERT INTO public.usuarios (correo, nombre, rol, activo)
VALUES ('CORREO_ESTUDIANTE', 'Estudiante Demo', 'estudiante', TRUE)
ON CONFLICT (correo) DO UPDATE
SET nombre = EXCLUDED.nombre, rol = EXCLUDED.rol, activo = EXCLUDED.activo;

UPDATE public.estudiantes e
SET usuario_id = u.id
FROM public.usuarios u
WHERE u.correo = 'CORREO_ESTUDIANTE' AND e.seudonimo = 'EST-002';
