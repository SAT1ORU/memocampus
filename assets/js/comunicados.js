/* ============================================
   comunicados.js — Sistema de comunicados con localStorage
   MemoCampus · Prototipo
   ============================================ */

const COMUNICADOS_KEY = 'memocampus_comunicados';

const COMUNICADOS_DATA = [
  {
    id: 1,
    tipo: 'urgente',
    titulo: 'Semana de recuperación — Período 1',
    cuerpo: 'Se informa a los padres de familia que la semana del 28 de marzo al 1 de abril se llevarán a cabo las actividades de recuperación del Período 1. Los estudiantes con materias en desempeño Básico o Bajo deben presentarse puntualmente.',
    emisor: 'Coordinación Académica',
    fecha: '24 mar 2026',
    leido: false
  },
  {
    id: 2,
    tipo: 'informativo',
    titulo: 'Cambio de horario — Educación Física',
    cuerpo: 'A partir del lunes 28 de marzo, la clase de Educación Física del grado 10°A se traslada al bloque de 10:00 am - 11:30 am. Se solicita a los estudiantes traer implementos deportivos ese día.',
    emisor: 'Coordinación General',
    fecha: '22 mar 2026',
    leido: false
  },
  {
    id: 3,
    tipo: 'academico',
    titulo: 'Feria de Ciencias — Inscripciones abiertas',
    cuerpo: 'La IE La Armonía abre inscripciones para la Feria de Ciencias 2026. Los estudiantes interesados deben presentar su propuesta de proyecto antes del 5 de abril. Más información con el Prof. Morales.',
    emisor: 'Rectoría',
    fecha: '20 mar 2026',
    leido: true
  },
  {
    id: 4,
    tipo: 'urgente',
    titulo: 'Recordatorio entrega de formularios',
    cuerpo: 'Se recuerda a los padres que el plazo para entregar los formularios de actualización de datos vence el viernes 27 de marzo. Pueden radicarlo en secretaría en el horario de 7:00 am a 4:00 pm.',
    emisor: 'Secretaría',
    fecha: '18 mar 2026',
    leido: true
  },
  {
    id: 5,
    tipo: 'academico',
    titulo: 'Entrega de boletines — Período 1',
    cuerpo: 'Los boletines del Período 1 estarán disponibles en la plataforma a partir del 2 de abril. Los padres podrán descargarlo directamente desde la sección Notas.',
    emisor: 'Coordinación Académica',
    fecha: '15 mar 2026',
    leido: true
  },
  {
    id: 6,
    tipo: 'informativo',
    titulo: 'Día de la institución — No hay clases',
    cuerpo: 'El día jueves 3 de abril no habrá clases en la institución por celebración del Día del Colegio. Las actividades programadas para ese día se reprogramarán en la siguiente semana.',
    emisor: 'Rectoría',
    fecha: '10 mar 2026',
    leido: true
  }
];

// Inicializar localStorage si no existe
function initComunicados() {
  if (!localStorage.getItem(COMUNICADOS_KEY)) {
    localStorage.setItem(COMUNICADOS_KEY, JSON.stringify(COMUNICADOS_DATA));
  }
}

// Obtener todos los comunicados
function getComunicados() {
  initComunicados();
  return JSON.parse(localStorage.getItem(COMUNICADOS_KEY));
}

// Obtener no leídos
function getComunicadosNoLeidos() {
  return getComunicados().filter(c => !c.leido);
}

// Marcar uno como leído
function marcarLeido(id) {
  const lista = getComunicados();
  const item = lista.find(c => c.id === id);
  if (item) {
    item.leido = true;
    localStorage.setItem(COMUNICADOS_KEY, JSON.stringify(lista));
    actualizarBadges();
  }
}

// Marcar todos como leídos
function marcarTodosLeidos() {
  const lista = getComunicados().map(c => ({ ...c, leido: true }));
  localStorage.setItem(COMUNICADOS_KEY, JSON.stringify(lista));
  actualizarBadges();
}

// Actualizar badge del sidebar y punto del topbar
function actualizarBadges() {
  const noLeidos = getComunicadosNoLeidos().length;

  // Badge sidebar
  const badge = document.getElementById('badge-comunicados');
  if (badge) {
    if (noLeidos > 0) {
      badge.textContent = noLeidos;
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  }

  // Punto rojo topbar
  const dot = document.getElementById('notifDot');
  if (dot) dot.style.display = noLeidos > 0 ? 'block' : 'none';

  // Contador dropdown
  const count = document.getElementById('notifCount');
  if (count) count.textContent = noLeidos > 0 ? `${noLeidos} nuevas` : 'Al día';
}

// Renderizar lista en comunicados.html
function renderComunicados(filtro = 'todos') {
  const lista = getComunicados();
  const contenedor = document.getElementById('lista-comunicados');
  if (!contenedor) return;

  const filtrados = filtro === 'todos' ? lista : 
                    filtro === 'no-leidos' ? lista.filter(c => !c.leido) :
                    lista.filter(c => c.tipo === filtro);

  if (filtrados.length === 0) {
    contenedor.innerHTML = `
      <div style="text-align:center;padding:3rem;color:var(--txt-muted);">
        <div style="font-size:2.5rem;margin-bottom:1rem;">📭</div>
        <p>No hay comunicados en esta categoría.</p>
      </div>`;
    return;
  }

  const iconos = { urgente: '⚠️', informativo: '📢', academico: '🎓' };
  const colores = {
    urgente:     'var(--error-suave)',
    informativo: 'var(--verde-suave)',
    academico:   'var(--color-estudiante-suave)'
  };
  const etiquetas = { urgente: 'Urgente', informativo: 'Informativo', academico: 'Académico' };
  const badgeClass = { urgente: 'badge-error', informativo: 'badge-exito', academico: 'badge-azul' };

  contenedor.innerHTML = filtrados.map(c => `
    <div class="comunicado-card ${!c.leido ? 'no-leido' : ''}" id="com-${c.id}" onclick="abrirComunicado(${c.id})">
      <div class="com-card-left">
        <div class="com-card-ico" style="background:${colores[c.tipo]}">${iconos[c.tipo]}</div>
      </div>
      <div class="com-card-body">
        <div class="com-card-top">
          <span class="badge ${badgeClass[c.tipo]}">${etiquetas[c.tipo]}</span>
          ${!c.leido ? '<span class="com-nuevo-dot"></span>' : ''}
          <span class="com-card-fecha">${c.fecha}</span>
        </div>
        <div class="com-card-titulo">${c.titulo}</div>
        <div class="com-card-emisor">${c.emisor}</div>
        <div class="com-card-preview">${c.cuerpo.substring(0, 100)}...</div>
      </div>
    </div>
  `).join('');
}

// Abrir comunicado en modal
function abrirComunicado(id) {
  const c = getComunicados().find(x => x.id === id);
  if (!c) return;

  marcarLeido(id);
  document.getElementById(`com-${id}`)?.classList.remove('no-leido');
  document.querySelector(`#com-${id} .com-nuevo-dot`)?.remove();

  const iconos = { urgente: '⚠️', informativo: '📢', academico: '🎓' };
  const colores = { urgente: 'var(--error-suave)', informativo: 'var(--verde-suave)', academico: 'var(--color-estudiante-suave)' };
  const badgeClass = { urgente: 'badge-error', informativo: 'badge-exito', academico: 'badge-azul' };
  const etiquetas = { urgente: 'Urgente', informativo: 'Informativo', academico: 'Académico' };

  document.getElementById('modal-ico').style.background = colores[c.tipo];
  document.getElementById('modal-ico').textContent = iconos[c.tipo];
  document.getElementById('modal-badge').className = `badge ${badgeClass[c.tipo]}`;
  document.getElementById('modal-badge').textContent = etiquetas[c.tipo];
  document.getElementById('modal-titulo').textContent = c.titulo;
  document.getElementById('modal-emisor').textContent = c.emisor;
  document.getElementById('modal-fecha').textContent = c.fecha;
  document.getElementById('modal-cuerpo').textContent = c.cuerpo;

  document.getElementById('modal-overlay').classList.add('open');
}

function cerrarModal() {
  document.getElementById('modal-overlay').classList.remove('open');
}

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', () => {
  initComunicados();
  actualizarBadges();
});