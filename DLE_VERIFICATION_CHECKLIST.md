# Checklist de verificación DNA - MemoCampus

## Estado general
- [x] Sidebars dinámicos en admin, docente, padre, estudiante
- [x] Supabase CDN y supabase-config.js cargados en páginas con datos reales
- [x] Try/catch con fallback a demo data en todas las consultas
- [x] No se usa service_role en frontend

## Páginas verificadas

### Admin
- [x] admin/cursos.html
  - [x] KPIs con ids kpi-cursos, kpi-est, kpi-doc, kpi-prom
  - [x] Supabase cargado
  - [x] cargarCursosAdmin() reemplaza CURSOS con datos reales
  - [x] Sidebar dinámico con sidebar-admin.js
  - [x] layout.css agregado
- [x] admin/asistencia.html
  - [x] id admin-asistencia-promedio
  - [x] Supabase cargado
  - [x] cargarAsistenciaAdmin() calcula % real
  - [x] Sidebar dinámico
- [x] admin/reportes.html
  - [x] ids reporte-promedio, reporte-asistencia, reporte-riesgo
  - [x] Supabase cargado
  - [x] cargarReportesAdmin() con notas y asistencia
  - [x] Sidebar dinámico

### Docente
- [x] docente/cursos.html
  - [x] grid-cursos-docente con render dinámico
  - [x] Supabase cargado
  - [x] cargarCursosDocente() por asignaciones
  - [x] Sidebar dinámico
  - [x] layout.css agregado
- [x] docente/notas.html - ya conectado

### Padre
- [x] padre/alertas.html
  - [x] Sidebar corregido a id="sidebar" y carga sidebar-padre.js
  - [x] Supabase cargado
  - [x] cargarAlertasPadre() carga nombre real, alertas y ausencias
  - [x] Banner dinámico con datos reales
- [ ] padre/comunicados.html
  - [ ] Sin tabla en Supabase - modo demo explícito

### Estudiante
- [ ] Verificar conexión a datos reales en dashboard y notas

## Riesgos conocidos
- Padre/comunicados sin tabla en DB - permanece demo
- Bienestar docente no conectado por sensibilidad de datos
- Jornadas hardcodeadas (no existe campo jornada en schema)
- Escapar HTML en docente/cursos.html

## Para subir a registro DNA
- [ ] Exportar carpeta memocampus a ZIP
- [ ] Incluir .git con historial
- [ ] Documentar tablas usadas y políticas RLS
