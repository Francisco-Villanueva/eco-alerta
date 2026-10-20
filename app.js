/* EcoAlerta — prototipo (Fase 1)
   La app no tiene datos propios: lee data/<localidad>.json y dibuja las pantallas.
   Para pasar a un backend, solo hay que cambiar obtenerLocalidad(). */

const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

const TIPOS_PUNTO = {
  punto_limpio: { nombre: 'Punto limpio', icono: 'reciclar', color: '#2e9e4f' },
  centro_reciclaje: { nombre: 'Centro de reciclaje', icono: 'galpon', color: '#546e7a' },
  contenedor: { nombre: 'Contenedor', icono: 'pin', color: '#1e88e5' },
  compostera: { nombre: 'Compostera', icono: 'hoja', color: '#f2a900' },
};

const SVG = {
  campana: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
  mapa: '<path d="M3 6l6-3 6 3 6-3v15l-6 3-6-3-6 3z"/><path d="M9 3v15M15 6v15"/>',
  calendario: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  hoja: '<path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.5 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>',
  casa: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
  ajustes: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  lupa: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
  reloj: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  der: '<path d="M9 6l6 6-6 6"/>',
  abajo: '<path d="M6 9l6 6 6-6"/>',
  descargar: '<path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/>',
  galpon: '<path d="M3 21V9l9-6 9 6v12"/><path d="M8 21v-7h8v7"/>',
  libro: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/><path d="M9 8h6"/>',
};

const COLORES = ['verde', 'azul', 'amarillo', 'marron', 'gris'];
const claseColor = (c) => (COLORES.includes(norm(c || '')) ? norm(c) : 'gris');
const LETRAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const ORDEN_SEMANA = [1, 2, 3, 4, 5, 6, 0];
const reducirMovimiento = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const estado = { localidades: [], loc: null, zona: null, filtroMapa: null, busqueda: '', mapa: null, capa: null, marcadores: {} };
const cache = {};

/* ---------- utilidades ---------- */

function el(tag, props, ...hijos) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(props || {})) {
    if (k === 'class') n.className = v;
    else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined && v !== false) n.setAttribute(k, v === true ? '' : v);
  }
  for (const h of hijos.flat(Infinity)) {
    if (h === null || h === undefined || h === false) continue;
    n.append(h.nodeType ? h : document.createTextNode(h));
  }
  return n;
}

/* Como replaceChildren, pero ignora null/false y aplana listas anidadas. */
function pintar(cont, ...hijos) {
  cont.replaceChildren(...hijos.flat(Infinity).filter((h) => h !== null && h !== undefined && h !== false));
}

/* Icono SVG de línea (los trazados son constantes de este archivo). */
function ico(nombre) {
  const s = el('span', { class: 'ico', 'aria-hidden': 'true' });
  if (nombre === 'reciclar') s.innerHTML = '<span class="glifo">♻︎</span>';
  else s.innerHTML = `<svg viewBox="0 0 24 24">${SVG[nombre]}</svg>`;
  return s;
}

const $ = (sel) => document.querySelector(sel);
const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const mayus = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const inicioDia = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const diasHasta = (d) => Math.round((inicioDia(d) - inicioDia(new Date())) / 864e5);
const fmtFecha = (d) => `${d.getDate()} de ${MESES[d.getMonth()]}`;
const parseFecha = (t) => { const [a, m, d] = t.split('-').map(Number); return new Date(a, m - 1, d); };

function guardar(clave, valor) {
  try { localStorage.setItem(clave, valor); } catch (e) { /* sin almacenamiento */ }
}
function leer(clave) {
  try { return localStorage.getItem(clave); } catch (e) { return null; }
}

/* ---------- datos ---------- */

async function obtenerLocalidad(id) {
  if (cache[id]) return cache[id];
  const info = estado.localidades.find((l) => l.id === id);
  const resp = await fetch(`data/${info.archivo}`);
  if (!resp.ok) throw new Error(`No se pudo cargar ${info.archivo}`);
  cache[id] = await resp.json();
  return cache[id];
}

/* ---------- lógica ---------- */

function proximasRecolecciones(loc, zona) {
  const ahora = new Date();
  const res = [];
  for (const r of loc.recoleccion) {
    if (r.zona && zona && r.zona !== zona) continue;
    const dia = DIAS.findIndex((d) => norm(d) === norm(r.dia));
    if (dia < 0) continue;
    const [hh, mm] = (r.horario || '00:00').split(':').map(Number);
    const [fh, fm] = (r.horario_fin || r.horario || '00:00').split(':').map(Number);
    // "recordatorio" puede ser un objeto o una lista de objetos (varios avisos para la misma recolección).
    const configAvisos = [].concat(r.recordatorio || {});
    for (let n = 0; n < 8; n++) {
      const f = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + n, hh, mm);
      const fin = new Date(f.getFullYear(), f.getMonth(), f.getDate(), fh, fm);
      if (f.getDay() === dia && fin >= ahora) {
        const avisos = configAvisos.map((c) => {
          const [ah, am] = (c.hora || '20:00').split(':').map(Number);
          return new Date(f.getFullYear(), f.getMonth(), f.getDate() - (c.dias_antes != null ? c.dias_antes : 1), ah, am);
        }).sort((a, b) => a - b);
        res.push({ ...r, fecha: f, fin, avisos, avisoDesde: avisos[0] });
        break;
      }
    }
  }
  return res.sort((a, b) => a.fecha - b.fecha);
}

function cuando(fecha) {
  const n = diasHasta(fecha);
  if (n === 0) return 'hoy';
  if (n === 1) return 'mañana';
  return `el ${DIAS[fecha.getDay()]} ${fecha.getDate()} de ${MESES[fecha.getMonth()]}`;
}

/* Fechas clave (se repiten cada año) + eventos con fecha completa, desde hoy en adelante. */
function proximasFechas(loc) {
  const hoy = inicioDia(new Date());
  const limite = new Date(hoy.getFullYear() + 1, hoy.getMonth(), hoy.getDate());
  const items = [];
  for (const f of loc.fechas_clave || []) {
    for (const anio of [hoy.getFullYear(), hoy.getFullYear() + 1]) {
      const ini = parseFecha(`${anio}-${f.fecha}`);
      const fin = f.fecha_fin ? parseFecha(`${anio}-${f.fecha_fin}`) : ini;
      if (fin >= hoy && ini <= limite) {
        items.push({ tipo: 'fecha', titulo: f.titulo, descripcion: f.descripcion, inicio: ini, fin });
      }
    }
  }
  for (const e of loc.eventos || []) {
    const ini = parseFecha(e.fecha);
    if (ini >= hoy) {
      const donde = [e.lugar, e.organiza && `Organiza: ${e.organiza}`].filter(Boolean).join(' · ');
      items.push({ tipo: 'evento', titulo: e.titulo, descripcion: [e.descripcion, donde].filter(Boolean).join('\n'), inicio: ini, fin: ini });
    }
  }
  return items.sort((a, b) => a.inicio - b.inicio);
}

const rangoFecha = (it) => (it.fin > it.inicio ? `${fmtFecha(it.inicio)} al ${fmtFecha(it.fin)}` : fmtFecha(it.inicio));

/* ---------- recordatorios ---------- */

const recordatorioActivo = () => leer('recordatorio') === '1';

function textoAviso(r) {
  return `${mayus(cuando(r.fecha))} pasa el camión de ${r.tipo.toLowerCase()}.${r.aviso ? ` ¡${r.aviso}!` : ''}`;
}

/* Horario de la recolección: "de 6:00 a 12:00 hs" (o "6:00 hs" si no hay hora de fin). */
function horarioTxt(r) {
  const h = (s) => s.replace(/^0/, '');
  return r.horario_fin ? `de ${h(r.horario)} a ${h(r.horario_fin)} hs` : `${h(r.horario)} hs`;
}

/* Cuándo se avisa, por ejemplo "el miércoles a las 21:00". */
function cuandoAvisamos(r) {
  const d = r.avisoDesde;
  return `el ${DIAS[d.getDay()]} a las ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
}

const enVentanaAviso = (r) => new Date() >= r.avisoDesde;

let temporizadoresAviso = [];

function avisosEnviados() {
  try { return JSON.parse(leer('avisosEnviados') || '[]'); } catch (e) { return []; }
}

/* Con la app abierta: avisa al llegar la hora de cada recordatorio (o enseguida, si ya pasó). */
function notificarSiCorresponde(r) {
  temporizadoresAviso.forEach(clearTimeout);
  temporizadoresAviso = [];
  if (!recordatorioActivo() || !r) return;

  for (const aviso of r.avisos) {
    const enviar = () => {
      const marca = `${estado.loc.id}|${r.zona || ''}|${aviso.getTime()}`;
      const enviados = avisosEnviados();
      if (enviados.includes(marca)) return;
      if ('Notification' in window && Notification.permission === 'granted') {
        try {
          new Notification('EcoAlerta', { body: textoAviso(r) });
          guardar('avisosEnviados', JSON.stringify([...enviados, marca].slice(-30)));
        } catch (e) { /* ignorar */ }
      }
    };
    const falta = aviso - new Date();
    if (falta <= 0) enviar();
    else if (falta < 2 ** 31 - 1) temporizadoresAviso.push(setTimeout(enviar, falta));
  }
}

async function alternarRecordatorio() {
  if (!recordatorioActivo() && 'Notification' in window && Notification.permission === 'default') {
    try { await Notification.requestPermission(); } catch (e) { /* ignorar */ }
  }
  guardar('recordatorio', recordatorioActivo() ? '0' : '1');
  irA(pestanaActual(), false);
}

/* ---------- mapa y lista de lugares ---------- */

function puntosVisibles() {
  const q = norm(estado.busqueda.trim());
  return estado.loc.puntos.filter((p) =>
    (!estado.filtroMapa || p.tipo === estado.filtroMapa) &&
    (!q || norm(`${p.nombre} ${p.direccion} ${TIPOS_PUNTO[p.tipo].nombre}`).includes(q)));
}

function enlaceMapa(p) {
  const q = p.lat != null ? `${p.lat},${p.lng}` : encodeURIComponent(`${p.direccion}, ${estado.loc.nombre}`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

function enfocarPunto(p) {
  const m = estado.marcadores[p.id];
  if (m && estado.mapa) {
    $('.mapa-caja').scrollIntoView({ behavior: reducirMovimiento() ? 'auto' : 'smooth', block: 'center' });
    estado.mapa.flyTo(m.getLatLng(), 16, { duration: reducirMovimiento() ? 0 : 0.9 });
    m.openPopup();
  } else if (tabActual !== 'mapa') {
    estado.enfocar = p.id;
    irA('mapa');
  } else {
    window.open(enlaceMapa(p), '_blank', 'noopener');
  }
}

function tarjetaLugar(p) {
  const t = TIPOS_PUNTO[p.tipo];
  return el('button', { class: 'item', onclick: () => enfocarPunto(p) },
    el('span', { class: 'tile', style: `--tono:${t.color}` }, ico(t.icono)),
    el('span', { class: 'cuerpo' },
      el('b', {}, p.nombre),
      el('small', {}, p.direccion),
      el('small', {}, p.horario || 'Horario a confirmar')),
    el('span', { class: 'flecha' }, ico('der')));
}

/* Redibuja marcadores, filtros y lista sin recrear el buscador (para no perder el foco). */
function refrescarPuntos(max) {
  const visibles = puntosVisibles();

  if (estado.mapa) {
    estado.capa.clearLayers();
    estado.marcadores = {};
    const coords = [];
    for (const p of visibles) {
      if (p.lat == null) continue;
      const t = TIPOS_PUNTO[p.tipo];
      const icon = L.divIcon({
        className: '',
        html: `<div class="gota" style="background:${t.color}"><span>${p.tipo === 'punto_limpio' ? '♻︎' : ''}</span></div>`,
        iconSize: [30, 30],
        iconAnchor: [8, 34],
        popupAnchor: [7, -34],
      });
      const popup = el('div', {}, el('b', {}, p.nombre), el('br'), p.direccion, el('br'), p.horario || 'Horario a confirmar', el('br'),
        el('a', { class: 'enlace', href: enlaceMapa(p), target: '_blank', rel: 'noopener' }, 'Cómo llegar'));
      estado.marcadores[p.id] = L.marker([p.lat, p.lng], { icon }).bindPopup(popup).addTo(estado.capa);
      coords.push([p.lat, p.lng]);
    }
    if (coords.length > 1) estado.mapa.fitBounds(coords, { padding: [40, 40], animate: true, duration: 0.7 });
    else if (coords.length === 1) estado.mapa.setView(coords[0], 15);
  }

  const filtros = $('#leyenda');
  if (filtros) {
    const tipos = [...new Set(estado.loc.puntos.map((p) => p.tipo))];
    pintar(filtros, tipos.map((t) => el('button', {
      class: estado.filtroMapa === t ? 'activo' : '',
      'aria-pressed': String(estado.filtroMapa === t),
      onclick: () => { estado.filtroMapa = estado.filtroMapa === t ? null : t; refrescarPuntos(max); },
    }, el('span', { class: 'punto', style: `background:${TIPOS_PUNTO[t].color}` }), TIPOS_PUNTO[t].nombre)));
  }

  const lista = max ? visibles.slice(0, max) : visibles;
  pintar($('#lista-lugares'), lista.length
    ? lista.map(tarjetaLugar)
    : el('div', { class: 'vacio' }, 'No encontramos lugares con ese filtro.'));
}

function campoBusqueda(placeholder, etiqueta, valor) {
  return el('label', { class: 'campo' }, ico('lupa'),
    el('input', { type: 'search', id: 'buscar-lugares', placeholder, 'aria-label': etiqueta, value: valor || '' }));
}

/* Mapa con filtros. Devuelve los elementos; hay que llamar a iniciarMapa() cuando ya están en pantalla. */
function bloqueMapa() {
  return [
    campoBusqueda('Buscar un punto limpio o centro', 'Buscar lugares', estado.busqueda),
    el('div', { class: 'filtros', id: 'leyenda', role: 'group', 'aria-label': 'Tipo de lugar' }),
    el('div', { class: 'mapa-caja' }, el('div', { class: 'mapa-lienzo', id: 'mapa-lienzo' })),
  ];
}

function iniciarMapa(max) {
  const lienzo = $('#mapa-lienzo');
  $('#buscar-lugares').addEventListener('input', (e) => { estado.busqueda = e.target.value; refrescarPuntos(max); });
  if (window.L) {
    estado.mapa = L.map(lienzo).setView(estado.loc.centro, 14);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(estado.mapa);
    estado.capa = L.layerGroup().addTo(estado.mapa);
  } else {
    pintar(lienzo, el('p', { class: 'vacio', style: 'padding-top:120px' }, 'No se pudo cargar el mapa. Revisá tu conexión; la lista de lugares sigue disponible.'));
  }
  refrescarPuntos(max);
}

function destruirMapa() {
  if (estado.mapa) { estado.mapa.remove(); estado.mapa = null; estado.capa = null; }
  estado.marcadores = {};
}

/* ---------- pantallas ---------- */

function avisoDemo() {
  return estado.loc.demo ? el('p', { class: 'nota-demo' }, 'Datos ficticios de demostración') : null;
}

function interruptorRecordatorio() {
  const activo = recordatorioActivo();
  return el('button', { class: 'interruptor', role: 'switch', 'aria-checked': String(activo), 'aria-label': 'Recordatorio de recolección', onclick: alternarRecordatorio });
}

function tarjetaProxima(prox, loc, zona) {
  if (!prox) {
    return el('section', { class: 'hero sin-datos' },
      el('p', { class: 'hero-previa' }, 'Recolección'),
      el('h2', { class: 'hero-palabra' }, el('span', {}, 'Sin cargar todavía')),
      el('p', { class: 'hero-hora' }, `Aún no tenemos los días y horarios de ${loc.nombre}. Mientras tanto, mirá adónde llevar tus residuos.`));
  }

  const n = diasHasta(prox.fecha);
  const palabra = n === 0 ? 'Hoy' : n === 1 ? 'Mañana' : mayus(DIAS[prox.fecha.getDay()]);
  const hora = prox.horario ? horarioTxt(prox) : '';
  const detalle = n > 1 ? [fmtFecha(prox.fecha), hora].filter(Boolean).join(', ') : hora;

  const porDia = {};
  for (const r of loc.recoleccion) {
    if (r.zona && zona && r.zona !== zona) continue;
    const d = DIAS.findIndex((x) => norm(x) === norm(r.dia));
    if (d >= 0) (porDia[d] = porDia[d] || []).push(r);
  }
  const hoy = new Date().getDay();

  return el('section', { class: 'hero' },
    el('p', { class: 'hero-previa' }, 'Próxima recolección'),
    el('h2', { class: 'hero-palabra' }, el('span', {}, palabra)),
    el('p', { class: 'hero-tipo' }, el('span', { class: `punto ${claseColor(prox.color)}` }), prox.tipo),
    detalle && el('p', { class: 'hero-hora' }, detalle),
    enVentanaAviso(prox) && prox.aviso && el('p', { class: 'hero-aviso' }, prox.aviso),
    el('ol', { class: 'semana', 'aria-label': 'Recolección de la semana' },
      ORDEN_SEMANA.map((d, i) => el('li', {
        class: `dia${d === hoy ? ' hoy' : ''}`,
        'aria-label': `${mayus(DIAS[d])}: ${porDia[d] ? porDia[d].map((r) => r.tipo).join(', ') : 'sin recolección'}`,
      },
      el('span', {}, LETRAS_SEMANA[i]),
      el('span', { class: 'marcas' }, (porDia[d] || []).map((r, k) => el('i', { class: `punto ${claseColor(r.color)}`, style: `--i:${i + k}` })))))),
    el('div', { class: 'hero-pie' }, el('span', {}, `Avisarme ${cuandoAvisamos(prox)}`), interruptorRecordatorio()));
}

function renderInicio() {
  const { loc, zona } = estado;
  const prox = proximasRecolecciones(loc, zona)[0];
  const noticias = [...(loc.noticias || [])].sort((a, b) => b.fecha.localeCompare(a.fecha)).slice(0, 2);

  pintar($('#tab-inicio'),
    avisoDemo(),
    tarjetaProxima(prox, loc, zona),
    el('div', { class: 'encabezado' },
      el('h3', {}, 'Dónde llevar tus residuos'),
      el('button', { class: 'ver-todos', onclick: () => irA('mapa') }, 'Ver mapa')),
    el('div', { class: 'lista', id: 'lista-lugares' }),
    noticias.length > 0 && el('div', { class: 'encabezado' },
      el('h3', {}, 'Novedades'),
      el('button', { class: 'ver-todos', onclick: () => irA('noticias') }, 'Ver todas')),
    noticias.length > 0 && el('div', { class: 'lista' },
      noticias.map((n) => el('div', { class: 'item' },
        el('span', { class: 'cuerpo' }, el('b', {}, n.titulo), el('small', {}, fmtFecha(parseFecha(n.fecha))))))));

  refrescarPuntos(3);
  notificarSiCorresponde(prox);
}

function renderMapa() {
  const { loc } = estado;
  pintar($('#tab-mapa'),
    el('h2', {}, 'Mapa'),
    avisoDemo(),
    bloqueMapa(),
    loc.puntos.some((p) => p.aprox) && el('p', { class: 'muted', style: 'margin-top:12px' }, 'Las ubicaciones del mapa son aproximadas.'),
    el('div', { class: 'encabezado' }, el('h3', {}, 'Lugares')),
    el('div', { class: 'lista', id: 'lista-lugares' }),
    el('div', { class: 'encabezado' }, el('h3', {}, 'Qué materiales se reciben')),
    el('div', { class: 'materiales' }, loc.materiales.aceptados.map((m) => el('span', { class: 'pastilla' }, m))),
    loc.materiales.condicion && el('p', { class: 'muted nota-materiales' }, loc.materiales.condicion));
  iniciarMapa(0);

  if (estado.enfocar) {
    const p = loc.puntos.find((x) => x.id === estado.enfocar);
    estado.enfocar = null;
    if (p) setTimeout(() => enfocarPunto(p), 450);
  }
}

function renderCalendario() {
  const { loc, zona } = estado;
  const semanal = loc.recoleccion.filter((r) => !r.zona || !zona || r.zona === zona);
  const bloqueSemanal = semanal.length
    ? el('div', { class: 'lista' }, semanal.map((r) => el('div', { class: 'item dia-semanal' },
        el('span', { class: `punto ${claseColor(r.color)}` }),
        el('span', { class: 'cuerpo' }, el('b', {}, mayus(r.dia)), el('small', {}, `${horarioTxt(r)}, ${r.tipo.toLowerCase()}`)))))
    : el('div', { class: 'vacio' }, 'El calendario de recolección todavía no está cargado.');

  // Cada mes es su propia lista, para que las líneas divisorias no crucen los encabezados.
  const meses = [];
  let mesActual = '';
  for (const it of proximasFechas(loc)) {
    const clave = `${MESES[it.inicio.getMonth()]} ${it.inicio.getFullYear()}`;
    if (clave !== mesActual) { meses.push({ titulo: mayus(clave), filas: [] }); mesActual = clave; }
    meses[meses.length - 1].filas.push(el('div', { class: 'item' },
      el('div', { class: 'fecha-col' }, el('b', {}, it.inicio.getDate()), el('small', {}, MESES[it.inicio.getMonth()].slice(0, 3))),
      el('div', { class: 'cuerpo' },
        el('b', {}, it.titulo),
        it.fin > it.inicio && el('p', {}, rangoFecha(it)),
        it.descripcion && el('p', { style: 'white-space: pre-line' }, it.descripcion),
        it.tipo === 'evento' && el('span', { class: 'pastilla' }, 'Evento local'))));
  }

  pintar($('#tab-calendario'),
    el('h2', {}, 'Calendario'),
    avisoDemo(),
    el('div', { class: 'encabezado' }, el('h3', {}, zona ? `Recolección semanal en ${zona}` : 'Recolección semanal')),
    bloqueSemanal,
    el('div', { class: 'encabezado' }, el('h3', {}, 'Fechas y eventos ambientales')),
    meses.length
      ? meses.map((m) => [el('h3', { class: 'mes' }, m.titulo), el('div', { class: 'lista' }, m.filas)])
      : el('div', { class: 'vacio' }, 'No hay fechas próximas.'));
}

function renderGuia(filtro = '') {
  const { loc } = estado;
  const q = norm(filtro.trim());
  const items = loc.guia.filter((g) => !q || norm(`${g.residuo} ${g.va_en} ${g.como_prepararlo}`).includes(q));
  const filas = items.length
    ? items.map((g) => el('div', { class: 'item' },
        el('div', { class: 'cuerpo' },
          el('b', {}, g.residuo),
          el('p', {}, g.como_prepararlo),
          el('span', { class: 'pastilla' }, `Va en ${g.va_en.charAt(0).toLowerCase()}${g.va_en.slice(1)}`))))
    : el('div', { class: 'vacio' }, 'No encontramos ese residuo en la guía.');

  if ($('#lista-guia')) { pintar($('#lista-guia'), filas); return; }

  const input = el('input', { type: 'search', placeholder: '¿Dónde tiro…? Por ejemplo, vidrio', 'aria-label': 'Buscar residuo' });
  input.addEventListener('input', () => renderGuia(input.value));
  pintar($('#tab-guia'),
    el('h2', {}, 'Guía de separación'),
    avisoDemo(),
    loc.guia_nota && el('p', { class: 'muted', style: 'margin-bottom:18px' }, loc.guia_nota),
    el('label', { class: 'campo' }, ico('lupa'), input),
    el('div', { class: 'lista', id: 'lista-guia' }, filas));
}

function renderNoticias() {
  const noticias = [...(estado.loc.noticias || [])].sort((a, b) => b.fecha.localeCompare(a.fecha));
  pintar($('#tab-noticias'),
    el('button', { class: 'volver', onclick: () => irA('inicio') }, ico('der'), 'Inicio'),
    el('h2', {}, 'Noticias e iniciativas'),
    avisoDemo(),
    noticias.length
      ? el('div', { class: 'lista' }, noticias.map((n) => el('div', { class: 'item' },
          el('div', { class: 'cuerpo' },
            el('b', {}, n.titulo),
            el('p', {}, n.resumen),
            el('small', { style: 'margin-top:8px' }, fmtFecha(parseFecha(n.fecha)))))))
      : el('div', { class: 'vacio' }, `Todavía no hay noticias cargadas para ${estado.loc.nombre}.`));
}

function renderAjustes() {
  const { loc, zona } = estado;
  const negrita = 'display:inline;font-weight:600;color:var(--tinta)';
  pintar($('#tab-ajustes'),
    el('h2', {}, 'Ajustes'),
    avisoDemo(),
    el('div', { class: 'grupo' },
      el('div', { class: 'item' },
        el('div', { class: 'cuerpo' }, el('b', {}, 'Tu localidad'), el('p', {}, `${loc.nombre}${zona ? ', ' + zona : ''}`)),
        el('button', { class: 'btn btn-peq', onclick: () => mostrarBienvenida(true) }, 'Cambiar')),
      el('div', { class: 'item' },
        el('div', { class: 'cuerpo' }, el('b', {}, 'Recordatorios'), el('p', {}, recordatorioActivo() ? 'Te avisamos antes de la recolección.' : 'Desactivados.')),
        interruptorRecordatorio())),
    el('div', { class: 'grupo' },
      el('div', { class: 'item' },
        el('div', { class: 'cuerpo' },
          el('b', {}, 'Instalar la app'),
          estaInstalada()
            ? el('p', {}, 'Ya está instalada en este dispositivo.')
            : [
                el('p', {}, el('b', { style: negrita }, 'Android (Chrome): '), 'abrí el menú ⋮ y elegí «Instalar app».'),
                el('p', {}, el('b', { style: negrita }, 'iPhone (Safari): '), 'tocá Compartir y elegí «Agregar a inicio».'),
                eventoInstalacion && el('button', { class: 'btn btn-peq btn-icono', style: 'margin-top:14px', onclick: instalarApp }, ico('descargar'), 'Instalar ahora'),
              ]))),
    el('div', { class: 'grupo' },
      el('div', { class: 'item' },
        el('div', { class: 'cuerpo' },
          el('b', {}, 'Acerca de EcoAlerta'),
          el('p', {}, 'Prototipo escolar. Los datos de cada localidad se cargaron a mano y las ubicaciones del mapa son aproximadas. Los recordatorios funcionan con la app abierta.')))));
}

/* ---------- navegación ---------- */

const RENDER = { inicio: renderInicio, calendario: renderCalendario, mapa: renderMapa, guia: () => renderGuia(), noticias: renderNoticias, ajustes: renderAjustes };
const NAV = [['inicio', 'casa', 'Inicio'], ['calendario', 'calendario', 'Calendario'], ['mapa', 'pin', 'Mapa'], ['guia', 'libro', 'Guía'], ['ajustes', 'ajustes', 'Ajustes']];
let tabActual = 'inicio';
let pasoNavegacion = 0;
const pestanaActual = () => tabActual;

/* Entrada escalonada: cada bloque y cada fila de lista aparece un instante después del anterior. */
function escalonar(seccion) {
  const nodos = [...seccion.querySelectorAll(':scope > *, .lista > *')].filter((n) => !n.classList.contains('lista'));
  nodos.forEach((n, i) => { n.style.setProperty('--i', Math.min(i, 9)); n.classList.add('ent'); });
}

async function irA(tab, animar = true) {
  const paso = ++pasoNavegacion;
  const previa = document.querySelector('.tab:not([hidden])');
  const cambia = tab !== tabActual;

  if (cambia && animar && !reducirMovimiento() && previa && !$('#principal').hidden) {
    previa.classList.add('sale');
    await esperar(150);
    if (paso !== pasoNavegacion) return;
    previa.classList.remove('sale');
  }

  if (cambia) { estado.busqueda = ''; estado.filtroMapa = null; }
  tabActual = tab;
  destruirMapa();
  const seccion = $(`#tab-${tab}`);
  document.querySelectorAll('.tab').forEach((s) => { s.hidden = s.id !== `tab-${tab}`; });
  const activa = tab === 'noticias' ? 'inicio' : tab;
  document.querySelectorAll('#nav button').forEach((b) => {
    const on = b.dataset.tab === activa;
    b.classList.toggle('activa', on);
    if (on) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  });
  $('#nav').style.setProperty('--pos', String(Math.max(0, NAV.findIndex(([t]) => t === activa))));

  seccion.classList.toggle('quieto', !animar);
  RENDER[tab]();
  if (animar) { escalonar(seccion); window.scrollTo(0, 0); }
}

function mostrarApp() {
  $('#bienvenida').hidden = true;
  ['#cabecera', '#principal', '#nav'].forEach((s) => { $(s).hidden = false; });
  pintar($('#btn-cambiar'), ico('pin'), el('span', { class: 't' }, `${estado.loc.nombre}${estado.zona ? ' · ' + estado.zona : ''}`), ico('abajo'));
  estado.filtroMapa = null;
  estado.busqueda = '';
  irA('inicio');
  setTimeout(evaluarToastInstalar, 2500);
}

/* ---------- bienvenida ---------- */

async function actualizarZonas() {
  const id = $('#sel-localidad').value;
  const info = estado.localidades.find((l) => l.id === id);
  $('#aviso-demo').hidden = !info.demo;
  const loc = await obtenerLocalidad(id);
  const zonas = loc.zonas || [];
  $('#grupo-zona').hidden = zonas.length === 0;
  pintar($('#sel-zona'), zonas.map((z) => el('option', { value: z }, z)));
}

async function elegirLocalidad() {
  const id = $('#sel-localidad').value;
  estado.loc = await obtenerLocalidad(id);
  estado.zona = estado.loc.zonas.length ? $('#sel-zona').value : null;
  guardar('localidad', id);
  guardar('zona', estado.zona || '');
  mostrarApp();
}

function mostrarBienvenida(puedeCancelar) {
  destruirMapa();
  $('#bienvenida').hidden = false;
  ['#cabecera', '#principal', '#nav'].forEach((s) => { $(s).hidden = true; });
  $('#btn-cancelar').hidden = !puedeCancelar;
  if (estado.loc) $('#sel-localidad').value = estado.loc.id;
  actualizarZonas();
}

async function iniciar() {
  try {
    const resp = await fetch('data/localidades.json');
    estado.localidades = await resp.json();
  } catch (e) {
    document.body.replaceChildren(el('p', { style: 'padding:24px' },
      'No se pudieron cargar los datos. Abrí la app desde un servidor local (por ejemplo: python -m http.server) y no directamente desde el archivo.'));
    return;
  }

  pintar($('#logo-bienvenida'), ico('hoja'));
  pintar($('#logo-cabecera'), ico('hoja'));
  pintar($('#nav'), el('span', { class: 'nav-ind', 'aria-hidden': 'true' }), NAV.map(([tab, icono, texto]) =>
    el('button', { 'data-tab': tab, onclick: () => irA(tab) }, ico(icono), texto)));
  window.addEventListener('scroll', () => $('#cabecera').classList.toggle('con-borde', window.scrollY > 4), { passive: true });
  pintar($('#sel-localidad'), estado.localidades.map((l) => el('option', { value: l.id }, l.nombre)));
  $('#sel-localidad').addEventListener('change', actualizarZonas);
  $('#btn-empezar').addEventListener('click', elegirLocalidad);
  $('#btn-cancelar').addEventListener('click', mostrarApp);
  $('#btn-cambiar').addEventListener('click', () => mostrarBienvenida(true));

  const guardada = leer('localidad');
  if (guardada && estado.localidades.some((l) => l.id === guardada)) {
    estado.loc = await obtenerLocalidad(guardada);
    const zona = leer('zona');
    estado.zona = estado.loc.zonas.includes(zona) ? zona : (estado.loc.zonas[0] || null);
    mostrarApp();
  } else {
    mostrarBienvenida(false);
  }
}

iniciar();

/* ---------- PWA: service worker y aviso de instalación ---------- */

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}

const SIETE_DIAS = 7 * 24 * 60 * 60 * 1000;
let eventoInstalacion = null;

const estaInstalada = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
const esIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

function ocultarToast() {
  const t = $('#toast-instalar');
  if (!t) return;
  t.classList.add('saliendo');
  setTimeout(() => t.remove(), reducirMovimiento() ? 0 : 350);
}

async function instalarApp() {
  if (!eventoInstalacion) return;
  eventoInstalacion.prompt();
  try { await eventoInstalacion.userChoice; } catch (e) { /* ignorar */ }
  eventoInstalacion = null;
  ocultarToast();
}

function evaluarToastInstalar() {
  if ($('#toast-instalar') || $('#principal').hidden || estaInstalada()) return;
  if (!eventoInstalacion && !esIOS()) return;
  if (Date.now() - Number(leer('instalarDescartado') || 0) < SIETE_DIAS) return;

  const descartar = () => { guardar('instalarDescartado', String(Date.now())); ocultarToast(); };
  const texto = eventoInstalacion
    ? 'Tenela en tu pantalla de inicio y usala sin abrir el navegador.'
    : 'Tocá Compartir y elegí «Agregar a inicio».';

  document.body.append(el('div', { id: 'toast-instalar', class: 'toast', role: 'status' },
    el('img', { src: 'icons/icon-192.png', alt: '', width: '44', height: '44' }),
    el('div', { class: 'toast-texto' }, el('b', {}, 'Instalá EcoAlerta'), el('span', {}, texto)),
    el('div', { class: 'toast-acciones' },
      eventoInstalacion && el('button', { class: 'btn btn-peq', onclick: instalarApp }, 'Instalar'),
      el('button', { class: 'toast-cerrar', onclick: descartar }, 'Ahora no'))));
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  eventoInstalacion = e;
  setTimeout(evaluarToastInstalar, 2500);
});

window.addEventListener('appinstalled', () => { eventoInstalacion = null; ocultarToast(); });
