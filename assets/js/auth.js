/* ============================================
   MEMOCAMPUS — auth.js
   Simulación de autenticación con Google OAuth
   Dominio institucional: @iearmonia.edu.co
   ============================================ */

const AUTH = {
  DOMINIO_INSTITUCIONAL: 'iearmonia.edu.co',

  /* Usuarios de demo por rol */
  USUARIOS_DEMO: {
    estudiante: {
      nombre: 'Valentina Gómez',
      correo: 'vgomez@iearmonia.edu.co',
      rol: 'estudiante',
      grado: '10°A',
      avatar_color: '#3b6de8',
      initials: 'VG'
    },
    padre: {
      nombre: 'Carlos Gómez',
      correo: 'carlos.gomez@gmail.com',
      rol: 'padre',
      hijo: 'Valentina Gómez',
      grado_hijo: '10°A',
      avatar_color: '#9b3de8',
      initials: 'CG'
    },
    docente: {
      nombre: 'Prof. Andrés Morales',
      correo: 'amorales@iearmonia.edu.co',
      rol: 'docente',
      area: 'Ciencias Naturales',
      avatar_color: '#e87d1e',
      initials: 'AM'
    },
    admin: {
      nombre: 'Rectoría IE La Armonía',
      correo: 'rectoria@iearmonia.edu.co',
      rol: 'admin',
      avatar_color: '#1a6b3c',
      initials: 'RA'
    }
  },

  /* Guardar sesión en localStorage */
  login(rol) {
    const usuario = this.USUARIOS_DEMO[rol];
    if (!usuario) return false;
    localStorage.setItem('mc_usuario', JSON.stringify(usuario));
    localStorage.setItem('mc_login_time', Date.now());
    return usuario;
  },

  /* Obtener usuario actual */
  getUsuario() {
    try {
      const data = localStorage.getItem('mc_usuario');
      return data ? JSON.parse(data) : null;
    } catch { return null; }
  },

  /* Verificar si está autenticado */
  isAutenticado() {
    return this.getUsuario() !== null;
  },

  /* Cerrar sesión */
  logout() {
    localStorage.removeItem('mc_usuario');
    localStorage.removeItem('mc_login_time');
    window.location.href = '../login.html';
  },

  /* Detectar rol por dominio del correo */
  detectarRol(correo) {
    if (!correo) return null;
    const dominio = correo.split('@')[1]?.toLowerCase();
    if (dominio === this.DOMINIO_INSTITUCIONAL) return 'institucional';
    return 'padre';
  },

  /* Redirigir según rol */
  redirigirSegunRol(rol) {
    const rutas = {
      estudiante: 'estudiante/dashboard.html',
      padre:      'padre/dashboard.html',
      docente:    'docente/dashboard.html',
      admin:      'admin/dashboard.html'
    };
    const ruta = rutas[rol];
    if (ruta) window.location.href = ruta;
  },

  /* Proteger página — redirige si no hay sesión o rol incorrecto */
  proteger(rolRequerido) {
    const usuario = this.getUsuario();
    if (!usuario) {
      window.location.href = '../login.html';
      return null;
    }
    if (rolRequerido && usuario.rol !== rolRequerido) {
      this.redirigirSegunRol(usuario.rol);
      return null;
    }
    return usuario;
  },

  /* Inyectar datos del usuario en el DOM */
  pintarUsuario(usuario) {
    if (!usuario) return;
    /* Sidebar */
    const nameEls    = document.querySelectorAll('[data-user-name]');
    const rolEls     = document.querySelectorAll('[data-user-rol]');
    const initEls    = document.querySelectorAll('[data-user-initials]');
    const avatarEls  = document.querySelectorAll('[data-user-avatar]');
    const correoEls  = document.querySelectorAll('[data-user-correo]');

    nameEls.forEach(el   => el.textContent = usuario.nombre);
    rolEls.forEach(el    => el.textContent = LABELS_ROL[usuario.rol] || usuario.rol);
    initEls.forEach(el   => el.textContent = usuario.initials);
    correoEls.forEach(el => el.textContent = usuario.correo);
    avatarEls.forEach(el => {
      el.textContent = usuario.initials;
      el.style.background = usuario.avatar_color;
    });
  }
};

const LABELS_ROL = {
  estudiante: 'Estudiante',
  padre:      'Padre de familia',
  docente:    'Docente',
  admin:      'Administrador'
};

/* ---- Sidebar hamburguesa ---- */
document.addEventListener('DOMContentLoaded', () => {
  const hamburger = document.querySelector('.hamburger-btn');
  const sidebar   = document.querySelector('.app-sidebar');
  const overlay   = document.querySelector('.sidebar-overlay');

  if (hamburger && sidebar) {
    hamburger.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      overlay?.classList.toggle('open');
    });
    overlay?.addEventListener('click', () => {
      sidebar.classList.remove('open');
      overlay.classList.remove('open');
    });
  }

  /* Logout buttons */
  document.querySelectorAll('[data-logout]').forEach(btn => {
    btn.addEventListener('click', () => AUTH.logout());
  });
});