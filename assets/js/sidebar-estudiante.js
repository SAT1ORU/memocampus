/* global AUTH */

function cargarSidebarEstudiante() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  let pendientes = 0;
  try { pendientes = Number(localStorage.getItem('memocampus_tareas_pendientes')) || 0; } catch { /* Sin acceso a localStorage: sin badge. */ }
  const badgeTareas = pendientes > 0 ? `<span class="sidebar-badge">${pendientes}</span>` : '';

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
    </nav>

    <div class="sidebar-section-title">Más</div>
    <nav class="sidebar-nav">
      <a href="calendario.html"     data-page="calendario">     <span class="nav-ico">📅</span> Calendario</a>
      <a href="mensajes.html"       data-page="mensajes">       <span class="nav-ico">💬</span> Mensajes</a>
      <a href="notificaciones.html" data-page="notificaciones"> <span class="nav-ico">🔔</span> Notificaciones</a>
      <a href="bienestar.html"      data-page="bienestar">      <span class="nav-ico">💙</span> Bienestar</a>
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

// Actualiza el badge de Tareas con el conteo real (lo llama estudiante-tareas.js)
function actualizarBadgeTareas(n) {
  try { localStorage.setItem('memocampus_tareas_pendientes', n); } catch { /* Sin localStorage: solo se actualiza la página actual. */ }
  const link = document.querySelector('[data-page="tareas"]');
  if (!link) return;
  link.querySelector('.sidebar-badge')?.remove();
  if (n > 0) link.insertAdjacentHTML('beforeend', `<span class="sidebar-badge">${n}</span>`);
}

// Mismas notificaciones no leídas que muestra notificaciones.html
const NOTIFICACIONES_RECIENTES = [
  { icono:'✅', bg:'#fef3c7', titulo:'Tarea vence hoy — Trigonometría', meta:'Matemáticas · Hoy' },
  { icono:'📢', bg:'#dcfce7', titulo:'Nuevo comunicado — Semana de recuperación', meta:'Coordinación · 24 mar 2026' },
  { icono:'📊', bg:'#eef2fd', titulo:'Nota registrada — Ciencias Naturales 4.5', meta:'Prof. Morales · Ayer' },
];

function mostrarNotificaciones() {
  let modal = document.getElementById('modal-notif-rapida');
  if (!modal) {
    document.head.insertAdjacentHTML('beforeend', `<style>
      .notif-rapida-overlay { display:none; position:fixed; inset:0; background:rgba(15,25,35,.45); backdrop-filter:blur(3px); z-index:800; align-items:flex-start; justify-content:flex-end; padding:72px 24px 0; }
      .notif-rapida-overlay.open { display:flex; }
      .notif-rapida-box { background:#fff; width:100%; max-width:380px; border-radius:18px; box-shadow:0 24px 60px rgba(0,0,0,.25); overflow:hidden; animation:nrIn .18s ease-out; }
      @keyframes nrIn { from { opacity:0; transform:translateY(-8px) scale(.98); } to { opacity:1; transform:none; } }
      .notif-rapida-head { background:linear-gradient(135deg,#3b6de8,#2454c7); color:#fff; padding:16px 18px; display:flex; justify-content:space-between; align-items:flex-start; }
      .notif-rapida-titulo { font-weight:800; font-size:15px; }
      .notif-rapida-sub { font-size:12px; opacity:.8; margin-top:2px; }
      .notif-rapida-x { background:rgba(255,255,255,.18); border:none; color:#fff; width:28px; height:28px; border-radius:50%; cursor:pointer; font-size:13px; }
      .notif-rapida-lista { padding:6px 0; max-height:360px; overflow-y:auto; }
      .notif-rapida-item { display:flex; gap:12px; padding:12px 18px; align-items:flex-start; border-bottom:1px solid #eef0f4; }
      .notif-rapida-item:last-child { border-bottom:none; }
      .notif-rapida-ico { width:36px; height:36px; border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0; }
      .notif-rapida-tit { font-size:13px; font-weight:700; color:#0f1923; line-height:1.35; }
      .notif-rapida-meta { font-size:11px; color:#8a94a6; margin-top:3px; }
      .notif-rapida-ver { display:block; text-align:center; padding:12px; font-size:13px; font-weight:700; color:#3b6de8; text-decoration:none; background:#f5f7fb; border-top:1px solid #eef0f4; }
      .notif-rapida-ver:hover { background:#eef2fd; }
    </style>`);

    modal = document.createElement('div');
    modal.id = 'modal-notif-rapida';
    modal.className = 'notif-rapida-overlay';
    modal.innerHTML = `
      <div class="notif-rapida-box" role="dialog" aria-modal="true" aria-label="Notificaciones">
        <div class="notif-rapida-head">
          <div>
            <div class="notif-rapida-titulo">🔔 Notificaciones</div>
            <div class="notif-rapida-sub">${NOTIFICACIONES_RECIENTES.length} sin leer</div>
          </div>
          <button class="notif-rapida-x" aria-label="Cerrar">✕</button>
        </div>
        <div class="notif-rapida-lista">
          ${NOTIFICACIONES_RECIENTES.map(n => `
            <div class="notif-rapida-item">
              <div class="notif-rapida-ico" style="background:${n.bg};">${n.icono}</div>
              <div>
                <div class="notif-rapida-tit">${n.titulo}</div>
                <div class="notif-rapida-meta">${n.meta}</div>
              </div>
            </div>`).join('')}
        </div>
        <a class="notif-rapida-ver" href="notificaciones.html">Ver todas las notificaciones →</a>
      </div>`;
    document.body.appendChild(modal);

    const cerrar = () => modal.classList.remove('open');
    modal.addEventListener('click', e => { if (e.target === modal || e.target.closest('.notif-rapida-x')) cerrar(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') cerrar(); });
  }
  modal.classList.add('open');
}

// ✅ Llamada directa — no depende de DOMContentLoaded
// Funciona porque este script está al final del <body>
// y el DOM ya está listo cuando se ejecuta
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', cargarSidebarEstudiante);
} else {
  cargarSidebarEstudiante();
}