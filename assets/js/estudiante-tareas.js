/* Estudiante — Tareas (conectado a Supabase) */

const ESTUDIANTE_TAREAS = {
  usuario: null,
  supabase: null,
  grupoId: null,
  grado: null,
  seccion: null,
  tareas: [],

  async init() {
    this.usuario = AUTH.proteger('estudiante');
    if (!this.usuario) {
      console.warn('⚠️ ESTUDIANTE_TAREAS: sin sesión — usuario redirigido a login');
      return;
    }

    this.supabase = AUTH.clienteSupabase();
    AUTH.pintarUsuario(this.usuario);

    await this.cargarGrupoEstudiante();
    await this.cargarTareas();
    this.actualizarKPIs();
    this.cargarProximasFechas();
  },

  async cargarGrupoEstudiante() {
    const { data, error } = await this.supabase
      .from('estudiantes')
      .select('grupo_id, grupos(grado, seccion)')
      .eq('usuario_id', this.usuario.id)
      .maybeSingle();

    if (error || !data) {
      console.error('Error cargando grupo:', error);
      return;
    }

    this.grupoId = data.grupo_id;
    this.grado = data.grupos?.grado;
    this.seccion = data.grupos?.seccion || 'A';
    this.actualizarBanner();
  },

  actualizarBanner() {
    const p = document.querySelector('.page-banner p');
    if (p && this.grado && this.seccion) {
      p.textContent = `Grado ${this.grado}°${this.seccion} · IE La Armonía · Período 1 — 2026`;
    }
  },

  async cargarTareas() {
    if (!this.grupoId) return;

    const { data: tareas, error } = await this.supabase
      .from('tareas')
      .select('id, titulo, descripcion, fecha_entrega, docente_id, usuarios(nombre)')
      .eq('grupo_id', this.grupoId)
      .order('fecha_entrega', { ascending: true });

    if (error) {
      console.error('Error cargando tareas:', error);
      return;
    }

    this.tareas = tareas || [];
    const container = document.querySelector('[data-tareas-lista]');
    if (!container) return;

    if (this.tareas.length === 0) {
      container.innerHTML = '<p style="text-align:center; color:var(--txt-muted); padding:2rem;">No hay tareas asignadas</p>';
      return;
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    container.innerHTML = this.tareas.map(t => {
      const fechaEntrega = new Date(t.fecha_entrega);
      fechaEntrega.setHours(0, 0, 0, 0);
      const vencida = fechaEntrega < hoy;
      const docente = t.usuarios?.nombre || 'Docente';

      return `
        <div class="tarea-card${vencida ? ' entregada' : ''}">
          <div class="tarea-barra" style="background:${vencida ? 'var(--error)' : '#3b6de8'};"></div>
          <div style="flex:1;">
            <div class="tarea-nombre">${t.titulo}</div>
            <div class="tarea-desc">${t.descripcion || 'Sin descripción'}</div>
            <div class="tarea-footer">
              <span class="tarea-docente">📌 Por: ${docente}</span>
              <div>
                <button class="btn-entregar" style="background:${vencida ? 'var(--bg-app)' : '#3b6de8'}; color:${vencida ? 'var(--txt-muted)' : '#fff'};" onclick="ESTUDIANTE_TAREAS.abrirModal(${t.id}, '${t.titulo.replace(/'/g, "\\'")}')">📤 ${vencida ? 'Vencida' : 'Entregar'}</button>
              </div>
            </div>
          </div>
          <div style="text-align:right; min-width:120px;">
            <div class="tarea-vence" style="color:${vencida ? 'var(--error)' : 'var(--txt-muted)'};">
              ${vencida ? '❌ Vencida' : '📅 Entrega'}<br>
              <span style="font-size:11px; font-weight:400;">${fechaEntrega.toLocaleDateString('es-CO')}</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  actualizarKPIs() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const pendientes = this.tareas.filter(t => {
      const fecha = new Date(t.fecha_entrega);
      fecha.setHours(0, 0, 0, 0);
      return fecha >= hoy;
    }).length;

    const vencidas = this.tareas.filter(t => {
      const fecha = new Date(t.fecha_entrega);
      fecha.setHours(0, 0, 0, 0);
      return fecha < hoy;
    }).length;

    const hoy_exact = this.tareas.filter(t => {
      const fecha = new Date(t.fecha_entrega);
      fecha.setHours(0, 0, 0, 0);
      return fecha.getTime() === hoy.getTime();
    }).length;

    document.getElementById('kpi-pendientes').textContent = pendientes;
    document.getElementById('kpi-entregadas').textContent = vencidas;
    document.getElementById('kpi-vence-hoy').textContent = hoy_exact;
  },

  cargarProximasFechas() {
    const container = document.getElementById('proximas-fechas');
    if (!container) return;

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const proximas = this.tareas
      .filter(t => {
        const fecha = new Date(t.fecha_entrega);
        fecha.setHours(0, 0, 0, 0);
        return fecha >= hoy;
      })
      .slice(0, 3);

    if (proximas.length === 0) {
      container.innerHTML = '<p style="font-size:12px; color:var(--txt-muted); text-align:center; padding:1rem;">Sin próximas entregas</p>';
      return;
    }

    container.innerHTML = proximas.map(t => {
      const fecha = new Date(t.fecha_entrega);
      const diasFaltan = Math.ceil((fecha - hoy) / (1000 * 60 * 60 * 24));
      return `
        <div style="padding:8px 12px; background:var(--bg-app); border-radius:var(--radio-md); font-size:12px; border-left:3px solid #3b6de8;">
          <div style="font-weight:600; color:var(--txt-primario);">${t.titulo.substring(0, 30)}</div>
          <div style="color:var(--txt-muted); margin-top:2px;">En ${diasFaltan} día${diasFaltan !== 1 ? 's' : ''}</div>
        </div>
      `;
    }).join('');
  },

  abrirModal(tareaId, tareaNombre) {
    document.getElementById('modal-tarea-nombre').value = tareaNombre;
    document.getElementById('modal-entregar').classList.add('open');
  }
};

function cerrarModal() {
  document.getElementById('modal-entregar').classList.remove('open');
  document.getElementById('file-input').value = '';
  document.getElementById('archivo-sel').style.display = 'none';
}

function mostrarArchivo(input) {
  const sel = document.getElementById('archivo-sel');
  if (input.files && input.files[0]) {
    const f = input.files[0];
    sel.textContent = `📎 ${f.name} (${(f.size / 1024).toFixed(1)} KB)`;
    sel.style.display = 'block';
  }
}

function confirmarEntrega() {
  const nombre = document.getElementById('modal-tarea-nombre').value;
  const textarea = document.querySelector('.modal-box textarea');
  const archivo = document.getElementById('file-input').files[0];

  if (!archivo) {
    alert('Por favor selecciona un archivo para entregar');
    return;
  }

  alert(`Entrega registrada para: ${nombre}\n\n${archivo.name}\n\n(Demo — en producción se guardaría en Storage)`);
  cerrarModal();
}

document.addEventListener('DOMContentLoaded', () => ESTUDIANTE_TAREAS.init());
