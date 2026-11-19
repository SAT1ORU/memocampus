/* ============================================
   sidebar-docente.js — Sidebar compartido docente
   MemoCampus · Prototipo
   ============================================ */

async function cargarSidebarDocente() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  let badgeMsg = '';
  const usuario = AUTH.getUsuario();
  if (usuario?.id) {
    try {
      const client = AUTH.clienteSupabase();
      const { count } = await client
        .from('mensajes')
        .select('*', { count: 'exact', head: true })
        .eq('para_usuario_id', usuario.id)
        .eq('leido', false);
      badgeMsg = count > 0 ? `<span class="sidebar-badge">${count}</span>` : '';
    } catch(e) {}
  }

  sidebar.innerHTML = `
    <div class="sidebar-logo">
      <div class="sidebar-logo-mark" style="background:var(--color-docente);color:#fff;">M</div>
      <div class="sidebar-logo-text">
        <div class="sidebar-logo-name">MemoCampus</div>
        <div class="sidebar-logo-sub">IE La Armonía</div>
      </div>
    </div>

    <div class="sidebar-section-title">Principal</div>
    <nav class="sidebar-nav">
      <a href="dashboard.html" data-page="dashboard"> <span class="nav-ico">🏠</span> Mi inicio</a>
      <a href="cursos.html"    data-page="cursos">    <span class="nav-ico">📚</span> Mis cursos</a>
      <a href="tareas.html"    data-page="tareas">    <span class="nav-ico">✅</span> Tareas <span class="sidebar-badge" id="docente-badge-tareas" style="display:none;"></span></a>
      <a href="notas.html"     data-page="notas">     <span class="nav-ico">📊</span> Notas</a>
      <a href="asistencia.html" data-page="asistencia"> <span class="nav-ico">📋</span> Asistencia</a>
    </nav>

    <div class="sidebar-section-title">Más</div>
    <nav class="sidebar-nav">
      <a href="mensajes.html"  data-page="mensajes">  <span class="nav-ico">✉️</span> Mensajes ${badgeMsg}</a>
      <a href="bienestar.html" data-page="bienestar"> <span class="nav-ico">💙</span> Bienestar <span id="docente-badge-encuestas" style="display:none;"></span></a>
      <a href="https://sat1oru.github.io/ie-laarmonia/" target="_blank">
        <span class="nav-ico">🌐</span> Portal del colegio
      </a>
    </nav>

    <div class="sidebar-user">
      <div class="sidebar-avatar" data-user-avatar style="width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#fff;flex-shrink:0;background:var(--color-docente);">AM</div>
      <div class="sidebar-user-info">
        <div class="sidebar-user-name" data-user-name>Prof. Morales</div>
        <div class="sidebar-user-rol"  data-user-rol>Docente</div>
        <div class="sidebar-user-correo" data-user-correo style="font-size:10px;opacity:.7;word-break:break-all;"></div>
      </div>
      <button class="btn-logout-side" title="Cerrar sesión" data-logout>⏏</button>
    </div>
  `;

  // Pintar usuario real desde Supabase en el sidebar
  const usuarioActual = AUTH.getUsuario();
  if (usuarioActual) {
    // El sidebar fue inyectado con innerHTML, ahora actualizamos los datos reales
    const nameEl = sidebar.querySelector('[data-user-name]');
    const rolEl = sidebar.querySelector('[data-user-rol]');
    const correoEl = sidebar.querySelector('[data-user-correo]');
    const avatarEl = sidebar.querySelector('[data-user-avatar]');

    if (nameEl) nameEl.textContent = usuarioActual.nombre || 'Usuario';
    if (rolEl) rolEl.textContent = usuarioActual.rol ? usuarioActual.rol.charAt(0).toUpperCase() + usuarioActual.rol.slice(1) : 'Docente';
    if (correoEl && usuarioActual.correo) correoEl.textContent = usuarioActual.correo;
    if (avatarEl) {
      avatarEl.textContent = usuarioActual.initials || (usuarioActual.nombre ? usuarioActual.nombre.split(' ').map(p=>p[0]).join('').slice(0,2).toUpperCase() : 'U');
      avatarEl.style.background = usuarioActual.avatar_color || 'var(--color-docente)';
    }
  }

  // Marcar link activo
  const pagina = window.location.pathname.split('/').pop().replace('.html', '');
  const link = sidebar.querySelector(`[data-page="${pagina}"]`);
  if (link) link.classList.add('activo');

  // Logout
  sidebar.querySelector('[data-logout]')?.addEventListener('click', () => AUTH.logout());

  cargarBadgeEncuestas();
}

// Encuestas de ánimo desfavorables (mal / muy_mal) de estudiantes de este docente
async function cargarBadgeEncuestas() {
  const badge = document.getElementById('docente-badge-encuestas');
  const usuario = AUTH.getUsuario();
  if (!badge || !usuario?.id) return;
  try {
    const client = AUTH.clienteSupabase(); // Reutilizar cliente, no crear instancias nuevas
    const { data: asig } = await client.from('asignaciones').select('grupo_id').eq('docente_id', usuario.id);
    const grupoIds = [...new Set((asig || []).map(a => a.grupo_id))];
    if (grupoIds.length === 0) return;
    const { data: est } = await client.from('estudiantes').select('id').in('grupo_id', grupoIds);
    const estIds = (est || []).map(e => e.id); // encuestas_animo.estudiante_id → estudiantes.id
    if (estIds.length === 0) return;
    const { data: enc } = await client.from('encuestas_animo').select('id')
      .in('estudiante_id', estIds).in('animo', ['mal', 'muy_mal']).eq('requiere_atencion', true);
    if (enc && enc.length > 0) {
      badge.textContent = '⚠️ ' + enc.length;
      badge.className = 'sidebar-badge';
      badge.style.cssText = 'background:#e74c3c;color:#fff;display:inline-block;';
    }
  } catch (e) { console.warn('Error cargando encuestas desfavorables:', e); }
}

document.addEventListener('DOMContentLoaded', () => cargarSidebarDocente());