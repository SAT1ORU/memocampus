/* ============================================
   sidebar-docente.js — Sidebar compartido docente
   MemoCampus · Prototipo
   ============================================ */

function cargarSidebarDocente() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  let msgNoLeidos = 0;
  try {
    const data = localStorage.getItem('memocampus_mensajes');
    if (data) msgNoLeidos = JSON.parse(data).filter(m => !m.leido).length;
  } catch(e) {}

  const badgeMsg = msgNoLeidos > 0
    ? `<span class="sidebar-badge">${msgNoLeidos}</span>`
    : '';

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
      <a href="tareas.html"    data-page="tareas">    <span class="nav-ico">✅</span> Tareas <span class="sidebar-badge">4</span></a>
      <a href="notas.html"     data-page="notas">     <span class="nav-ico">📊</span> Notas</a>
    </nav>

    <div class="sidebar-section-title">Más</div>
    <nav class="sidebar-nav">
      <a href="mensajes.html"  data-page="mensajes">  <span class="nav-ico">✉️</span> Mensajes ${badgeMsg}</a>
      <a href="bienestar.html" data-page="bienestar"> <span class="nav-ico">💙</span> Bienestar</a>
      <a href="https://sat1oru.github.io/ie-laarmonia/" target="_blank">
        <span class="nav-ico">🌐</span> Portal del colegio
      </a>
    </nav>

    <div class="sidebar-user">
      <div class="sidebar-avatar" data-user-avatar
           style="width:34px;height:34px;border-radius:50%;display:flex;align-items:center;
                  justify-content:center;font-size:13px;font-weight:700;color:#fff;
                  flex-shrink:0;background:var(--color-docente);">AM</div>
      <div class="sidebar-user-info">
        <div class="sidebar-user-name" data-user-name>Prof. Morales</div>
        <div class="sidebar-user-rol"  data-user-rol>Docente</div>
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

document.addEventListener('DOMContentLoaded', cargarSidebarDocente);