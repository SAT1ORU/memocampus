# MemoCampus — Manual técnico

Plataforma educativa para la IE La Armonía (Mosquera). Permite monitorear notas, asistencia, alertas a padres, bienestar emocional (encuesta de ánimo) y un apartado de rectoría con seguimiento psicológico, con un asistente de IA para resúmenes.

> **Estado del proyecto:** prototipo. El frontend es visual, la base de datos está diseñada y probada, y las fases de autenticación real, conexión del frontend, alertas por correo y RLS están pendientes. Ver la sección 9.

---

## 1. Arquitectura general

```
┌──────────────────────────┐        ┌────────────────────────────┐
│ Frontend (HTML/CSS/JS)   │ ─────► │ Base de datos PostgreSQL   │
│ admin/ docente/ padre/   │  (fase │ (Supabase recomendado)     │
│ estudiante/              │   2-3) │ tablas, vistas, funciones  │
└──────────────────────────┘        └──────────────┬─────────────┘
                                                   │ vistas agregadas
                                    ┌──────────────▼─────────────┐
                                    │ ai/resumen_grupo.py        │
                                    │ (solo datos seudonimizados)│
                                    └──────────────┬─────────────┘
                                                   ▼
                                       API de Anthropic (opcional)
```

Componentes actuales:

| Componente | Ubicación | Estado |
|---|---|---|
| Prototipo visual | `index.html`, `login.html`, carpetas por rol | Hecho, con datos de demostración en el código |
| Autenticación | `assets/js/auth.js` | Simulada con `localStorage`. **No es segura**. Redirección por rol corregida |
| Esquema de BD | `db/schema.sql` | Hecho y probado en PostgreSQL 16 |
| Datos ficticios | `db/seed_generator.py` → `db/seed.sql` | Hecho y probado |
| Reglas de alerta | `db/alertas.sql` | Hecho y probado (idempotente) |
| Perfiles demo | `db/usuarios_demo.example.sql` | Plantilla. El archivo real se ignora en Git |
| Resumen con IA | `ai/resumen_grupo.py` | Hecho. Modo local sin clave y modo IA |

---

## 2. Estructura del repositorio

```
memocampus/
├── index.html, login.html          Entrada y selección de rol (prototipo)
├── admin/                          Pantallas de rectoría (dashboard, reportes, usuarios, cursos, asistencia, comunicados)
├── docente/                        Pantallas de docente (dashboard, notas, tareas, cursos, bienestar, mensajes)
├── padre/                          Pantallas de padre (dashboard, notas, asistencia, alertas, comunicados, mensajes, adjuntar)
├── estudiante/                     Pantallas de estudiante (dashboard, notas, tareas, progreso, calendario, bienestar, mensajes, notificaciones)
├── assets/
│   ├── css/                        variables.css (tokens de color), base.css, layout.css
│   └── js/                         auth.js, sidebar-*.js por rol, comunicados.js
├── db/
│   ├── schema.sql                  Tablas, tipos, vistas
│   ├── alertas.sql                 Función generar_alertas y vista vw_alertas_pendientes
│   ├── seed_generator.py           Generador determinista de datos FICTICIOS
│   ├── seed.sql                    Resultado del generador
│   └── usuarios_demo.example.sql   Plantilla de perfiles demo
├── ai/
│   └── resumen_grupo.py            Resumen de grupo con IA o reglas
├── docs/
│   └── manual-tecnico.md           Este documento
├── manual-usuario-memocampus.html/.pdf   Manual de usuario (para el colegio)
└── .gitignore                      Incluye db/usuarios_demo.sql (correos reales)
```

---

## 3. Frontend (prototipo)

Seguridad del frontend tras la auditoría: el texto de los chats se muestra con `textContent` (antes se insertaba como HTML), todas las páginas tienen una política de contenido (CSP) mediante `<meta>`, y los enlaces externos usan `rel="noopener"`. Ver la sección 13.

### 3.1 Estilos
- `assets/css/variables.css` define los colores como tokens (`--color-docente`, `--verde`, `--alerta`, `--error-suave`, etc.). Cambiar la paleta aquí afecta todo el sitio.
- `base.css` y `layout.css` contienen la estructura y los componentes comunes.
- Cada rol tiene su color de acento: docente naranja, padre morado, estudiante azul, rectoría verde.

### 3.2 Autenticación simulada (`assets/js/auth.js`)
Objeto global `AUTH`:

| Método | Función |
|---|---|
| `login(rol)` | Guarda el usuario demo en `localStorage` (`mc_usuario`) |
| `getUsuario()` | Lee el usuario de `localStorage` |
| `proteger(rolRequerido)` | Redirige a `login.html` si no hay sesión o el rol no coincide |
| `detectarRol(correo)` | Dominio `iearmonia.edu.co` → institucional; cualquier otro → padre |
| `logout()` | Borra la sesión |

**Limitación crítica:** toda la protección ocurre en el navegador. Cualquiera puede escribir `mc_usuario` en la consola y entrar como rectoría. No usar con datos reales hasta reemplazar por Supabase Auth con RLS.

### 3.3 Cálculo de notas (`docente/notas.html`)
- Ponderación: **Ser 30% · Saber 40% · Hacer 30%** (valores de 0 a 5).
- Escala de desempeño: `≥ 3.0` → Básico; `< 3.0` → Bajo.
- **Inconsistencia conocida:** el color verde/naranja de la nota final usa el umbral `4.0`, no `3.0`. Hay que unificarlo con el parámetro `nota_minima_aprobatoria` de la base de datos.
- El botón "Guardar notas" solo muestra un mensaje; no persiste datos.

---

## 4. Base de datos

Motor: **PostgreSQL 16** (compatible con Supabase).

### 4.1 Tipos (enum)
| Tipo | Valores |
|---|---|
| `rol_usuario` | `estudiante`, `padre`, `docente`, `coordinacion`, `rectoria` |
| `estado_asistencia` | `presente`, `ausente`, `tardanza`, `excusa` |
| `nivel_animo` | `muy_bien`, `bien`, `regular`, `mal`, `muy_mal` |
| `estado_caso` | `abierto`, `en_seguimiento`, `remitido`, `cerrado` |

### 4.2 Tablas

| Tabla | Propósito | Notas |
|---|---|---|
| `usuarios` | Cuentas del sistema | `correo` único; un correo = un rol |
| `grupos` | Grado y sección por año | Único por (grado, sección, año) |
| `materias` | Asignaturas | Nombre único |
| `asignaciones` | Docente que dicta una materia en un grupo | Único por (grupo, materia) |
| `estudiantes` | Estudiantes | `seudonimo` (EST-001…) para reportes e IA; `nombre` es dato identificable; `usuario_id` opcional |
| `padres_estudiantes` | Vínculo padre–hijo | Clave compuesta. Solo coordinación debe crear vínculos |
| `asistencia` | Asistencia diaria por materia | Clave (estudiante, materia, fecha) |
| `notas` | Notas por periodo | `final` es columna generada con la ponderación; periodos 1–4 |
| `parametros` | Umbrales configurables | `nota_minima_aprobatoria` = 3.0; `max_inasistencias_alerta` = 4 |
| `encuestas_animo` | Respuesta semanal de ánimo | `comentario` es sensible; `requiere_atencion` activa protocolo |
| `casos_psicologicos` | Seguimiento clínico | Solo rectoría. `notas` es sensible |
| `alertas` | Alertas generadas | Tipos: `nota_baja`, `inasistencias`. `enviada_a_padres` aún no se actualiza |
| `accesos_log` | Auditoría de accesos a datos sensibles | Estructura lista; falta registrar desde la aplicación |

### 4.3 Vistas

| Vista | Uso | Qué expone |
|---|---|---|
| `vw_resumen_grupo` | Dashboard docente de notas | Promedio, notas bajas y número de estudiantes por grupo, materia y periodo |
| `vw_asistencia_grupo` | Dashboard docente de asistencia | Porcentaje de asistencia (presente o tardanza) y ausencias por grupo y materia |
| `vw_animo_grupo` | Ánimo para docentes | **Solo conteos** por grupo, semana y estado. Nunca comentarios ni respuestas individuales |
| `vw_alertas_pendientes` | Cola de envío de alertas | Seudónimo, tipo y detalle de alertas no enviadas |

### 4.4 Función `generar_alertas(p_periodo INT)`
Devuelve el número de alertas nuevas creadas. Es **idempotente**: no crea duplicados.

- **Regla `nota_baja`:** estudiantes con 2 o más materias por debajo de `nota_minima_aprobatoria` en el periodo. No se repite para el mismo periodo.
- **Regla `inasistencias`:** estudiantes con más de `max_inasistencias_alerta` ausencias en una materia. No se repite en 7 días.

La función solo **registra** alertas. El envío a padres es responsabilidad de otro proceso (fase 4).

**Principio:** las alertas se generan con reglas auditables, no con IA.

---

## 5. Datos ficticios

`db/seed_generator.py` usa una semilla fija (`SEMILLA = 2026`), así que genera siempre los mismos datos.

| Dato | Cantidad |
|---|---|
| Grupos | 12 (6° a 11°, secciones A y B) |
| Materias | 4 (Matemáticas, Lengua Castellana, Ciencias Naturales, Ciencias Sociales) |
| Estudiantes | 240 (20 por grupo) |
| Padres | 240 (un padre ficticio por estudiante) |
| Notas | 2 880 (3 periodos por materia) |
| Asistencia | 28 800 (30 días hábiles hasta el 30/10/2026) |
| Encuestas de ánimo | ~1 711 (8 semanas hasta el 09/11/2026, con ~10% sin respuesta) |
| Casos psicológicos | 6 |

Todos los correos usan el dominio reservado `.test`. Los riesgos de cada estudiante (bajo, medio, alto) determinan notas, asistencia y ánimo.

**Regenerar:**
```bash
python3 db/seed_generator.py
```

---

## 6. Perfiles demo

Los perfiles para iniciar sesión con Google van en `db/usuarios_demo.sql`, que **no se sube a Git** porque el repo es público.

1. Copiar `db/usuarios_demo.example.sql` a `db/usuarios_demo.sql`.
2. Reemplazar `CORREO_RECTORIA`, `CORREO_DOCENTE`, `CORREO_COORDINACION`, `CORREO_PADRE` y `CORREO_ESTUDIANTE` por cuentas de Google reales de prueba.
3. Ejecutar después de `schema.sql` y `seed.sql`.

El script vincula el padre a `EST-001` y el estudiante a `EST-002`.

---

## 7. Resumen con IA (`ai/resumen_grupo.py`)

**Uso:**
```bash
# Modo local (sin clave): resumen con reglas
PGHOST=... PGPORT=5432 PGUSER=... PGDATABASE=... \
  python3 ai/resumen_grupo.py --grupo 9 --seccion A --periodo 3

# Ver exactamente qué datos se enviarían a la IA
python3 ai/resumen_grupo.py --grupo 9 --seccion A --periodo 3 --solo-datos

# Modo IA: definir la clave en el entorno, nunca en el código
export ANTHROPIC_API_KEY=...
python3 ai/resumen_grupo.py --grupo 9 --seccion A --periodo 3
```

**Garantías de diseño:**
- Solo lee vistas agregadas y seudónimos.
- No envía nombres, comentarios de ánimo ni datos clínicos.
- La IA redacta; no decide alertas ni diagnostica salud mental.
- El modelo se define en la constante `MODELO`.

**Limitaciones:**
- Usa el cliente `psql` por línea de comandos.
- Los parámetros `grado` y `seccion` se insertan en el SQL con formato de cadena. Es aceptable para uso interno, pero antes de exponerlo a usuarios debe cambiarse a consultas parametrizadas.
- No registra en `accesos_log` las consultas de IA (pendiente, fase 7).

---

## 8. Puesta en marcha (base de datos)

Orden de ejecución:

```bash
psql -f db/schema.sql
psql -f db/seed.sql
psql -f db/alertas.sql
psql -f db/usuarios_demo.sql      # después de copiar y completar la plantilla
```

Probar alertas:
```sql
SELECT generar_alertas(3);   -- primera vez: crea alertas
SELECT generar_alertas(3);   -- segunda vez: devuelve 0
```

Probar vistas:
```sql
SELECT * FROM vw_resumen_grupo WHERE periodo = 3 LIMIT 5;
SELECT * FROM vw_asistencia_grupo LIMIT 5;
SELECT * FROM vw_animo_grupo WHERE grupo_id = 1;
```

Para pruebas locales sin Supabase se puede usar un Postgres 16 temporal. Si se ejecuta como root, usar el usuario `postgres` con un directorio al que tenga acceso.

---

## 9. Pendientes técnicos

| Fase | Pendiente | Prioridad |
|---|---|---|
| 2 | Reemplazar `auth.js` por Supabase Auth con Google | Crítica |
| 8 | Políticas RLS por rol y pruebas automatizadas | Crítica |
| 3 | Conectar dashboard docente a las vistas; registro de asistencia | Alta |
| 4 | Envío de alertas a padres y actualización de `enviada_a_padres` | Alta |
| 5 | Encuesta de ánimo con consentimiento | Alta |
| 6 | Apartado de rectoría y registro en `accesos_log` | Alta |
| 7 | Ampliar IA: consultas parametrizadas y registro de uso | Media |
| — | Unificar umbral de color de notas (3.0 vs 4.0) | Media |
| — | Login real: dejar de guardar sesión en `localStorage` | Crítica |

---

## 10. Seguridad y privacidad

- **Datos de menores y salud mental:** tratamiento bajo la Ley 1581 de 2012 (habeas data) y la Ley 1098 de 2006 (infancia). Requiere revisión legal y consentimiento antes de usar datos reales.
- **Seudonimización:** la IA y los reportes usan `EST-XXX`. El nombre solo existe en `estudiantes.nombre`.
- **Principio de mínimo acceso:** cada rol ve solo lo necesario. Ver tabla de permisos en `docs/` y en el plan de ejecución.
- **Secretos:** ninguna clave en el código ni en commits. La clave de IA va en `ANTHROPIC_API_KEY`.
- **Repositorio público:** no subir correos reales, claves ni datos de personas. `db/usuarios_demo.sql` está ignorado por Git.
- **Protocolo de salud mental:** las alertas de ánimo nunca se envían a padres; se abre un caso y se notifica a rectoría.

---

## 11. Decisiones pendientes

1. Plataforma definitiva (Supabase recomendado).
2. Dominio institucional de Mosquera (en el código aparece `iearmonia.edu.co`).
3. Servicio de correo para alertas (Gmail institucional o transaccional).
4. Aprobación de umbrales por coordinación (nota 3.0; 4 inasistencias por materia).
5. Escala de ánimo: validada (con licencia) o propia revisada por psicología.

## 12. Diagramas UML

Las fuentes están en `docs/uml/*.mmd` (Mermaid) y los SVG renderizados junto a ellas. Los elementos planeados se marcan como tales.

| Figura | Archivo | Contenido |
|---|---|---|
| 1 | `01-casos-de-uso` | Casos de uso por actor. Requiere ajuste de diseño y de relaciones include/extend |
| 2 | `02-clases-dominio` | Modelo de dominio derivado del esquema |
| 3 | `03-entidad-relacion` | Entidad-relación de la base de datos |
| 4 | `04-estados-caso-psicologico` | Estados del caso psicológico (transiciones propuestas) |
| 5 | `05-secuencia-alertas-padres` | Generación de alertas y aviso a padres (envío planeado) |
| 6 | `06-secuencia-inicio-sesion` | Inicio de sesión: prototipo actual y versión planeada con Supabase Auth |
| 7 | `07-secuencia-resumen-ia` | Resumen de grupo con IA con datos seudonimizados |
| 8 | `08-actividad-entrega-tarea` | Flujo de entrega de tarea por el estudiante |
| 9 | `09-componentes` | Componentes y despliegue, con servicios planeados |

## 13. Auditoría y correcciones de seguridad

Se realizó una auditoría en dos fases, con línea base en el commit `cdfc7a3` y reevaluación en `836ef1c`. Las herramientas fueron un analizador de patrones propio, Lighthouse con sesión de demostración y pruebas de navegador. SonarQube y OWASP ZAP no se ejecutaron en el entorno de auditoría; sus comandos están en el dictamen.

| Hallazgo | Estado |
|---|---|
| XSS en los chats de docente y padre (texto insertado como HTML) | Corregido y verificado en navegador |
| Redirección por rol a una ruta inexistente (404) | Corregido |
| Política de contenido (CSP) ausente | Añadida con `<meta>` en todas las páginas |
| Enlaces externos sin `rel="noopener"` | Corregido |
| `doctype` inválido en el dashboard del padre | Corregido |
| Contraste insuficiente en textos, menú e insignias | Mejorado: login y dashboard docente en 100 de accesibilidad |
| Autenticación simulada con `localStorage` | Pendiente: requiere Supabase Auth |
| Protección de páginas solo en el cliente | Pendiente: requiere RLS en el servidor |
| Manejadores inline `onclick=` (188) | Pendiente: impide una CSP sin `'unsafe-inline'` |
| Cabeceras HTTP (HSTS, `frame-ancestors`) | No aplicable en GitHub Pages; requiere servidor propio |

El dictamen completo, en normas APA 7, es el documento de la auditoría.
