/* Docente — Tareas (conectado a Supabase) */

const DOCENTE_TAREAS = {
  usuario: null,
  supabase: null,
  gruposDocente: [],
  tareasCache: {},

  async init() {
    this.usuario = AUTH.proteger('docente');
    if (!this.usuario) {
      console.warn('⚠️ DOCENTE_TAREAS: sin sesión — usuario redirigido a login');
      return;
    }

    this.supabase = AUTH.clienteSupabase();
    AUTH.pintarUsuario(this.usuario);

    await this.cargarGrupos();
    await this.cargarEntregasPendientes();
    await this.cargarEntregasRevisadas();
    await this.cargarMisTareas();
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

    let totalPendientes = 0;
    for (const tarea of tareas) {
      const { data: entregas } = await this.supabase
        .from('entregas')
        .select('id, estudiante_id, fecha_entrega, calificacion, estudiantes(nombre)')
        .eq('tarea_id', tarea.id)
        .is('calificacion', null);

      if (entregas && entregas.length > 0) {
        totalPendientes += entregas.length;
        entregas.forEach(e => {
          const row = document.createElement('div');
          row.className = 'entrega-row';
          row.innerHTML = `
            <div class="avatar-mini" style="background:#3b6de8;">${e.estudiantes.nombre.charAt(0).toUpperCase()}</div>
            <div style="flex:1;">
              <div style="font-size:14px; font-weight:600;">${e.estudiantes.nombre}</div>
              <div style="font-size:12px; color:var(--txt-muted);">${tarea.titulo} · ${tarea.grupos.grado}°${tarea.grupos.seccion}</div>
            </div>
            <span style="font-size:11px; color:var(--txt-muted);">${new Date(e.fecha_entrega).toLocaleDateString('es-CO')}</span>
            <button class="btn btn-primary btn-sm" onclick="DOCENTE_TAREAS.abrirModalCalificar(${e.id}, '${e.estudiantes.nombre}')">📝 Calificar</button>
          `;
          container.appendChild(row);
        });
      }
    }

    // Actualizar badge en la página de tareas
    const badge = document.querySelector('[data-contar-pendientes]');
    if (badge) badge.textContent = totalPendientes > 0 ? `${totalPendientes} sin revisar` : 'Al día';

    // Actualizar badge en sidebar
    const sidebarBadge = document.querySelector('#docente-badge-tareas');
    if (sidebarBadge) {
      if (totalPendientes > 0) {
        sidebarBadge.textContent = totalPendientes;
        sidebarBadge.style.display = '';
      } else {
        sidebarBadge.style.display = 'none';
      }
    }
  },

  async cargarEntregasRevisadas() {
    const tbody = document.querySelector('[data-revisadas-container]');
    if (!tbody) return;

    const { data: tareas } = await this.supabase
      .from('tareas')
      .select('id, titulo, grupos(grado, seccion)')
      .eq('docente_id', this.usuario.id);

    tbody.innerHTML = '';
    let total = 0;
    for (const tarea of tareas || []) {
      const { data: entregas } = await this.supabase
        .from('entregas')
        .select('id, fecha_entrega, calificacion, estudiantes(nombre)')
        .eq('tarea_id', tarea.id)
        .not('calificacion', 'is', null);

      (entregas || []).forEach(e => {
        total++;
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="padding:12px 14px;"><div style="display:flex; align-items:center; gap:8px;"><div class="avatar-mini" style="background:#3b6de8;">${e.estudiantes.nombre.charAt(0).toUpperCase()}</div>${e.estudiantes.nombre}</div></td>
          <td>${tarea.titulo}</td>
          <td>${tarea.grupos.grado}°${tarea.grupos.seccion}</td>
          <td>${new Date(e.fecha_entrega).toLocaleDateString('es-CO')}</td>
          <td><span style="font-size:1.1rem; font-weight:800; color:var(--verde);">${e.calificacion}</span></td>
        `;
        tbody.appendChild(tr);
      });
    }

    const badge = document.querySelector('[data-contar-revisadas]');
    if (badge) badge.textContent = `${total} calificadas`;
  },

  async cargarMisTareas() {
    const tbody = document.querySelector('[data-mis-tareas-container]');
    if (!tbody) return;

    const { data: tareas, error } = await this.supabase
      .from('tareas')
      .select('id, titulo, descripcion, fecha_entrega, tipo_entrega, grupos(grado, seccion)')
      .eq('docente_id', this.usuario.id)
      .order('fecha_entrega', { ascending: false });

    if (error) {
      console.error('Error cargando mis tareas:', error);
      return;
    }

    this.tareasCache = Object.fromEntries((tareas || []).map(t => [t.id, t]));
    tbody.innerHTML = '';
    (tareas || []).forEach(t => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td style="padding:12px 14px; font-weight:600;">${t.titulo}</td>
        <td>${t.grupos.grado}°${t.grupos.seccion}</td>
        <td>${new Date(t.fecha_entrega + 'T00:00:00').toLocaleDateString('es-CO')}</td>
        <td>${t.tipo_entrega}</td>
        <td><button class="btn-accion" onclick="DOCENTE_TAREAS.abrirModalEditar(${t.id})">✏️ Editar</button></td>
      `;
      tbody.appendChild(tr);
    });

    const badge = document.querySelector('[data-contar-mis-tareas]');
    if (badge) badge.textContent = `${(tareas || []).length} tareas`;
  },

  abrirModalEditar(tareaId) {
    const t = this.tareasCache[tareaId];
    if (!t) return;
    document.getElementById('modal-edit-titulo').value = t.titulo;
    document.getElementById('modal-edit-fecha').value = t.fecha_entrega;
    document.getElementById('modal-edit-descripcion').value = t.descripcion || '';
    document.getElementById('modal-edit-error').textContent = '';
    document.getElementById('modal-editar-tarea').dataset.tareaId = tareaId;
    document.getElementById('modal-editar-tarea').classList.add('open');
  },

  cerrarModalEditar() {
    document.getElementById('modal-editar-tarea').classList.remove('open');
  },

  async guardarEdicionTarea() {
    const modal = document.getElementById('modal-editar-tarea');
    const tareaId = parseInt(modal.dataset.tareaId);
    const titulo = document.getElementById('modal-edit-titulo').value.trim();
    const fecha = document.getElementById('modal-edit-fecha').value;
    const descripcion = document.getElementById('modal-edit-descripcion').value.trim();
    const btn = document.getElementById('modal-edit-guardar');

    if (!titulo || !fecha) {
      document.getElementById('modal-edit-error').textContent = 'El título y la fecha son obligatorios';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Guardando...';

    const { error } = await this.supabase
      .from('tareas')
      .update({ titulo, fecha_entrega: fecha, descripcion: descripcion || null })
      .eq('id', tareaId);

    if (error) {
      console.error('Error editando tarea:', error);
      document.getElementById('modal-edit-error').textContent = 'Error al guardar: ' + error.message;
      btn.disabled = false;
      btn.textContent = 'Guardar cambios';
      return;
    }

    this.cerrarModalEditar();
    await this.cargarMisTareas();
    await this.cargarEntregasPendientes();
    await this.cargarEntregasRevisadas();
    btn.disabled = false;
    btn.textContent = 'Guardar cambios';
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

  abrirModalCalificar(entregaId, nombreEstudiante) {
    const modal = document.getElementById('modal-calificar');
    document.getElementById('modal-calif-estudiante').textContent = nombreEstudiante;
    document.getElementById('modal-calif-nota').value = '';
    document.getElementById('modal-calif-observaciones').value = '';
    document.getElementById('modal-calif-error').textContent = '';
    modal.dataset.entregaId = entregaId;
    modal.classList.add('open');
  },

  cerrarModalCalificar() {
    const modal = document.getElementById('modal-calificar');
    modal.classList.remove('open');
  },

  async guardarCalificacion() {
    const modal = document.getElementById('modal-calificar');
    const entregaId = parseInt(modal.dataset.entregaId);
    const nota = parseFloat(document.getElementById('modal-calif-nota').value);
    const observaciones = document.getElementById('modal-calif-observaciones').value.trim();
    const btn = document.getElementById('modal-calif-guardar');

    if (!nota || isNaN(nota) || nota < 0 || nota > 5) {
      document.getElementById('modal-calif-error').textContent = 'La nota debe estar entre 0 y 5';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Guardando...';

    const { error } = await this.supabase
      .from('entregas')
      .update({
        calificacion: nota,
        observaciones: observaciones || null
      })
      .eq('id', entregaId);

    if (error) {
      console.error('Error calificando:', error);
      document.getElementById('modal-calif-error').textContent = 'Error al guardar: ' + error.message;
      btn.disabled = false;
      btn.textContent = 'Guardar calificación';
      return;
    }

    this.cerrarModalCalificar();
    await this.cargarEntregasPendientes();
    await this.cargarEntregasRevisadas();
  }
};

document.addEventListener('DOMContentLoaded', () => DOCENTE_TAREAS.init());
