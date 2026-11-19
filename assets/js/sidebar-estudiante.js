
function cargarSidebarEstudiante() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  // Sin badge hasta conectar con Supabase: el conteo vive en tareas.html (shortcut: badge vacío, conectar a tareas del grupo)
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
      <a href="https://sat1oru.github.io/ie-laarmonia/" target="_blank">
        <span class="nav-ico">🌐</span> Portal del colegio
      </a>
    </nav>

    <div class="sidebar-user">
      <div class="sidebar-avatar" data-user-avatar
           style="width:34px;height:34px;border-radius:50%;display:flex;align-items:center;
                  justify-content:center;font-size:13px;font-weight:700;color:#fff;
                  flex-shrink:0;background:#3b6de8;">VG</div>
      <div class="sidebar-user-info">
        <div class="sidebar-user-name" data-user-name>Valentina Gómez</div>
        <div class="sidebar-user-rol"  data-user-rol>Estudiante · 10°A</div>
      </div>
      <button class="btn-logout-side" title="Cerrar sesión" data-logout>⏏</button>
    </div>
  `;

  // Marcar link activo
  const pagina = window.location.pathname.split('/').pop().replace('.html', '');
  const link = sidebar.querySelector(`[data-page="${pagina}"]`);
  if (link) link.classList.add('activo');

  // Logout — AUTH se evalúa solo cuando el usuario hace clic
  sidebar.querySelector('[data-logout]')?.addEventListener('click', () => {
    if (typeof AUTH !== 'undefined') AUTH.logout();
    else window.location.href = '../login.html';
  });
}

// ✅ Llamada directa — no depende de DOMContentLoaded
// Funciona porque este script está al final del <body>
// y el DOM ya está listo cuando se ejecuta
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', cargarSidebarEstudiante);
} else {
  cargarSidebarEstudiante();
}