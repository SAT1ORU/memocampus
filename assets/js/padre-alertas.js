/* Padre — Alertas y Notificaciones (conectado a Supabase) */

const PADRE_ALERTAS = {
  usuario: null,
  supabase: null,

  async init() {
    this.usuario = AUTH.proteger('padre');
    if (!this.usuario) return;

    this.supabase = AUTH.clienteSupabase();
    AUTH.pintarUsuario(this.usuario);

    await this.cargarNotificaciones();
    this.configurarEscucha();
  },

  async cargarNotificaciones() {
    const { data: notificaciones, error } = await this.supabase
      .from('notificaciones')
      .select('id, estudiantes(nombre, seudonimo), tipo, mensaje, creada_en, leida')
      .eq('padre_id', this.usuario.id)
      .order('creada_en', { ascending: false });

    if (error) {
      console.error('Error cargando notificaciones:', error);
      return;
    }

    const container = document.querySelector('[data-alertas-container]');
    if (!container) return;

    if (!notificaciones || notificaciones.length === 0) {
      container.innerHTML = '<p style="text-align:center; color:var(--txt-muted); padding:2rem;">No hay alertas</p>';
      return;
    }

    const sinLeer = notificaciones.filter(n => !n.leida).length;
    const badge = document.querySelector('[data-contar-alertas]');
    if (badge) badge.textContent = sinLeer > 0 ? `${sinLeer} nuevas` : 'Al día';

    container.innerHTML = notificaciones.map(n => {
      const fecha = new Date(n.creada_en);
      const ahora = new Date();
      const diff = Math.floor((ahora - fecha) / 60000); // minutos
      const tiempo = diff < 1 ? 'Hace menos de 1 min'
                    : diff < 60 ? `Hace ${diff} min`
                    : diff < 1440 ? `Hace ${Math.floor(diff / 60)} h`
                    : `${fecha.toLocaleDateString('es-CO')}`;

      const icono = n.tipo === 'inasistencia' ? '⚠️' : '📋';
      const colorFondo = n.leida ? 'var(--bg-card)' : '#fef3c7';
      const colorBorde = n.leida ? 'var(--borde)' : '#fcd34d';

      return `
        <div style="padding:1rem; border:1px solid ${colorBorde}; border-radius:var(--radio-md); background:${colorFondo}; margin-bottom:0.75rem;">
          <div style="display:flex; gap:12px;">
            <div style="font-size:1.5rem;">${icono}</div>
            <div style="flex:1;">
              <div style="font-size:14px; font-weight:600; color:var(--txt-primario);">
                ${n.estudiantes.nombre} (${n.estudiantes.seudonimo})
              </div>
              <div style="font-size:13px; color:var(--txt-secundario); margin:4px 0 8px 0;">
                ${n.mensaje}
              </div>
              <div style="display:flex; gap:8px;">
                <span style="font-size:11px; color:var(--txt-muted);">${tiempo}</span>
                ${!n.leida ? '<span style="font-size:11px; color:#d97706; font-weight:600;">NUEVO</span>' : ''}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  configurarEscucha() {
    // Real-time: escucha cambios en notificaciones del padre
    this.supabase
      .channel(`padre-notificaciones-${this.usuario.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificaciones',
          filter: `padre_id=eq.${this.usuario.id}`
        },
        () => {
          console.log('Nueva notificación recibida');
          this.cargarNotificaciones();
        }
      )
      .subscribe();
  }
};

document.addEventListener('DOMContentLoaded', () => PADRE_ALERTAS.init());
