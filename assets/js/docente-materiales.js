/* Docente — Materiales (conectado a Supabase) */

const DOCENTE_MATERIALES = {
  usuario: null,
  supabase: null,
  gruposDocente: [],
  materialesCache: {},
  materialEnEdicion: null,

  async init() {
    this.usuario = AUTH.proteger('docente');
    if (!this.usuario) {
      console.warn('⚠️ DOCENTE_MATERIALES: sin sesión');
      return;
    }

    this.supabase = AUTH.clienteSupabase();
    await this.cargarGrupos();
    await this.cargarMateriales();
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
    console.log('Grupos cargados:', this.gruposDocente.length);

    // Llenar select en modal
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

  async cargarMateriales() {
    const tbody = document.querySelector('[data-materiales-container]');
    if (!tbody) return;

    const { data: materiales, error } = await this.supabase
      .from('materiales')
      .select('id, nombre, tipo, grupo_id, fecha_subida, grupos(grado, seccion)')
      .eq('docente_id', this.usuario.id)
      .order('fecha_subida', { ascending: false });

    if (error) {
      console.error('Error cargando materiales:', error);
      return;
    }

    this.materialesCache = Object.fromEntries((materiales || []).map(m => [m.id, m]));
    tbody.innerHTML = '';
    (materiales || []).forEach(m => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${m.nombre}</strong></td>
        <td><span class="badge badge-verde">${m.tipo}</span></td>
        <td>${m.grupos.grado}°${m.grupos.seccion}</td>
        <td>${new Date(m.fecha_subida + 'T00:00:00').toLocaleDateString('es-CO')}</td>
        <td>
          <button class="btn btn-ghost btn-sm" onclick="DOCENTE_MATERIALES.abrirModalEditar(${m.id})">Editar</button>
          <button class="btn btn-danger btn-sm" onclick="DOCENTE_MATERIALES.abrirModalConfirmarEliminar(${m.id}, '${m.nombre}')">Eliminar</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  },

  abrirModalEditar(materialId) {
    const m = this.materialesCache[materialId];
    if (!m) return;
    this.materialEnEdicion = materialId;
    document.getElementById('modal-edit-nombre').value = m.nombre;
    document.getElementById('modal-edit-tipo').value = m.tipo;
    document.getElementById('modal-edit-error').textContent = '';
    document.getElementById('modal-editar-material').classList.add('open');
  },

  cerrarModalEditar() {
    document.getElementById('modal-editar-material').classList.remove('open');
    this.materialEnEdicion = null;
  },

  async guardarEdicionMaterial() {
    const nombre = document.getElementById('modal-edit-nombre').value.trim();
    const tipo = document.getElementById('modal-edit-tipo').value;
    const btn = document.getElementById('modal-edit-guardar');

    if (!nombre) {
      document.getElementById('modal-edit-error').textContent = 'El nombre es obligatorio';
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Guardando...';

    const { error } = await this.supabase
      .from('materiales')
      .update({ nombre, tipo })
      .eq('id', this.materialEnEdicion);

    if (error) {
      console.error('Error editando:', error);
      document.getElementById('modal-edit-error').textContent = 'Error: ' + error.message;
      btn.disabled = false;
      btn.textContent = 'Guardar cambios';
      return;
    }

    this.cerrarModalEditar();
    await this.cargarMateriales();
    btn.disabled = false;
    btn.textContent = 'Guardar cambios';
  },

  abrirModalConfirmarEliminar(materialId, nombre) {
    document.getElementById('modal-confirmar-nombre').textContent = nombre;
    document.getElementById('modal-confirmar').dataset.materialId = materialId;
    document.getElementById('modal-confirmar').classList.add('open');
  },

  cerrarModalConfirmar() {
    document.getElementById('modal-confirmar').classList.remove('open');
  },

  async confirmarEliminar() {
    const materialId = parseInt(document.getElementById('modal-confirmar').dataset.materialId);
    const btn = document.querySelector('#modal-confirmar [data-btn-confirmar]');

    btn.disabled = true;
    btn.textContent = 'Eliminando...';

    const { error } = await this.supabase
      .from('materiales')
      .delete()
      .eq('id', materialId);

    if (error) {
      console.error('Error eliminando:', error);
      alert('Error al eliminar: ' + error.message);
      btn.disabled = false;
      btn.textContent = 'Sí, eliminar';
      return;
    }

    this.cerrarModalConfirmar();
    await this.cargarMateriales();
  },

  async publicarMaterial() {
    const nombre = document.querySelector('[data-nombre]')?.value?.trim();
    const grupoId = document.querySelector('[data-grupos-select]')?.value;
    const tipo = document.querySelector('[data-tipo]')?.value || 'Otro';
    const btn = document.querySelector('[data-publicar-material]');

    console.log('Publicar: nombre=', nombre, 'grupoId=', grupoId, 'tipo=', tipo);

    if (!nombre || !grupoId) {
      alert('Completa nombre y curso');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Publicando...';

    const { error } = await this.supabase.from('materiales').insert([
      {
        docente_id: this.usuario.id,
        grupo_id: parseInt(grupoId),
        nombre,
        tipo,
        archivo_url: null
      }
    ]);

    if (error) {
      console.error('Error publicando:', error);
      alert('Error: ' + error.message);
      btn.disabled = false;
      btn.textContent = '📤 Publicar material';
      return;
    }

    // Limpiar y recargar
    document.querySelector('[data-nombre]').value = '';
    document.querySelector('[data-descripcion]').value = '';
    btn.textContent = '✔ Material publicado';
    btn.style.background = 'var(--exito)';

    setTimeout(() => {
      cerrarModal('modal-material');
      btn.textContent = '📤 Publicar material';
      btn.style.background = '';
      this.cargarMateriales();
    }, 1500);
  }
};

document.addEventListener('DOMContentLoaded', () => DOCENTE_MATERIALES.init());
