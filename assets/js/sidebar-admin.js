/* ============================================
   sidebar-admin.js — Sidebar compartido admin
   MemoCampus · Prototipo
   ============================================ */

function cargarSidebarAdmin() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  sidebar.innerHTML = `
    <div class="sidebar-logo">
      <div class="sidebar-logo-mark" style="background:#1a6b3c;color:#fff;">M</div>
      <div class="sidebar-logo-text">
        <div class="sidebar-logo-name">MemoCampus</div>
        <div class="sidebar-logo-sub">IE La Armonía</div>
      </div>
    </div>

    <div class="sidebar-section-title">Gestión</div>
    <nav class="sidebar-nav">
      <a href="dashboard.html"    data-page="dashboard">    <span class="nav-ico">🏠</span> Inicio</a>
      <a href="usuarios.html"     data-page="usuarios">     <span class="nav-ico">👥</span> Usuarios</a>
      <a href="cursos.html" data-page="cursos"><span class="nav-ico">📚</span> Cursos</a>
      <a href="asistencia.html"   data-page="asistencia">   <span class="nav-ico">📅</span> Asistencia</a>
      <a href="reportes.html"     data-page="reportes">     <span class="nav-ico">📊</span> Reportes</a>
    </nav>

    <div class="sidebar-section-title">Comunicación</div>
    <nav class="sidebar-nav">
      <a href="comunicados.html"  data-page="comunicados">  <span class="nav-ico">📢</span> Comunicados</a>
    </nav>

    <div class="sidebar-section-title">Sistema</div>
    <nav class="sidebar-nav">
      <a href="https://sat1oru.github.io/ie-laarmonia/" target="_blank">
        <span class="nav-ico">🌐</span> Portal del colegio
      </a>
    </nav>

    <div class="sidebar-user">
      <div class="sidebar-avatar" data-user-avatar
           style="width:34px;height:34px;border-radius:50%;display:flex;align-items:center;
                  justify-content:center;font-size:13px;font-weight:700;color:#fff;
                  flex-shrink:0;background:#1a6b3c;">RA</div>
      <div class="sidebar-user-info">
        <div class="sidebar-user-name" data-user-name>Rectoría</div>
        <div class="sidebar-user-rol"  data-user-rol>Administrador</div>
      </div>
      <button class="btn-logout-side" title="Cerrar sesión" data-logout>⏏</button>
    </div>
  `;

  // Marcar link activo
  const pagina = window.location.pathname.split('/').pop().replace('.html', '');
  const link = sidebar.querySelector(`[data-page="${pagina}"]`);
  if (link) link.classList.add('activo');

  // Logout
  sidebar.querySelector('[data-logout]')?.addEventListener('click', () => AUTH.logout());
}

document.addEventListener('DOMContentLoaded', cargarSidebarAdmin);