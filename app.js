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
  galpon: '<path d="M3 21V9l9-6 9 6v12"/><path d="M8 21v-7h8v7"/>',
};

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
    for (let n = 0; n < 8; n++) {
      const f = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate() + n, hh, mm);
      if (f.getDay() === dia && f >= ahora) { res.push({ ...r, fecha: f }); break; }
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

function notificarSiCorresponde(r) {
  if (!recordatorioActivo() || !r || diasHasta(r.fecha) > 1) return;
  const marca = `${estado.loc.id}|${r.zona || ''}|${r.fecha.toDateString()}`;
  if (leer('ultimoAviso') === marca) return;
  if ('Notification' in window && Notification.permission === 'granted') {
    try { new Notification('EcoAlerta', { body: textoAviso(r) }); guardar('ultimoAviso', marca); } catch (e) { /* ignorar */ }
  }
}

async function alternarRecordatorio() {
  if (!recordatorioActivo() && 'Notification' in window && Notification.permission === 'default') {
    try { await Notification.requestPermission(); } catch (e) { /* ignorar */ }
  }
  guardar('recordatorio', recordatorioActivo() ? '0' : '1');
  irA(pestanaActual());
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
    $('.mapa-caja').scrollIntoView({ behavior: 'smooth', block: 'center' });
    estado.mapa.setView(m.getLatLng(), 16);
    m.openPopup();
  } else {
    window.open(enlaceMapa(p), '_blank', 'noopener');
  }
}

function tarjetaLugar(p) {
  const t = TIPOS_PUNTO[p.tipo];
  return el('button', { class: 'lugar', onclick: () => enfocarPunto(p) },
    el('span', { class: 'miniatura', style: `background:${t.color}` }, ico(t.icono)),
    el('span', { class: 'info' },
      el('span', { class: 'etiqueta' }, t.nombre),
      el('b', {}, p.nombre),
      el('small', {}, ico('pin'), p.direccion),
      el('small', {}, ico('reloj'), p.horario || 'Horario a confirmar')),
    el('span', { class: 'flecha' }, ico('der')));
}

/* Redibuja marcadores, leyenda y lista sin recrear el buscador (para no perder el foco). */
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
      const popup = el('div', {}, el('b', {}, p.nombre), el('br'), p.direccion, el('br'), `🕒 ${p.horario || 'Horario a confirmar'}`, el('br'),
        el('a', { class: 'enlace', href: enlaceMapa(p), target: '_blank', rel: 'noopener' }, 'Cómo llegar →'));
      estado.marcadores[p.id] = L.marker([p.lat, p.lng], { icon }).bindPopup(popup).addTo(estado.capa);
      coords.push([p.lat, p.lng]);
    }
    if (coords.length > 1) estado.mapa.fitBounds(coords, { paddingTopLeft: [30, 70], paddingBottomRight: [30, 70] });
    else if (coords.length === 1) estado.mapa.setView(coords[0], 15);
  }

  const tipos = [...new Set(estado.loc.puntos.map((p) => p.tipo))];
  pintar($('#leyenda'), tipos.map((t) => el('button', {
    class: estado.filtroMapa === t ? 'activo' : '',
    onclick: () => { estado.filtroMapa = estado.filtroMapa === t ? null : t; refrescarPuntos(max); },
  }, el('span', { class: 'bolita', style: `background:${TIPOS_PUNTO[t].color}` }, ico(TIPOS_PUNTO[t].icono)), TIPOS_PUNTO[t].nombre)));

  const lista = max ? visibles.slice(0, max) : visibles;
  pintar($('#lista-lugares'), lista.length
    ? lista.map(tarjetaLugar)
    : el('div', { class: 'vacio' }, 'No encontramos lugares con ese filtro.'));
}

/* Mapa con buscador y leyenda. Devuelve el elemento; hay que llamar a iniciarMapa() cuando ya está en pantalla. */
function bloqueMapa(alto) {
  const input = el('input', { type: 'search', placeholder: 'Buscar un punto limpio, centro de reciclaje…', 'aria-label': 'Buscar lugares', value: estado.busqueda });
  return el('div', { class: `mapa-caja${alto ? ' alto' : ''}` },
    el('div', { class: 'buscador' }, ico('lupa'), input),
    el('div', { class: 'mapa-lienzo', id: 'mapa-lienzo' }),
    el('div', { class: 'leyenda', id: 'leyenda' }));
}

function iniciarMapa(max) {
  const lienzo = $('#mapa-lienzo');
  $('.buscador input').addEventListener('input', (e) => { estado.busqueda = e.target.value; refrescarPuntos(max); });
  if (window.L) {
    estado.mapa = L.map(lienzo).setView(estado.loc.centro, 14);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(estado.mapa);
    estado.capa = L.layerGroup().addTo(estado.mapa);
  } else {
    pintar(lienzo, el('p', { class: 'vacio', style: 'margin:60px 16px' }, 'No se pudo cargar el mapa (¿sin conexión?). Mirá la lista de lugares.'));
  }
  refrescarPuntos(max);
}

function destruirMapa() {
  if (estado.mapa) { estado.mapa.remove(); estado.mapa = null; estado.capa = null; }
  estado.marcadores = {};
}

/* ---------- pantallas ---------- */

function avisoDemo() {
  return estado.loc.demo ? el('p', { class: 'aviso', style: 'margin:0 0 12px' }, '⚠️ Datos ficticios de demostración.') : null;
}

function renderInicio() {
  const { loc, zona } = estado;
  const prox = proximasRecolecciones(loc, zona)[0];
  const cerca = prox && diasHasta(prox.fecha) <= 1;

  let aviso;
  if (prox) {
    aviso = el('div', { class: `aviso-card${cerca ? ' urgente' : ''}`, role: 'button', tabindex: '0', onclick: () => irA('calendario') },
      el('span', { class: 'campana' }, ico('campana')),
      el('span', { class: 'cuerpo' },
        el('b', {}, `Próxima recolección de ${prox.tipo.toLowerCase()}`),
        el('p', {}, `El camión pasa ${cuando(prox.fecha)}.`),
        cerca && prox.aviso && el('p', {}, `¡${prox.aviso}!`),
        el('button', { class: 'accion', onclick: (e) => { e.stopPropagation(); alternarRecordatorio(); } },
          recordatorioActivo() ? '🔔 Recordatorio activado (tocá para desactivar)' : 'Activar recordatorio')),
      el('span', { class: 'flecha' }, ico('der')));
  } else {
    aviso = el('div', { class: 'aviso-card', role: 'button', tabindex: '0', onclick: () => irA('calendario') },
      el('span', { class: 'campana' }, ico('campana')),
      el('span', { class: 'cuerpo' },
        el('b', {}, 'Recolección pendiente de carga'),
        el('p', {}, `Todavía no cargamos los días y horarios de ${loc.nombre}.`)),
      el('span', { class: 'flecha' }, ico('der')));
  }

  const acceso = (tab, icono, texto, principal) =>
    el('button', { class: `acceso${principal ? ' principal' : ''}`, onclick: () => irA(tab) }, ico(icono), texto);

  pintar($('#tab-inicio'),
    avisoDemo(),
    aviso,
    el('div', { class: 'accesos' },
      acceso('mapa', 'mapa', 'Mapa', true),
      acceso('calendario', 'calendario', 'Calendario'),
      acceso('guia', 'reciclar', 'Guía de reciclaje'),
      acceso('noticias', 'hoja', 'Noticias')),
    el('div', { style: 'height:14px' }),
    bloqueMapa(false),
    el('div', { class: 'titulo-fila' },
      el('h3', {}, 'Lugares cercanos'),
      el('button', { class: 'ver-todos', onclick: () => irA('mapa') }, 'Ver todos →')),
    el('div', { id: 'lista-lugares' }));

  iniciarMapa(3);
  notificarSiCorresponde(prox);
}

function renderMapa() {
  const { loc } = estado;
  pintar($('#tab-mapa'),
    el('h2', {}, 'Mapa'),
    avisoDemo(),
    bloqueMapa(true),
    estado.loc.puntos.some((p) => p.aprox) && el('p', { class: 'muted' }, 'Las ubicaciones del mapa son aproximadas.'),
    el('h3', {}, 'Lugares'),
    el('div', { id: 'lista-lugares' }),
    el('h3', {}, 'Qué materiales se reciben'),
    el('div', { class: 'card' },
      el('p', { style: 'margin:0;color:var(--texto)' }, loc.materiales.aceptados.join(' · ')),
      loc.materiales.condicion && el('p', {}, loc.materiales.condicion)));
  iniciarMapa(0);
}

function renderCalendario() {
  const { loc, zona } = estado;
  const semanal = loc.recoleccion.filter((r) => !r.zona || !zona || r.zona === zona);
  const bloqueSemanal = semanal.length
    ? semanal.map((r) => el('div', { class: 'card' },
        el('h4', {}, el('span', { class: `punto ${r.color || 'gris'}` }), `${mayus(r.dia)}, ${r.horario} hs`),
        el('p', {}, r.tipo)))
    : el('div', { class: 'vacio' }, 'Calendario de recolección pendiente de carga.');

  let mesActual = '';
  const lista = proximasFechas(loc).map((it) => {
    const clave = `${MESES[it.inicio.getMonth()]} ${it.inicio.getFullYear()}`;
    const encabezado = clave !== mesActual ? el('h3', {}, mayus(clave)) : null;
    mesActual = clave;
    return [encabezado, el('div', { class: 'card fila' },
      el('div', { class: 'fecha-caja' }, el('b', {}, it.inicio.getDate()), el('small', {}, MESES[it.inicio.getMonth()].slice(0, 3))),
      el('div', {},
        el('span', { class: `etiqueta ${it.tipo === 'evento' ? 'evento' : ''}` }, it.tipo === 'evento' ? 'Evento' : 'Fecha ambiental'),
        el('h4', {}, it.titulo),
        it.fin > it.inicio && el('p', {}, rangoFecha(it)),
        it.descripcion && el('p', { style: 'white-space: pre-line' }, it.descripcion)))];
  });

  pintar($('#tab-calendario'),
    el('h2', {}, 'Calendario'),
    avisoDemo(),
    el('h3', {}, 'Recolección semanal' + (zona ? ` · ${zona}` : '')),
    bloqueSemanal,
    el('h3', {}, 'Fechas y eventos ambientales'),
    lista);
}

function renderGuia(filtro = '') {
  const { loc } = estado;
  const q = norm(filtro.trim());
  const items = loc.guia.filter((g) => !q || norm(`${g.residuo} ${g.va_en} ${g.como_prepararlo}`).includes(q));
  const tarjetas = items.length
    ? items.map((g) => el('div', { class: 'card' },
        el('h4', {}, g.residuo),
        el('span', { class: 'etiqueta' }, `Va en: ${g.va_en}`),
        el('p', {}, g.como_prepararlo)))
    : el('div', { class: 'vacio' }, 'No encontramos ese residuo en la guía.');

  if ($('#lista-guia')) { pintar($('#lista-guia'), tarjetas); return; }

  const input = el('input', { type: 'search', placeholder: '¿Dónde tiro…? (ej: vidrio)', 'aria-label': 'Buscar residuo' });
  input.addEventListener('input', () => renderGuia(input.value));
  pintar($('#tab-guia'),
    el('h2', {}, 'Guía de separación'),
    avisoDemo(),
    loc.guia_nota && el('p', { class: 'muted' }, loc.guia_nota),
    el('div', { class: 'campo-guia' }, ico('lupa'), input),
    el('div', { id: 'lista-guia' }, tarjetas));
}

function renderNoticias() {
  const noticias = [...(estado.loc.noticias || [])].sort((a, b) => b.fecha.localeCompare(a.fecha));
  pintar($('#tab-noticias'),
    el('button', { class: 'volver', onclick: () => irA('inicio') }, '← Inicio'),
    el('h2', {}, 'Noticias e iniciativas'),
    avisoDemo(),
    noticias.length
      ? noticias.map((n) => el('div', { class: 'card' },
          el('span', { class: 'etiqueta' }, fmtFecha(parseFecha(n.fecha))),
          el('h4', {}, n.titulo),
          el('p', {}, n.resumen)))
      : el('div', { class: 'vacio' }, `Todavía no hay noticias cargadas para ${estado.loc.nombre}.`));
}

function renderAjustes() {
  const { loc, zona } = estado;
  pintar($('#tab-ajustes'),
    el('h2', {}, 'Ajustes'),
    avisoDemo(),
    el('div', { class: 'card fila-ajuste' },
      el('div', {}, el('h4', {}, 'Tu localidad'), el('p', {}, `${loc.nombre}${zona ? ' · ' + zona : ''}`)),
      el('button', { class: 'btn btn-peq', onclick: () => mostrarBienvenida(true) }, 'Cambiar')),
    el('div', { class: 'card fila-ajuste' },
      el('div', {}, el('h4', {}, 'Recordatorios'), el('p', {}, recordatorioActivo() ? 'Activados: te avisamos antes de la recolección.' : 'Desactivados.')),
      el('button', { class: 'btn btn-peq', onclick: alternarRecordatorio }, recordatorioActivo() ? 'Desactivar' : 'Activar')),
    el('div', { class: 'card' },
      el('h4', {}, 'Acerca de EcoAlerta'),
      el('p', {}, 'Prototipo escolar. Los datos de cada localidad se cargaron manualmente y las ubicaciones del mapa son aproximadas. Los recordatorios funcionan con la app abierta.')));
}

/* ---------- navegación ---------- */

const RENDER = { inicio: renderInicio, calendario: renderCalendario, mapa: renderMapa, guia: () => renderGuia(), noticias: renderNoticias, ajustes: renderAjustes };
const NAV = [['inicio', 'casa', 'Inicio'], ['calendario', 'calendario', 'Calendario'], ['mapa', 'pin', 'Mapa'], ['guia', 'reciclar', 'Guía'], ['ajustes', 'ajustes', 'Ajustes']];
let tabActual = 'inicio';
const pestanaActual = () => tabActual;

function irA(tab) {
  if (tab !== tabActual) { estado.busqueda = ''; estado.filtroMapa = null; }
  tabActual = tab;
  destruirMapa();
  document.querySelectorAll('.tab').forEach((s) => { s.hidden = s.id !== `tab-${tab}`; });
  document.querySelectorAll('#nav button').forEach((b) => b.classList.toggle('activa', b.dataset.tab === tab));
  RENDER[tab]();
  window.scrollTo(0, 0);
}

function mostrarApp() {
  $('#bienvenida').hidden = true;
  ['#cabecera', '#principal', '#nav'].forEach((s) => { $(s).hidden = false; });
  pintar($('#btn-cambiar'), ico('pin'), el('span', { class: 't' }, `${estado.loc.nombre}${estado.zona ? ' · ' + estado.zona : ''}`), ico('abajo'));
  estado.filtroMapa = null;
  estado.busqueda = '';
  irA('inicio');
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
  pintar($('#nav'), NAV.map(([tab, icono, texto]) =>
    el('button', { 'data-tab': tab, onclick: () => irA(tab) }, ico(icono), texto)));
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
