/* Estudiante — Tareas (conectado a Supabase) */

const ESTUDIANTE_TAREAS = {
  usuario: null,
  supabase: null,
  grupoId: null,

  async init() {
    this.usuario = AUTH.proteger('estudiante');
    if (!this.usuario) return;

    this.supabase = AUTH.clienteSupabase();
    AUTH.pintarUsuario(this.usuario);

    await this.cargarGrupoEstudiante();
    await this.cargarTareas();
  },

  async cargarGrupoEstudiante() {
    // Encontrar grupo del estudiante
    const { data, error } = await this.supabase
      .from('estudiantes')
      .select('grupo_id')
      .eq('usuario_id', this.usuario.id)
      .maybeSingle();

    if (error || !data) {
      console.error('Error cargando grupo:', error);
      return;
    }

    this.grupoId = data.grupo_id;
  },

  async cargarTareas() {
    if (!this.grupoId) return;

    const { data: tareas, error } = await this.supabase
      .from('tareas')
      .select('id, titulo, descripcion, fecha_entrega, usuarios(nombre)')
      .eq('grupo_id', this.grupoId)
      .order('fecha_entrega', { ascending: false });

    if (error) {
      console.error('Error cargando tareas:', error);
      return;
    }

    const container = document.querySelector('[data-tareas-lista]');
    if (!container) return;

    if (tareas.length === 0) {
      container.innerHTML = '<p style="text-align:center; color:var(--txt-muted); padding:2rem;">No hay tareas asignadas</p>';
      return;
    }

    container.innerHTML = tareas.map(t => {
      const fechaEntrega = new Date(t.fecha_entrega);
      const hoy = new Date();
      const vencida = fechaEntrega < hoy;

      return `
        <div class="card" style="margin-bottom:1rem;">
          <div style="display:flex; justify-content:space-between; align-items:start; gap:1rem;">
            <div>
              <h3 style="margin:0 0 8px 0;">${t.titulo}</h3>
              <p style="color:var(--txt-muted); font-size:13px; margin:0 0 8px 0;">Por: ${t.usuarios.nombre}</p>
              <p style="color:var(--txt-secundario); font-size:14px; margin:0 0 12px 0;">${t.descripcion || 'Sin descripción'}</p>
              <div style="display:flex; gap:12px;">
                <button class="btn btn-primary btn-sm">📤 Enviar entrega</button>
                <button class="btn btn-ghost btn-sm">📄 Ver detalles</button>
              </div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:12px; font-weight:600; color:${vencida ? 'var(--error)' : 'var(--txt-muted)'};">
                ${vencida ? '❌ Vencida' : '📅 Entrega'}<br>
                ${fechaEntrega.toLocaleDateString('es-CO')}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }
};

document.addEventListener('DOMContentLoaded', () => ESTUDIANTE_TAREAS.init());
