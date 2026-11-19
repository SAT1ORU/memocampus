/* ============================================
   MEMOCAMPUS — auth.js
   Supabase Auth + modo demo explícito
   ============================================ */

const AUTH = {
  DOMINIO_INSTITUCIONAL: window.MEMOCAMPUS_CONFIG?.INSTITUTIONAL_DOMAIN || '',

  /* Usuarios de demo por rol */
  USUARIOS_DEMO: {
    estudiante: {
      id: 6,
      nombre: 'Valentina Gómez Valencia',
      correo: 'latricolorcol00@gmail.com',
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

  /* Guardar sesión ficticia del modo demo */
  login(rol) {
    const usuario = this.USUARIOS_DEMO[rol];
    if (!usuario) return false;
    localStorage.setItem('mc_usuario', JSON.stringify(usuario));
    localStorage.setItem('mc_login_time', Date.now());
    return usuario;
  },

  clienteSupabase() {
    const { SUPABASE_URL, SUPABASE_ANON_KEY } = window.MEMOCAMPUS_CONFIG || {};
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !window.supabase) {
      throw new Error('Configura Supabase antes de usar el acceso con Google.');
    }
    return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  },

  async loginConGoogle() {
    const client = this.clienteSupabase();
    const { error } = await client.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: new URL('login.html', window.location.href).href }
    });
    if (error) throw error;
  },

  async procesarCallbackOAuth() {
    const client = this.clienteSupabase();
    const { data: { session }, error: sessionError } = await client.auth.getSession();
    if (sessionError) throw sessionError;
    if (!session) return null;

    const correo = session.user.email?.toLowerCase();
    if (!correo) throw new Error('Google no devolvió un correo verificable.');
    const { data: usuario, error } = await client
      .from('usuarios')
      .select('id, correo, nombre, rol, activo')
      .eq('correo', correo)
      .maybeSingle();
    if (error) throw error;
    if (!usuario || !usuario.activo) {
      await client.auth.signOut();
      throw new Error('Tu cuenta no tiene un rol MemoCampus habilitado. Solicita acceso a coordinación.');
    }

    const dominio = correo.split('@')[1]?.toLowerCase();
    const dominioPermitido = window.MEMOCAMPUS_CONFIG?.INSTITUTIONAL_DOMAIN?.toLowerCase();
    const rolInstitucional = ['estudiante', 'docente', 'coordinacion', 'rectoria'].includes(usuario.rol);
    if (rolInstitucional && !window.MEMOCAMPUS_CONFIG?.ALLOW_ANY_DOMAIN && dominioPermitido !== dominio) {
      await client.auth.signOut();
      throw new Error('El correo no pertenece al dominio institucional permitido.');
    }

    const sesion = {
      id: usuario.id,
      nombre: usuario.nombre,
      correo: usuario.correo,
      rol: usuario.rol,
      initials: usuario.nombre.split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase(),
      avatar_color: '#1a6b3c'
    };
    localStorage.setItem('mc_usuario', JSON.stringify(sesion));
    localStorage.setItem('mc_login_time', Date.now());
    return sesion;
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
    window.location.href = '/login.html';
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
      estudiante: '/estudiante/dashboard.html',
      padre:      '/padre/dashboard.html',
      docente:    '/docente/dashboard.html',
      coordinacion:'/admin/dashboard.html',
      rectoria:   '/admin/dashboard.html',
      admin:      '/admin/dashboard.html'
    };
    const ruta = rutas[rol];
    // Si la página actual está dentro de una carpeta de rol, subir un nivel
    const enCarpetaRol = /\/(admin|docente|padre|estudiante)\//.test(window.location.pathname);
    if (ruta) window.location.href = (enCarpetaRol ? '../' : '') + ruta;
  },

  /* Proteger página — redirige si no hay sesión o rol incorrecto */
  proteger(rolRequerido) {
    const usuario = this.getUsuario();
    if (!usuario) {
      window.location.href = '/login.html';
      return null;
    }
    const rolesAdmin = ['admin', 'coordinacion', 'rectoria'];
    const accesoAdmin = rolRequerido === 'admin' && rolesAdmin.includes(usuario.rol);
    if (rolRequerido && usuario.rol !== rolRequerido && !accesoAdmin) {
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
  coordinacion:'Coordinación',
  rectoria:   'Rectoría',
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