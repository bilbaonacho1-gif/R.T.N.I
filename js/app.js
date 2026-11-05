// R.T.N.I. — interfaz, pantalla del reloj y demo (sin dependencias)
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const root = document.documentElement;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const COL = { ice: '#AACBE6', coral: '#F1765C', white: '#F1EFE8', tx: '#F1EFE8' };
const DISP = '"Inter Tight", Inter, system-ui, sans-serif';
const TXT = 'Inter, system-ui, sans-serif';
const val = v => (typeof v === 'function' ? v() : v);
const pad = n => String(n).padStart(2, '0');
const dec = n => n.toFixed(2).replace('.', ',');

/* ============ estado compartido con la capa 3D ============ */
const store = {
  reduce, ready: false, no3d: false,
  screenCanvas: null, screenVersion: 0,
  finish: 'grafito', focus: null, light: 'coral', section: 'hero',
  user: { yaw: 0, pitch: 0 },
  bpm: 72, pick: null,
  onReady() { store.ready = true; root.classList.add('ready3d'); root.classList.remove('loading'); },
};
window.RTNI = store;
root.classList.add('loading');

/* ============ íconos (una sola fuente para SVG y canvas) ============ */
const ci = (cx, cy, r) => `M${cx - r} ${cy}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0`;
const rr = (x, y, w, h, r) => `M${x + r} ${y}h${w - 2 * r}a${r} ${r} 0 0 1 ${r} ${r}v${h - 2 * r}a${r} ${r} 0 0 1 ${-r} ${r}h${-(w - 2 * r)}a${r} ${r} 0 0 1 ${-r} ${-r}v${-(h - 2 * r)}a${r} ${r} 0 0 1 ${r} ${-r}z`;
const ICONS = {
  comer: ['M7 7v9a3 3 0 0 0 6 0V7', 'M10 7v34', ci(25, 24, 10), ci(25, 24, 6), 'M41 7c-3 2-4 6-4 13h4v21'],
  dormir: ['M5 37V17', 'M5 30h38v7', 'M43 30v-4a3 3 0 0 0-3-3H22v7', rr(9, 23, 9, 6, 2), 'M39 5a6 6 0 1 0 5 9 5 5 0 0 1-5-9z'],
  hogar: ['M6 23 24 8l18 15', 'M11 19v22h26V19', 'M20 41V31h8v10', 'M32 13V8h4v8'],
  ropa: ['M18 8 7 13l3 9 5-2v21h18V20l5 2 3-9-11-5a6 6 0 0 1-12 0z'],
  trabajo: [rr(6, 15, 36, 25, 3), 'M18 15v-4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v4', 'M6 26h36', rr(21, 23, 6, 6, 1.2)],
  estudio: ['M24 14c-5-4-12-4-18-2v26c6-2 13-2 18 2 5-4 12-4 18-2V12c-6-2-13-2-18 2z', 'M24 14v26'],
  entrada: ['M24 19v-8h12v31H24v-8', 'M5 26h21', 'M20 20l6 6-6 6', ci(40, 9, 5.5), 'M40 6.5V9h2'],
  salida: ['M24 18v-6H9v31h15v-6', 'M17 27h24', 'M35 21l6 6-6 6', ci(40, 9, 5.5), 'm37.5 9 1.8 1.8 3.2-3.3'],
  extra: [rr(4, 14, 32, 23, 3), 'M14 14v-3a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v3', 'M4 24h22', rr(17, 21, 6, 6, 1.2), { d: ci(36, 35, 8), bg: 1 }, 'M36 31v8', 'M32 35h8'],
  deseo: ['M9 18h24l3 23H6z', 'M15 18v-3a6 6 0 0 1 12 0v3', 'M40 5l1.6 4.4L46 11l-4.4 1.6L40 17l-1.6-4.4L34 11l4.4-1.6z'],
  feed: [rr(12, 4, 24, 40, 4), 'M20 9h8', 'M18 17h12', 'M18 22h8', 'M24 37s-5-3-5-6a2.5 2.5 0 0 1 5-1 2.5 2.5 0 0 1 5 1c0 3-5 6-5 6z'],
  bio: ['M17 38C7 31 3 25 3 19a7 7 0 0 1 14-3 7 7 0 0 1 14 3c0 6-4 12-14 19z', 'M5 25h6l2-4 3 8 2-4h7', 'M31 23c4 0 5-8 10-8', 'M31 23h10', 'M31 23c4 0 5 8 10 8', ci(43, 15, 2), ci(43, 23, 2), ci(43, 31, 2)],
  reloj: [ci(24, 24, 17), 'M24 14v10l7 4'],
  check: [ci(24, 24, 17), 'm16 24 6 6 11-12'],
  heart: [{ d: 'M24 42S8 32 8 20a8.5 8.5 0 0 1 16-4 8.5 8.5 0 0 1 16 4c0 12-16 22-16 22z', fill: 1 }],
};
(function sprite() {
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('aria-hidden', 'true');
  svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
  svg.innerHTML = Object.entries(ICONS).map(([k, parts]) => `<symbol id="i-${k}" viewBox="0 0 48 48">${parts.map(p =>
    typeof p === 'string' ? `<path d="${p}"/>` : p.bg ? `<path d="${p.d}" style="fill:var(--ic-bg,#141519)"/>` : `<path d="${p.d}" fill="currentColor" stroke="none"/>`).join('')}</symbol>`).join('');
  document.body.prepend(svg);
})();
const P2D = {};
const path = d => (P2D[d] ||= new Path2D(d));
function drawIcon(ctx, name, x, y, size, color) {
  ctx.save(); ctx.translate(x, y); ctx.scale(size / 48, size / 48);
  ctx.lineWidth = 2.3; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = color;
  for (const p of ICONS[name]) {
    if (typeof p === 'string') ctx.stroke(path(p));
    else if (p.bg) { ctx.fillStyle = '#000'; ctx.fill(path(p.d)); ctx.stroke(path(p.d)); }
    else { ctx.fillStyle = color; ctx.fill(path(p.d)); }
  }
  ctx.restore();
}

/* ============ pantalla del reloj (canvas 2D usado como textura) ============ */
const SW = 640, SH = 760;
const screen = (() => {
  const cv = document.createElement('canvas'); cv.width = SW; cv.height = SH;
  const ctx = cv.getContext('2d');
  store.screenCanvas = cv;
  let cur = null, prev = null, t0 = 0, raf = 0, hits = [];
  const mirrors = $$('canvas.mirror').map(c => c.getContext('2d'));
  const tone = t => COL[t] || COL.ice;
  const F = (w, s, f = TXT) => `${w} ${s}px ${f}`;

  function wrap(text, font, max) {
    ctx.font = font;
    const words = String(text).split(' '), lines = []; let line = '';
    for (const w of words) { const t = line ? line + ' ' + w : w; if (ctx.measureText(t).width > max && line) { lines.push(line); line = w; } else line = t; }
    if (line) lines.push(line); return lines;
  }
  function txt(s, font, color, x, y, align = 'center', ls = 0) {
    ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
    if ('letterSpacing' in ctx) ctx.letterSpacing = ls + 'px';
    ctx.fillText(s, x, y);
    if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
  }
  function rrect(x, y, w, h, r) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
  function hline(y, w = 440, a = .28) { ctx.fillStyle = `rgba(241,239,232,${a})`; ctx.fillRect((SW - w) / 2, y, w, 2); }
  function vline(x, y, h) { ctx.fillStyle = 'rgba(241,239,232,.3)'; ctx.fillRect(x - 1, y, 2, h); }

  function background() {
    ctx.globalAlpha = 1; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, SW, SH);
    ctx.save(); ctx.strokeStyle = 'rgba(241,239,232,.07)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) { const y = SH - 140 + i * 22; ctx.beginPath(); ctx.moveTo(-20, y); ctx.bezierCurveTo(170, y - 70 + i * 4, 340, y + 60, 660, y - 46); ctx.stroke(); }
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(-10, 96 + i * 24); ctx.bezierCurveTo(90, 86 + i * 24, 150, 16, 230 + i * 44, -10); ctx.stroke(); }
    ctx.restore();
  }

  // Cada estado se convierte en bloques apilados y centrados verticalmente.
  function blocks(s) {
    const B = [], c = tone(s.tone), M = 'rgba(241,239,232,.74)';
    const add = (h, d, gap = 14) => B.push({ h, d, gap });
    if (s.custom === 'home') {
      add(136, y => txt(clock(), F(500, 132, DISP), COL.tx, SW / 2, y + 116, 'center', -3));
      add(4, y => hline(y), 18);
      add(30, y => txt('PRÓXIMA TAREA', F(600, 19), M, SW / 2, y + 22, 'center', 4));
      add(92, y => {
        ctx.font = F(700, 42, DISP); const w1 = ctx.measureText('Comer').width; ctx.font = F(400, 26); const w2 = ctx.measureText('12:00 – 12:30').width;
        const tw = 84 + 22 + Math.max(w1, w2), x0 = SW / 2 - tw / 2;
        drawIcon(ctx, 'comer', x0, y + 4, 84, COL.ice);
        txt('Comer', F(700, 42, DISP), COL.tx, x0 + 106, y + 42, 'left');
        txt('12:00 – 12:30', F(400, 26), M, x0 + 106, y + 80, 'left');
      });
      add(4, y => hline(y), 18);
      add(64, y => { const ics = ['dormir', 'trabajo', 'estudio'], step = 140, x0 = SW / 2 - step; ics.forEach((n, i) => { drawIcon(ctx, n, x0 + i * step - 30, y + 2, 60, COL.tx); if (i) vline(x0 + i * step - step / 2, y + 8, 48); }); });
      return B;
    }
    if (s.custom === 'esencial') {
      add(40, y => txt('17:00', F(500, 32, DISP), COL.tx, SW / 2, y + 32));
      add(52, y => txt('Lo esencial', F(700, 44, DISP), COL.tx, SW / 2, y + 42));
      add(116, y => { const L = [['comer', 'Comida'], ['hogar', 'Hogar'], ['ropa', 'Ropa']], step = 150, x0 = SW / 2 - step; L.forEach(([n, l], i) => { const cx = x0 + i * step; drawIcon(ctx, n, cx - 36, y + 2, 72, COL.ice); txt(l, F(500, 22), COL.tx, cx, y + 106); if (i) vline(cx - step / 2, y + 6, 100); }); });
      add(4, y => hline(y), 16);
      add(34, y => txt('Jornada registrada', F(400, 27), M, SW / 2, y + 26));
      add(70, y => txt('6 h / 8 h', F(700, 64, DISP), COL.tx, SW / 2, y + 60));
      add(18, y => { ctx.fillStyle = 'rgba(241,239,232,.16)'; rrect(SW / 2 - 210, y, 420, 16, 8); ctx.fill(); ctx.fillStyle = COL.ice; rrect(SW / 2 - 210, y, 315, 16, 8); ctx.fill(); });
      return B;
    }
    if (s.time) add(40, y => txt(val(s.time), F(500, 32, DISP), COL.tx, SW / 2, y + 32), 12);
    if (s.icons) add((s.iconSize || 104) + 8, y => {
      const n = s.icons.length, size = s.iconSize || 104, gap = 46, tot = n * size + (n - 1) * gap; let x = SW / 2 - tot / 2;
      s.icons.forEach((ic, i) => { drawIcon(ctx, ic, x, y + 4, size, c); if (i < n - 1) vline(x + size + gap / 2, y + 14, 84); x += size + gap; });
    });
    if (s.kicker) add(28, y => txt(s.kicker.toUpperCase(), F(600, 19), s.tone === 'coral' ? COL.coral : M, SW / 2, y + 21, 'center', 4), 8);
    if (s.title) { const L = wrap(s.title, F(700, 46, DISP), 540); add(L.length * 52, y => L.forEach((l, i) => txt(l, F(700, 46, DISP), COL.tx, SW / 2, y + 42 + i * 52))); }
    if (s.big) { const sz = s.bigSize || 84; add(sz + 6, y => txt(val(s.big), F(700, sz, DISP), COL.tx, SW / 2, y + sz * .9)); }
    if (s.msg) { const L = wrap(val(s.msg), F(400, 29), 520); add(L.length * 37, y => L.forEach((l, i) => txt(l, F(400, 29), M, SW / 2, y + 28 + i * 37))); }
    if (s.sub) add(52, y => { hline(y + 4); txt(val(s.sub), F(600, 25), COL.tx, SW / 2, y + 44); });
    if (s.status) add(50, y => {
      ctx.font = F(700, 19); if ('letterSpacing' in ctx) ctx.letterSpacing = '3px';
      const w = ctx.measureText(s.status.toUpperCase()).width + 52; if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
      ctx.fillStyle = s.tone === 'coral' ? 'rgba(241,118,92,.14)' : 'rgba(170,203,230,.14)'; rrect(SW / 2 - w / 2, y + 2, w, 46, 23); ctx.fill();
      ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.stroke();
      txt(s.status.toUpperCase(), F(700, 19), c, SW / 2, y + 32, 'center', 3);
    }, 16);
    if (s.btns) s.btns.forEach((b, i) => add(68, (y, alpha) => {
      const w = 470, x = SW / 2 - w / 2; rrect(x, y, w, 66, 33);
      const bc = b.k.startsWith('coral') ? COL.coral : b.k.startsWith('ghost') ? COL.tx : COL.ice;
      if (b.k.endsWith('-o') || b.k === 'ghost') { ctx.strokeStyle = bc; ctx.lineWidth = 3; ctx.stroke(); txt(b.t, F(600, 29, DISP), bc, SW / 2, y + 43); }
      else { ctx.fillStyle = bc; ctx.fill(); txt(b.t, F(700, 29, DISP), '#0d0e10', SW / 2, y + 43); }
      if (alpha === 1) hits.push({ x, y, w, h: 66, i });
    }, i ? 12 : 22));
    return B;
  }
  function clock() { const d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }

  function drawState(s, alpha, dy) {
    if (!s) return;
    ctx.globalAlpha = alpha;
    const B = blocks(s);
    const total = B.reduce((a, b, i) => a + b.h + (i ? b.gap : 0), 0);
    const top = s.brand ? 116 : 56, bottom = 40;
    let y = top + Math.max(0, (SH - top - bottom - total) / 2) + dy;
    if (s.brand) {
      txt('R.T.N.I.', F(600, 21), 'rgba(241,239,232,.82)', 122, 92 + dy, 'left', 5);
      drawIcon(ctx, 'heart', 438, 68 + dy, 30, '#F16B78');
      txt(String(store.bpm), F(600, 25, DISP), COL.tx, 522, 92 + dy, 'right');
    }
    B.forEach((b, i) => { if (i) y += b.gap; b.d(y, alpha); y += b.h; });
    ctx.globalAlpha = 1;
  }

  function render(p) {
    background();
    hits = [];
    const e = 1 - Math.pow(1 - p, 3);
    if (prev && p < 1) drawState(prev, 1 - e, -18 * e);
    drawState(cur, p < 1 ? e : 1, p < 1 ? 18 * (1 - e) : 0);
    store.screenVersion++;
    if (!store.ready) mirrors.forEach(m => { m.clearRect(0, 0, 320, 380); m.drawImage(cv, 0, 0, 320, 380); });
  }
  function set(s, instant) {
    if (!cur || instant || reduce) { prev = null; cur = s; cancelAnimationFrame(raf); render(1); return; }
    prev = cur; cur = s; t0 = performance.now(); cancelAnimationFrame(raf);
    const step = now => { const p = Math.min(1, (now - t0) / 240); render(p); if (p < 1) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
  }
  const refresh = () => { if (performance.now() - t0 > 260) render(1); };
  const hitAt = (x, y) => hits.find(h => x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h);
  return { set, refresh, hitAt, get state() { return cur; } };
})();

/* ============ contenidos ============ */
const HERO = { brand: 1, time: '19:15', tone: 'coral', icons: ['extra'], title: '¿Horas extra?', msg: '¿Otra hora por unas zapatillas?' };
const EXPLORE = {
  pantalla: { custom: 'home', brand: 1 },
  corona: { brand: 1, time: () => new Date().toTimeString().slice(0, 5), icons: ['reloj'], kicker: 'Corona · rutinas', title: 'Comer · Trabajar', msg: 'Estudiar · Dormir · Avisos', tone: 'ice' },
  bio: { brand: 1, icons: ['bio'], kicker: 'Biovínculo · simulado', title: 'Deseo detectado', big: () => dec(bio.desire), bigSize: 76, msg: 'Pulso estable. Por ahora.', tone: 'coral' },
};
const HS_TEXT = {
  pantalla: 'Vidrio oscuro con reflejos controlados y una interfaz que nunca deja de hablarte: la próxima tarea, tu pulso y cada aviso.',
  corona: 'Estriada, con un anillo coral muy fino. Un giro te lleva de lo necesario a lo deseado, sin pasar por el celular.',
  bio: 'Un sensor imaginario lee tu pulso y tu sistema nervioso para anticipar lo que vas a desear. Es ficción: los datos son simulados.',
};

// Demo: cada aviso, su contexto y lo que pasa al tocar cada botón.
const DEMO = {
  esencial: { sub: 'Comer. Descansar. Sostener la vida cotidiana.', ex: [
    { time: '12:00', tone: 'ice', icons: ['comer'], title: 'Hora de comer', msg: 'Tu cuerpo también necesita una pausa.', ctx: 'Mediodía. El reloj detecta cinco horas sin comer y te frena. Necesidad básica: protegida.',
      btns: [{ t: 'Hecho', k: 'ice', after: { title: 'Comida registrada', msg: 'Bien. Las galletitas no cuentan.' } }] },
    { time: '23:00', tone: 'ice', icons: ['dormir'], title: 'Cerrá el día', msg: 'Mañana seguimos. Ahora, descansá.', ctx: 'Fin del día. Te manda a dormir aunque el feed quiera otra cosa.',
      btns: [{ t: 'Descansar', k: 'ice', after: { title: 'Descanso registrado', msg: 'Buenas noches. En serio.' } },
             { t: 'Más tarde', k: 'ghost', after: { tone: 'coral', icons: ['feed'], title: 'Descanso postergado', msg: 'El scroll de las 2 a. m. no es descanso.' } }] },
    { custom: 'esencial', time: '17:00', tone: 'ice', title: 'Lo esencial', ctx: 'El resumen de lo necesario: comida, hogar y ropa. Lo que la jornada tiene que sostener.' },
  ] },
  adulto: { sub: 'Tu jornada termina. Tus deseos, parece que no.', ex: [
    { time: '09:00', tone: 'ice', icons: ['entrada'], title: 'Entrada registrada', msg: 'Otro día en la matrix. Dale.', status: 'Jornada iniciada', ctx: 'Llegás al trabajo. El reloj registra la entrada sin que hagas nada.' },
    { time: '17:00', tone: 'ice', icons: ['salida'], title: 'Jornada completa', big: '8 h', msg: 'Lo esencial, por hoy.', ctx: 'Ocho horas. Comida, hogar y ropa: cubiertos.',
      btns: [{ t: 'Cerrar jornada', k: 'ice', after: { title: 'Jornada cerrada', msg: 'Lo que queda del día es tuyo. Por ahora.' } }] },
    { time: '19:15', tone: 'coral', icons: ['extra'], title: '¿Horas extra?', msg: '¿Otra hora por unas zapatillas?', sub: () => 'Extra: ' + fmtExtra(), ctx: 'Seguís trabajando. El biovínculo cruza tu pulso con tus búsquedas recientes.', bio: () => `Pulso ${store.bpm} lpm ↑ · Índice de deseo 0,82 · Simulado`,
      btns: [{ t: 'Seguir igual', k: 'coral', after: { title: 'Horas extra registradas', msg: 'Tus pies, felices. Tu espalda, no.' } },
             { t: 'Cerrar jornada', k: 'ghost', after: { tone: 'ice', title: 'Jornada cerrada', msg: 'Sabia decisión. Rara, pero sabia.' } }] },
    { time: '19:16', tone: 'coral', icons: ['deseo'], kicker: 'Deseo detectado', big: 'Zapatillas', bigSize: 72, msg: 'El algoritmo eligió. Vos pagás.', ctx: 'Un minuto después, el reloj nombra el deseo. Y quién lo eligió.', bio: () => 'Origen probable: publicidad vista 14 veces esta semana · Simulado',
      btns: [{ t: 'Revisar deseo', k: 'coral-o', after: { icons: ['deseo'], title: 'Deseo revisado', msg: '¿Lo necesitás o te lo mostraron 14 veces?' } }] },
  ] },
  estudio: { sub: 'Versión adolescente. Del estudio al scroll.', ex: [
    { time: '14:30', tone: 'ice', icons: ['estudio'], title: 'Hora de estudiar', msg: 'Registrá tu tiempo de estudio.', ctx: 'Empieza la sesión. El celular queda en espera.',
      btns: [{ t: 'Empezar', k: 'ice', after: { icons: ['reloj'], title: 'Sesión iniciada', msg: 'El celular puede esperar. Vos también.' } }] },
    { time: '15:15', tone: 'ice', icons: ['estudio', 'reloj'], title: 'En estudio', big: () => fmtTimer(demo.timer), msg: 'Sesión en curso', timer: 1, ctx: 'El tiempo de estudio corre en vivo, segundo a segundo.',
      btns: [{ t: 'Finalizar', k: 'ice-o', after: { title: 'Sesión registrada', msg: '¿Ya? Recién empezabas.', bigFromTimer: 1 } }] },
    { time: '16:00', tone: 'coral', icons: ['estudio', 'check'], title: 'Estudio completado', big: '1 h 30 min', bigSize: 64, sub: 'Tu feed ya estaba preocupado.', ctx: 'Terminaste. El reloj te «libera»… y ya sabe adónde vas a ir.',
      btns: [{ t: 'Continuar', k: 'coral', after: { title: 'Liberado', msg: 'Tu feed te extrañó. Mucho.' } }] },
    { time: '16:01', tone: 'coral', icons: ['feed'], title: '¿Tu tiempo libre?', msg: 'Tu dosis de scroll te espera.', ctx: 'Un minuto libre y ya hay una sugerencia: volver al celular.', bio: () => 'Atención disponible: 92 % · Feed listo · Simulado',
      btns: [{ t: 'Abrir celular', k: 'coral', after: { icons: ['feed'], title: 'Celular desbloqueado', msg: 'Sabíamos que ibas a elegir esto.' } },
             { t: 'Hacer una pausa', k: 'ghost', after: { tone: 'ice', icons: ['check'], title: 'Pausa registrada', msg: '¿Una pausa de verdad? Respeto.' } }] },
  ] },
};
const demo = { tab: 'adulto', idx: { esencial: 0, adulto: 0, estudio: 0 }, done: {}, timer: 2700, extra: 135 };
const fmtTimer = s => `${pad(s / 3600 | 0)}:${pad((s / 60 | 0) % 60)}:${pad(s % 60)}`;
const fmtExtra = () => `${demo.extra / 60 | 0} h ${pad(demo.extra % 60)} min`;
const exKey = () => `${demo.tab}-${demo.idx[demo.tab]}`;
const curEx = () => DEMO[demo.tab].ex[demo.idx[demo.tab]];
function exState(ex, done) {
  if (done) {
    const a = ex.btns[done.bi].after;
    return { time: ex.time, tone: a.tone || ex.tone, icons: a.icons || ['check'], status: 'Registrado', title: a.title, big: done.big, bigSize: done.big ? 72 : undefined, msg: a.msg };
  }
  return { ...ex, btns: ex.btns ? ex.btns.map(b => ({ t: b.t, k: b.k })) : null };
}
const demoState = () => exState(curEx(), demo.done[exKey()]);

// Un día: dos recorridos que reutilizan los avisos de la demo.
const strip = ex => ({ ...ex, btns: null });
const ROUTES = {
  trabajo: [
    { t: '09:00', a: 'Entrada', who: 'El reloj', text: 'El reloj registra que llegaste. Tu día empieza cuando él lo anota.', s: strip(DEMO.adulto.ex[0]) },
    { t: '12:00', a: 'Comida', who: 'Tu cuerpo', text: 'Te avisa que comas. Lo necesario, a horario.', s: strip(DEMO.esencial.ex[0]) },
    { t: '17:00', a: 'Fin de jornada', who: 'Vos', text: 'Cumpliste las ocho horas. El resto del día debería ser tuyo.', s: strip(DEMO.adulto.ex[1]) },
    { t: '19:15', a: 'Horas extra', who: 'El deseo', text: 'Te quedaste. El biovínculo detecta para qué, y te lo dice.', s: strip(DEMO.adulto.ex[2]) },
    { t: '23:00', a: 'Descanso', who: 'El reloj', text: 'Cierra el día por vos. Mañana, otra vez lo mismo.', s: strip(DEMO.esencial.ex[1]) },
  ],
  estudio: [
    { t: '14:30', a: 'Inicio', who: 'El reloj', text: 'Arranca la sesión de estudio. El celular, boca abajo.', s: strip(DEMO.estudio.ex[0]) },
    { t: '15:15', a: 'En estudio', who: 'Vos', text: 'Cuarenta y cinco minutos de atención propia. Un récord.', s: { ...strip(DEMO.estudio.ex[1]), big: '00:45:00' } },
    { t: '16:00', a: 'Finalización', who: 'El reloj', text: 'Termina la sesión y el reloj te «libera».', s: strip(DEMO.estudio.ex[2]) },
    { t: '16:01', a: 'Aviso sobre el celular', who: 'El feed', text: 'Un minuto después ya tenés una sugerencia: volver al scroll.', s: strip(DEMO.estudio.ex[3]) },
  ],
};
const dia = { route: 'trabajo', pos: 0, playing: false, timer: 0, anim: 0 };
const diaStop = () => ROUTES[dia.route][Math.round(dia.pos)];

const ICON_INFO = [
  ['comer', 'Comer', 'ice', 'Marca las comidas del día. Lo primero que el reloj protege.', 'Hora de comer'],
  ['dormir', 'Dormir', 'ice', 'Cierra el día y cuida el descanso. Mañana también tenés que existir.', 'Cerrá el día'],
  ['hogar', 'Hogar', 'ice', 'Vivienda: una de las tres necesidades que el reloj considera esenciales.', 'Lo esencial: hogar'],
  ['ropa', 'Vestimenta', 'ice', 'Ropa esencial. La que necesitás, no la que te mostró el feed.', 'Ropa esencial'],
  ['trabajo', 'Trabajo', 'ice', 'La jornada laboral, medida minuto a minuto.', 'Jornada en curso'],
  ['estudio', 'Estudio', 'ice', 'Sesiones de estudio con inicio y final registrados.', 'Hora de estudiar'],
  ['entrada', 'Entrada', 'ice', 'Registra el comienzo de una actividad. Sin firmar nada.', 'Entrada registrada'],
  ['salida', 'Salida', 'ice', 'Registra el final. Lo que viene después, el reloj lo juzga.', 'Jornada completa'],
  ['extra', 'Horas extra', 'coral', 'Tiempo adicional de trabajo. Si es para pagar un deseo, el reloj te lo dice.', '¿Otra hora por unas zapatillas?'],
  ['deseo', 'Deseo', 'coral', 'Consumo sugerido. Detectado por el biovínculo, elegido por el algoritmo.', 'Deseo detectado: zapatillas'],
  ['feed', 'Feed', 'coral', 'Scroll y atención. La recompensa automática después de estudiar.', 'Tu dosis de scroll te espera'],
  ['bio', 'Biovínculo', 'white', 'La conexión ficticia con tus sistemas nervioso y cardíaco. Lee lo que vas a desear.', 'Lectura corporal simulada'],
];
const CAT = { ice: 'Tarea necesaria', coral: 'Deseo y alerta', white: 'Sistema especulativo' };
let iconSel = 0;
const iconState = () => { const [ic, name, t, , prev] = ICON_INFO[iconSel]; return { icons: [ic], iconSize: 168, kicker: CAT[t], title: name, msg: prev, tone: t }; };

const IDEA = {
  control: { brand: 1, tone: 'coral', icons: ['reloj'], kicker: 'Registro del día', title: '14 registros hoy', msg: 'Tu vida, convertida en datos.' },
  conciencia: { brand: 1, tone: 'ice', icons: ['check'], kicker: 'Resumen', big: '2 h 15 min', bigSize: 72, msg: 'Fue lo que trabajaste por un deseo. ¿Valió la pena?' },
};
let ideaView = 'control';

/* ============ sección activa → pantalla e iluminación ============ */
function sectionState(sec) {
  switch (sec) {
    case 'hero': return HERO;
    case 'reloj': return EXPLORE[store.focus || 'pantalla'];
    case 'notificaciones': return demoState();
    case 'dia': return diaStop().s;
    case 'iconos': return iconState();
    case 'idea': return IDEA[ideaView];
  }
}
function sectionLight(sec) {
  switch (sec) {
    case 'hero': return 'coral';
    case 'reloj': return store.focus === 'bio' ? 'coral' : 'neutral';
    case 'notificaciones': return demoState().tone === 'coral' ? 'coral' : 'ice';
    case 'dia': return diaStop().s.tone === 'coral' ? 'coral' : 'ice';
    case 'iconos': { const t = ICON_INFO[iconSel][2]; return t === 'white' ? 'neutral' : t; }
    case 'idea': return ideaView;
  }
}
function sync(sec, instant) {
  if (sec && sec !== store.section) return; // solo actualiza si es la sección visible
  screen.set(sectionState(store.section), instant);
  store.light = sectionLight(store.section);
}
const secIO = new IntersectionObserver(es => {
  es.forEach(e => {
    if (!e.isIntersecting) return;
    store.section = e.target.dataset.sec; sync();
    $$('.nav-links a').forEach(a => a.setAttribute('aria-current', String(a.getAttribute('href') === '#' + e.target.id)));
  });
}, { rootMargin: '-50% 0px -50% 0px' });
$$('[data-sec]').forEach(s => secIO.observe(s));

/* ============ exploración ============ */
const hsCards = $$('.hs-card'), hsDots = $$('.hs');
function setFocus(f) {
  store.focus = store.focus === f ? null : f;
  hsCards.forEach(c => c.setAttribute('aria-pressed', String(c.dataset.hs === store.focus)));
  hsDots.forEach(d => d.classList.toggle('sel', d.dataset.hs === store.focus));
  $('#hsMore').textContent = store.focus ? HS_TEXT[store.focus] : 'Elegí un punto para acercar la cámara.';
  $('#bioCard').classList.toggle('on', store.focus === 'bio');
  sync('reloj');
}
hsCards.forEach(c => c.addEventListener('click', () => setFocus(c.dataset.hs)));
hsDots.forEach(d => d.addEventListener('click', () => setFocus(d.dataset.hs)));
$('#resetView').addEventListener('click', () => {
  store.user.yaw = 0; store.user.pitch = 0;
  if (store.focus) setFocus(store.focus);
});
$$('.finish-opts button').forEach(b => b.addEventListener('click', () => {
  store.finish = b.dataset.finish; root.dataset.finish = store.finish;
  $$('.finish-opts button').forEach(x => x.setAttribute('aria-checked', String(x === b)));
}));
radioKeys($('.finish-opts'));

// Biovínculo: datos simulados
const bio = { desire: .34, att: 61, wave: [] };
const pulseCv = $('#pulse'), pctx = pulseCv.getContext('2d');
let pulseOn = false;
new IntersectionObserver(es => es.forEach(e => (pulseOn = e.isIntersecting)), { threshold: .1 }).observe(pulseCv);
let phase = 0;
function drawPulse() {
  const w = pulseCv.width, h = pulseCv.height;
  pctx.clearRect(0, 0, w, h);
  pctx.strokeStyle = 'rgba(241,239,232,.08)'; pctx.lineWidth = 1;
  for (let x = 0; x < w; x += 40) { pctx.beginPath(); pctx.moveTo(x, 0); pctx.lineTo(x, h); pctx.stroke(); }
  pctx.strokeStyle = COL.coral; pctx.lineWidth = 3; pctx.lineJoin = 'round'; pctx.beginPath();
  const per = 60 / store.bpm * 110;
  for (let x = 0; x <= w; x += 2) {
    const t = ((x + phase) % per) / per; let y = 0;
    if (t > .1 && t < .14) y = -6; else if (t > .2 && t < .23) y = 10; else if (t >= .23 && t < .27) y = -34; else if (t >= .27 && t < .31) y = 16; else if (t > .45 && t < .55) y = -8 * Math.sin((t - .45) / .1 * Math.PI);
    x ? pctx.lineTo(x, h / 2 + y) : pctx.moveTo(x, h / 2 + y);
  }
  pctx.stroke();
}
drawPulse();
(function loop() { if (pulseOn && !reduce) { phase += 2.2; drawPulse(); } requestAnimationFrame(loop); })();

/* ============ demo de notificaciones ============ */
const tabsEl = $('#demoTabs'), tabBtns = $$('[role="tab"]', tabsEl), pill = $('.tab-pill', tabsEl);
function placePill() { const b = tabBtns.find(t => t.dataset.tab === demo.tab); pill.style.width = b.offsetWidth + 'px'; pill.style.transform = `translateX(${b.offsetLeft}px)`; }
function setTab(t, focus) {
  demo.tab = t;
  tabBtns.forEach(b => { const on = b.dataset.tab === t; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
  $('#demoBody').setAttribute('aria-labelledby', 'tab-' + t);
  placePill(); renderDemo(); sync('notificaciones');
}
tabBtns.forEach((b, i) => {
  b.addEventListener('click', () => setTab(b.dataset.tab));
  b.addEventListener('keydown', e => {
    const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (!d) return;
    e.preventDefault(); setTab(tabBtns[(i + d + tabBtns.length) % tabBtns.length].dataset.tab, true);
  });
});
addEventListener('resize', placePill);
document.fonts && document.fonts.ready.then(() => { placePill(); screen.refresh(); });

function renderDemo() {
  const D = DEMO[demo.tab], i0 = demo.idx[demo.tab];
  $('#tabSub').textContent = D.sub;
  $('#exList').innerHTML = D.ex.map((ex, i) => {
    const done = demo.done[`${demo.tab}-${i}`], c = ex.tone === 'coral' ? 'var(--coral)' : 'var(--ice)';
    return `<button class="exm" style="--c:${c}" aria-pressed="${i === i0}" data-i="${i}"><span class="t">${ex.time}</span><span class="h">${ex.title || ex.kicker}</span>${done ? '<span class="ok">✓ Registrado</span>' : `<span class="tag ${ex.tone === 'coral' ? 'coral' : ''}">${ex.tone === 'coral' ? 'Alerta' : 'Necesario'}</span>`}</button>`;
  }).join('');
  const ex = curEx(), done = demo.done[exKey()];
  $('#ctx').style.setProperty('--c', ex.tone === 'coral' ? 'var(--coral)' : 'var(--ice)');
  $('#ctxText').textContent = ex.ctx;
  const bioEl = $('#ctxBio'); bioEl.hidden = !ex.bio; if (ex.bio) bioEl.textContent = ex.bio();
  const acts = $('#ctxActions'), res = $('#ctxResult');
  $('#ctxNote').hidden = !!ex.btns || !!done;
  if (done) {
    const a = ex.btns[done.bi].after;
    acts.innerHTML = '';
    res.style.setProperty('--c', (a.tone || ex.tone) === 'coral' ? 'var(--coral)' : 'var(--ice)');
    res.innerHTML = `<span class="done">✓ Registrado</span><button class="link" id="exReset">Reiniciar ejemplo</button><p><b>${a.title}.</b> ${a.msg}${done.big ? ` Tiempo: ${done.big}.` : ''}</p>`;
    $('#exReset').addEventListener('click', resetExample);
  } else {
    acts.innerHTML = ex.btns ? ex.btns.map((b, i) => `<button class="btn btn-sm ${btnClass(b.k)}" data-bi="${i}">${b.t}</button>`).join('') : '';
    res.innerHTML = '';
    $$('button', acts).forEach(b => b.addEventListener('click', () => act(+b.dataset.bi)));
  }
  $$('.exm').forEach(b => b.addEventListener('click', () => { demo.idx[demo.tab] = +b.dataset.i; renderDemo(); sync('notificaciones'); }));
}
const btnClass = k => ({ ice: 'btn-ice', coral: 'btn-coral', 'ice-o': 'btn-ice-o', 'coral-o': 'btn-coral-o', ghost: 'btn-ghost' }[k]);
function act(bi) {
  const ex = curEx(), b = ex.btns && ex.btns[bi]; if (!b) return;
  demo.done[exKey()] = { bi, big: b.after.bigFromTimer ? fmtTimer(demo.timer) : undefined };
  renderDemo(); sync('notificaciones');
  const r = $('#exReset'); r && r.focus({ preventScroll: true });
}
function resetExample() {
  delete demo.done[exKey()];
  if (demo.tab === 'estudio' && demo.idx.estudio === 1) demo.timer = 2700;
  if (demo.tab === 'adulto' && demo.idx.adulto === 2) demo.extra = 135;
  renderDemo(); sync('notificaciones');
  const first = $('#ctxActions button'); first && first.focus({ preventScroll: true });
}
$('#demoReset').addEventListener('click', () => {
  demo.done = {}; demo.idx = { esencial: 0, adulto: 0, estudio: 0 }; demo.timer = 2700; demo.extra = 135;
  setTab('adulto');
});
// tocar la pantalla del reloj (lo resuelve la capa 3D con un rayo)
function screenTap(u, v) {
  if (store.section !== 'notificaciones') return false;
  const h = screen.hitAt(u * SW, (1 - v) * SH); if (!h) return false;
  act(h.i); return true;
}

/* ============ un día con R.T.N.I. ============ */
const tlRange = $('#tlRange'), tlStops = $('#tlStops'), diaSec = $('#dia');
const ICE_RGB = [170, 203, 230], CORAL_RGB = [241, 118, 92];
const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
function renderStops() {
  const R = ROUTES[dia.route], n = R.length;
  tlStops.innerHTML = R.map((s, i) => `<button class="tl-stop" style="left:${i / (n - 1) * 100}%" data-i="${i}" aria-label="${s.t}, ${s.a}"><b>${s.t}</b><span>${s.a}</span></button>`).join('');
  $$('.tl-stop', tlStops).forEach(b => b.addEventListener('click', () => { stopPlay(); goTo(+b.dataset.i); }));
}
let lastStop = -1;
function setPos(f) {
  const R = ROUTES[dia.route], n = R.length;
  dia.pos = Math.max(0, Math.min(n - 1, f));
  tlRange.value = Math.round(dia.pos / (n - 1) * 1000);
  $('#tlFill').style.width = (dia.pos / (n - 1) * 100) + '%';
  const i = Math.floor(dia.pos), j = Math.min(n - 1, i + 1), fr = dia.pos - i;
  const m = Math.round(toMin(R[i].t) + (toMin(R[j].t) - toMin(R[i].t)) * fr);
  $('#tlTime').textContent = pad(m / 60 | 0) + ':' + pad(m % 60);
  const ca = R[i].s.tone === 'coral' ? CORAL_RGB : ICE_RGB, cb = R[j].s.tone === 'coral' ? CORAL_RGB : ICE_RGB;
  const rgb = ca.map((v, k) => Math.round(v + (cb[k] - v) * fr));
  diaSec.style.setProperty('--tone-rgb', rgb.join(','));
  diaSec.style.setProperty('--tone', `rgb(${rgb.join(',')})`);
  const near = Math.round(dia.pos);
  tlRange.setAttribute('aria-valuetext', `${R[near].t}, ${R[near].a}`);
  if (near !== lastStop) {
    lastStop = near; const s = R[near];
    $('#tlAct').textContent = s.a; $('#tlText').textContent = s.text; $('#tlWho').textContent = s.who;
    $('#tlNotiT').textContent = s.s.title || s.s.kicker; $('#tlNotiM').textContent = val(s.s.msg) || val(s.s.sub) || '';
    $('#tlIc use').setAttribute('href', '#i-' + (s.s.icons ? s.s.icons[0] : 'check'));
    $$('.tl-stop', tlStops).forEach((b, k) => b.classList.toggle('on', k === near));
    sync('dia');
  }
}
function goTo(i, done) {
  cancelAnimationFrame(dia.anim);
  const from = dia.pos, d = reduce ? 0 : 750, t0 = performance.now();
  const step = now => {
    const p = d ? Math.min(1, (now - t0) / d) : 1, e = p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    setPos(from + (i - from) * e);
    if (p < 1) dia.anim = requestAnimationFrame(step); else done && done();
  };
  dia.anim = requestAnimationFrame(step);
}
tlRange.addEventListener('input', () => { stopPlay(); cancelAnimationFrame(dia.anim); setPos(tlRange.value / 1000 * (ROUTES[dia.route].length - 1)); });
tlRange.addEventListener('change', () => goTo(Math.round(dia.pos)));
tlRange.addEventListener('keydown', e => {
  const n = ROUTES[dia.route].length;
  const k = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[e.key];
  if (k) { e.preventDefault(); stopPlay(); goTo(Math.max(0, Math.min(n - 1, Math.round(dia.pos) + k))); }
  if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); stopPlay(); goTo(e.key === 'Home' ? 0 : n - 1); }
});
const playBtn = $('#tlPlay');
function stopPlay() { dia.playing = false; clearTimeout(dia.timer); playBtn.setAttribute('aria-pressed', 'false'); $('.pl', playBtn).textContent = 'Reproducir recorrido'; }
function nextPlay() {
  if (!dia.playing) return;
  const n = ROUTES[dia.route].length, nx = Math.round(dia.pos) + 1;
  if (nx >= n) { stopPlay(); return; }
  goTo(nx, () => { dia.timer = setTimeout(nextPlay, 1900); });
}
playBtn.addEventListener('click', () => {
  if (dia.playing) return stopPlay();
  dia.playing = true; playBtn.setAttribute('aria-pressed', 'true'); $('.pl', playBtn).textContent = 'Pausar recorrido';
  if (Math.round(dia.pos) >= ROUTES[dia.route].length - 1) goTo(0, () => { dia.timer = setTimeout(nextPlay, 1500); });
  else dia.timer = setTimeout(nextPlay, 400);
});
$$('[data-route]').forEach(b => b.addEventListener('click', () => {
  stopPlay(); dia.route = b.dataset.route;
  $$('[data-route]').forEach(x => x.setAttribute('aria-checked', String(x === b)));
  renderStops(); lastStop = -1; setPos(0);
}));
radioKeys($('.dia .seg'));
renderStops(); setPos(0);

/* ============ íconos ============ */
const icGrid = $('#icGrid');
icGrid.innerHTML = ICON_INFO.map(([ic, name, t], i) => `<button class="icb ${t === 'ice' ? '' : t}" aria-pressed="${i === 0}" data-i="${i}"><svg class="ic" aria-hidden="true"><use href="#i-${ic}"/></svg><span>${name}</span></button>`).join('');
function setIcon(i) {
  iconSel = i; const [, name, t, desc] = ICON_INFO[i];
  $$('.icb', icGrid).forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
  const tag = $('#icTag'); tag.textContent = CAT[t]; tag.className = 'tag ' + (t === 'ice' ? '' : t);
  $('#icName').textContent = name; $('#icText').textContent = desc;
  sync('iconos');
}
$$('.icb', icGrid).forEach(b => b.addEventListener('click', () => setIcon(+b.dataset.i)));
setIcon(0);

/* ============ la idea ============ */
$$('#ideaSeg button').forEach(b => b.addEventListener('click', () => {
  ideaView = b.dataset.view;
  $$('#ideaSeg button').forEach(x => x.setAttribute('aria-checked', String(x === b)));
  $$('.view').forEach(v => v.classList.toggle('on', v.dataset.view === ideaView));
  $('#idea').style.setProperty('--idea-rgb', ideaView === 'control' ? '241,118,92' : '170,203,230');
  sync('idea');
}));
radioKeys($('#ideaSeg'));

/* ============ utilidades de interfaz ============ */
function radioKeys(group) {
  const items = $$('[role="radio"]', group);
  items.forEach((b, i) => {
    b.tabIndex = b.getAttribute('aria-checked') === 'true' ? 0 : -1;
    b.addEventListener('click', () => items.forEach(x => (x.tabIndex = x === b ? 0 : -1)));
    b.addEventListener('keydown', e => {
      const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!d) return;
      e.preventDefault(); const n = items[(i + d + items.length) % items.length]; n.click(); n.focus();
    });
  });
}
const nav = $('#nav');
const onScroll = () => nav.classList.toggle('scrolled', scrollY > 10);
addEventListener('scroll', onScroll, { passive: true }); onScroll();
const rvIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); rvIO.unobserve(e.target); } }), { threshold: .15 });
$$('.rv').forEach(el => rvIO.observe(el));

// Girar el reloj: arrastrar (horizontal en pantallas táctiles) o flechas del teclado.
$$('.slot').forEach(slot => {
  let down = null;
  slot.addEventListener('pointerdown', e => {
    if (e.button && e.button !== 0) return;
    down = { x: e.clientX, y: e.clientY, yaw: store.user.yaw, pitch: store.user.pitch, moved: false, id: e.pointerId, touch: e.pointerType === 'touch' };
  });
  slot.addEventListener('pointermove', e => {
    if (!down || e.pointerId !== down.id) return;
    const dx = e.clientX - down.x, dy = e.clientY - down.y;
    if (!down.moved && Math.hypot(dx, dy) > 5) { down.moved = true; try { slot.setPointerCapture(e.pointerId); } catch (_) {} }
    if (!down.moved) return;
    store.user.yaw = down.yaw + dx * .009;
    if (!down.touch) store.user.pitch = Math.max(-.6, Math.min(.6, down.pitch + dy * .006));
  });
  const end = e => {
    if (!down) return;
    if (!down.moved && e.type === 'pointerup' && store.pick && slot.dataset.slot === 'demo') {
      const uv = store.pick(e.clientX, e.clientY); if (uv) screenTap(uv.x, uv.y);
    }
    down = null;
  };
  slot.addEventListener('pointerup', end); slot.addEventListener('pointercancel', end);
  slot.addEventListener('keydown', e => {
    const k = { ArrowLeft: [-.25, 0], ArrowRight: [.25, 0], ArrowUp: [0, -.15], ArrowDown: [0, .15] }[e.key];
    if (k) { e.preventDefault(); store.user.yaw += k[0]; store.user.pitch = Math.max(-.6, Math.min(.6, store.user.pitch + k[1])); }
    if (e.key === 'Escape' || e.key === '0') { store.user.yaw = 0; store.user.pitch = 0; }
  });
});

/* ============ datos simulados en vivo ============ */
let ticks = 0;
setInterval(() => {
  const alert = screen.state && screen.state.tone === 'coral';
  const target = alert ? 88 + Math.random() * 7 : 67 + Math.random() * 8;
  store.bpm = Math.round(store.bpm + (target - store.bpm) * .5);
  bio.desire = Math.max(.08, Math.min(.96, bio.desire + ((alert ? .8 : .3) - bio.desire) * .25 + (Math.random() - .5) * .04));
  bio.att = Math.round(Math.max(20, Math.min(95, bio.att + (Math.random() - .5) * 6)));
  $('#mBpm').textContent = store.bpm; $('#mDesire').textContent = dec(bio.desire); $('#mAtt').textContent = bio.att;
  if (demo.tab === 'estudio' && demo.idx.estudio === 1 && !demo.done['estudio-1']) demo.timer++;
  if (demo.tab === 'adulto' && demo.idx.adulto === 2 && !demo.done['adulto-2'] && ++ticks % 4 === 0) demo.extra++;
  const ex = curEx(); if (store.section === 'notificaciones' && ex.bio) $('#ctxBio').textContent = ex.bio();
  screen.refresh();
}, 1000);

/* ============ arranque ============ */
setTab('adulto');
sync(null, true);

// Capa 3D: se carga aparte. Si falla o no hay WebGL, queda el respaldo plano.
function hasWebGL() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (_) { return false; } }
if (hasWebGL()) {
  import('./watch3d.js').then(m => m.init(store)).catch(err => { console.warn('3D no disponible:', err); fallback(); });
} else fallback();
function fallback() { store.no3d = true; root.classList.add('no3d'); root.classList.remove('loading'); screen.refresh(); }
