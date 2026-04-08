/* ============================================
   sidebar-padre.js — Sidebar compartido del padre
   MemoCampus · Prototipo
   ============================================ */

function cargarSidebarPadre() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  let noLeidos = 0;
  try {
    const data = localStorage.getItem('memocampus_comunicados');
    if (data) noLeidos = JSON.parse(data).filter(c => !c.leido).length;
  } catch(e) {}

  const badgeCom = noLeidos > 0
    ? `<span class="sidebar-badge" id="badge-comunicados">${noLeidos}</span>`
    : `<span class="sidebar-badge" id="badge-comunicados" style="display:none">0</span>`;

  sidebar.innerHTML = `
    <div class="sidebar-logo">
      <div class="sidebar-logo-mark" style="background:var(--color-padre);color:#fff;">M</div>
      <div class="sidebar-logo-text">
        <div class="sidebar-logo-name">MemoCampus</div>
        <div class="sidebar-logo-sub">IE La Armonía</div>
      </div>
    </div>

    <div class="sidebar-section-title">Mi hijo/a</div>
    <nav class="sidebar-nav">
      <a href="dashboard.html"   data-page="dashboard">  <span class="nav-ico">🏠</span> Inicio</a>
      <a href="notas.html"       data-page="notas">       <span class="nav-ico">📊</span> Notas</a>
      <a href="asistencia.html"  data-page="asistencia">  <span class="nav-ico">📅</span> Asistencia</a>
      <a href="adjuntar.html"    data-page="adjuntar">    <span class="nav-ico">📎</span> Adjuntar excusa</a>
    </nav>

    <div class="sidebar-section-title">Comunicación</div>
    <nav class="sidebar-nav">
      <a href="mensajes.html"    data-page="mensajes">    <span class="nav-ico">💬</span> Mensajes al docente</a>
      <a href="comunicados.html" data-page="comunicados"> <span class="nav-ico">📢</span> Comunicados ${badgeCom}</a>
      <a href="https://sat1oru.github.io/ie-laarmonia/" target="_blank">
        <span class="nav-ico">🌐</span> Portal del colegio
      </a>
    </nav>

    <div class="sidebar-user">
      <div class="sidebar-avatar" data-user-avatar
           style="width:34px;height:34px;border-radius:50%;display:flex;align-items:center;
                  justify-content:center;font-size:13px;font-weight:700;color:#fff;
                  flex-shrink:0;background:var(--color-padre);">CG</div>
      <div class="sidebar-user-info">
        <div class="sidebar-user-name" data-user-name>Carlos Gómez</div>
        <div class="sidebar-user-rol"  data-user-rol>Padre de familia</div>
      </div>
      <button class="btn-logout-side" title="Cerrar sesión" data-logout>⏏</button>
    </div>
  `;

  // Marcar link activo
  const pagina = window.location.pathname.split('/').pop().replace('.html', '');
  const link = sidebar.querySelector(`[data-page="${pagina}"]`);
  if (link) link.classList.add('activo');

  // Logout — registrar después de que el botón existe en el DOM
  sidebar.querySelector('[data-logout]')?.addEventListener('click', () => AUTH.logout());
}

document.addEventListener('DOMContentLoaded', cargarSidebarPadre)