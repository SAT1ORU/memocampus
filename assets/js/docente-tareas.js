/* Docente — Tareas (conectado a Supabase) */

const DOCENTE_TAREAS = {
  usuario: null,
  supabase: null,
  gruposDocente: [],

  async init() {
    this.usuario = AUTH.proteger('docente');
    if (!this.usuario) return;

    this.supabase = AUTH.clienteSupabase();
    AUTH.pintarUsuario(this.usuario);

    await this.cargarGrupos();
    await this.cargarEntregasPendientes();
    this.wireFormulario();
  },

  async cargarGrupos() {
    const { data, error } = await this.supabase
      .from('asignaciones')
      .select('grupo_id, grupos(grado, seccion), materias(nombre)')
      .eq('docente_id', this.usuario.id);

    if (error) {
      console.error('Error cargando grupos:', error);
      return;
    }

    // Deduplicar grupos
    this.gruposDocente = [...new Map(data.map(a => [a.grupo_id, a])).values()];

    // Llenar select
    const select = document.querySelector('[data-grupos-select]');
    if (select) {
      select.innerHTML = '';
      this.gruposDocente.forEach(a => {
        const opt = document.createElement('option');
        opt.value = a.grupo_id;
        opt.textContent = `${a.materias.nombre} — ${a.grupos.grado}°${a.grupos.seccion}`;
        select.appendChild(opt);
      });
    }
  },

  async cargarEntregasPendientes() {
    // Tareas del docente + entregas
    const { data: tareas, error: tareaError } = await this.supabase
      .from('tareas')
      .select('id, titulo, grupo_id, fecha_entrega, grupos(grado, seccion)')
      .eq('docente_id', this.usuario.id);

    if (tareaError) {
      console.error('Error cargando tareas:', tareaError);
      return;
    }

    const container = document.querySelector('[data-entregas-container]');
    if (!container) return;

    for (const tarea of tareas) {
      const { data: entregas } = await this.supabase
        .from('entregas')
        .select('id, estudiante_id, fecha_entrega, calificacion, estudiantes(nombre)')
        .eq('tarea_id', tarea.id)
        .is('calificacion', null);

      entregas?.forEach(e => {
        const row = document.createElement('div');
        row.className = 'entrega-row';
        row.innerHTML = `
          <div class="avatar-mini" style="background:#3b6de8;">${e.estudiantes.nombre.charAt(0).toUpperCase()}</div>
          <div style="flex:1;">
            <div style="font-size:14px; font-weight:600;">${e.estudiantes.nombre}</div>
            <div style="font-size:12px; color:var(--txt-muted);">${tarea.titulo} · ${tarea.grupos.grado}°${tarea.grupos.seccion}</div>
          </div>
          <span style="font-size:11px; color:var(--txt-muted);">${new Date(e.fecha_entrega).toLocaleDateString('es-CO')}</span>
          <input class="calif-input" type="number" min="0" max="5" step="0.1" placeholder="0.0" data-entrega-id="${e.id}">
          <button class="btn btn-primary btn-sm" onclick="DOCENTE_TAREAS.calificar(${e.id}, this)">✔ Calificar</button>
        `;
        container.appendChild(row);
      });
    }
  },

  wireFormulario() {
    const btn = document.querySelector('[data-publicar-tarea]');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      const titulo = document.querySelector('[data-titulo]')?.value;
      const grupoId = document.querySelector('[data-grupos-select]')?.value;
      const fechaEntrega = document.querySelector('[data-fecha-entrega]')?.value;
      const descripcion = document.querySelector('[data-descripcion]')?.value;
      const tipo = document.querySelector('[data-tipo-entrega]')?.value || 'archivo';

      if (!titulo || !grupoId || !fechaEntrega) {
        alert('Completa título, curso y fecha de entrega');
        return;
      }

      const { error } = await this.supabase.from('tareas').insert([
        {
          docente_id: this.usuario.id,
          grupo_id: parseInt(grupoId),
          titulo,
          descripcion,
          fecha_entrega: fechaEntrega,
          tipo_entrega: tipo
        }
      ]);

      if (error) {
        console.error('Error creando tarea:', error);
        alert('Error al crear tarea');
        return;
      }

      // Limpiar y recargar
      document.querySelector('[data-titulo]').value = '';
      document.querySelector('[data-descripcion]').value = '';
      btn.textContent = '✔ Tarea publicada';
      btn.style.background = 'var(--exito)';
      setTimeout(() => {
        btn.textContent = '📢 Publicar tarea';
        btn.style.background = '';
        this.cargarEntregasPendientes();
      }, 2000);
    });
  },

  async calificar(entregaId, btn) {
    const input = btn.closest('.entrega-row').querySelector('.calif-input');
    const calificacion = parseFloat(input.value);

    if (!calificacion || isNaN(calificacion) || calificacion < 0 || calificacion > 5) {
      alert('Ingresa una calificación entre 0 y 5');
      return;
    }

    const { error } = await this.supabase
      .from('entregas')
      .update({ calificacion })
      .eq('id', entregaId);

    if (error) {
      console.error('Error calificando:', error);
      alert('Error al guardar calificación');
      return;
    }

    btn.textContent = '✔ Calificada';
    btn.style.background = 'var(--exito)';
    btn.disabled = true;
    btn.closest('.entrega-row').style.opacity = '0.6';
  }
};

document.addEventListener('DOMContentLoaded', () => DOCENTE_TAREAS.init());
