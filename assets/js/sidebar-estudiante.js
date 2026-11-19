
async function cargarSidebarEstudiante() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const badgeTareas = '';

  sidebar.innerHTML = `
    <div class="sidebar-logo">
      <div class="sidebar-logo-mark" style="background:#F5C518;color:#0f1923;">M</div>
      <div class="sidebar-logo-text">
        <div class="sidebar-logo-name">MemoCampus</div>
        <div class="sidebar-logo-sub">IE La Armonía</div>
      </div>
    </div>

    <div class="sidebar-section-title">Principal</div>
    <nav class="sidebar-nav">
      <a href="dashboard.html" data-page="dashboard"><span class="nav-ico">🏠</span> Mi inicio</a>
      <a href="cursos.html"    data-page="cursos">   <span class="nav-ico">📚</span> Mis materias</a>
      <a href="tareas.html"    data-page="tareas">   <span class="nav-ico">✅</span> Tareas ${badgeTareas}</a>
      <a href="notas.html"     data-page="notas">    <span class="nav-ico">📊</span> Mis notas</a>
      <a href="bienestar.html" data-page="bienestar"> <span class="nav-ico">💙</span> Bienestar</a>
    </nav>

    <div class="sidebar-section-title">Más</div>
    <nav class="sidebar-nav">
      <a href="calendario.html"     data-page="calendario">     <span class="nav-ico">📅</span> Calendario</a>
      <a href="mensajes.html"       data-page="mensajes">       <span class="nav-ico">💬</span> Mensajes</a>
      <a href="notificaciones.html" data-page="notificaciones"> <span class="nav-ico">🔔</span> Notificaciones</a>
      <a href="https://sat1oru.github.io/ie-laarmonia/" target="_blank" rel="noopener">
        <span class="nav-ico">🌐</span> Portal del colegio
      </a>
    </nav>

    <div class="sidebar-user">
      <div class="sidebar-avatar" data-user-avatar
           style="width:34px;height:34px;border-radius:50%;display:flex;align-items:center;
                  justify-content:center;font-size:13px;font-weight:700;color:#fff;
                  flex-shrink:0;background:#3b6de8;">ES</div>
      <div class="sidebar-user-info">
        <div class="sidebar-user-name" data-user-name>Estudiante</div>
        <div class="sidebar-user-rol"  data-user-rol>Cargando...</div>
      </div>
      <button class="btn-logout-side" title="Cerrar sesión" data-logout>⏏</button>
    </div>
  `;

  // Marcar link activo
  const pagina = window.location.pathname.split('/').pop().replace('.html', '');
  const link = sidebar.querySelector(`[data-page="${pagina}"]`);
  if (link) link.classList.add('activo');

  // Logout
  sidebar.querySelector('[data-logout]')?.addEventListener('click', () => {
    if (typeof AUTH !== 'undefined') AUTH.logout();
    else window.location.href = '../login.html';
  });

  // Cargar datos reales del estudiante
  try {
    const usuario = AUTH.getUsuario();
    if (!usuario?.id) return;

    const client = AUTH.clienteSupabase();
    const { data: estudiante, error } = await client
      .from('estudiantes')
      .select('id, nombre, grupo_id, grupos(grado, seccion)')
      .eq('usuario_id', usuario.id)
      .maybeSingle();

    if (error || !estudiante) {
      console.warn('Error cargando estudiante:', error);
      return;
    }

    // Pintar datos reales
    const nameEl = sidebar.querySelector('[data-user-name]');
    const rolEl = sidebar.querySelector('[data-user-rol]');
    const avatarEl = sidebar.querySelector('[data-user-avatar]');

    if (nameEl) nameEl.textContent = estudiante.nombre || 'Estudiante';
    if (rolEl) rolEl.textContent = `Estudiante · ${estudiante.grupos?.grado}°${estudiante.grupos?.seccion || 'A'}`;
    if (avatarEl) {
      const initials = estudiante.nombre ? estudiante.nombre.split(' ').map(p=>p[0]).join('').slice(0,2).toUpperCase() : 'ES';
      avatarEl.textContent = initials;
    }
  } catch (e) {
    console.warn('Error en sidebar estudiante:', e);
  }
}

document.addEventListener('DOMContentLoaded', () => cargarSidebarEstudiante());