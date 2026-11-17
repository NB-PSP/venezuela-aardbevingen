'use strict';
/* Dashboard aardbevingen Venezuela. Leest data/*.json. Geen externe afhankelijkheden. */
const NS = 'http://www.w3.org/2000/svg';
const $ = (id) => document.getElementById(id);
const DAY = 864e5;
const MAANDEN = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const MND_KORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

/* ---------- DOM-hulpjes ---------- */
function setAttrs(e, a) {
  for (const [k, v] of Object.entries(a)) {
    if (v === null || v === undefined || v === false) continue;
    if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
}
function add(e, kids) {
  for (const k of kids.flat(Infinity)) { if (k == null || k === false) continue; e.append(k.nodeType ? k : document.createTextNode(String(k))); }
  return e;
}
const h = (tag, a = {}, ...kids) => { const e = document.createElement(tag); setAttrs(e, a); return add(e, kids); };
const sv = (tag, a = {}, ...kids) => { const e = document.createElementNS(NS, tag); setAttrs(e, a); return add(e, kids); };
const clear = (el) => { el.replaceChildren(); return el; };

/* ---------- opmaak (Nederlandse notatie) ---------- */
const nf = new Intl.NumberFormat('nl-NL');
const nd = (d) => new Intl.NumberFormat('nl-NL', { minimumFractionDigits: d, maximumFractionDigits: d });
const n1 = nd(1), n2 = nd(2);
const fi = (v) => nf.format(v), f1 = (v) => n1.format(v), f2 = (v) => n2.format(v);
const p2 = (n) => String(n).padStart(2, '0');
const fmtD = (s) => `${s.slice(8, 10)}-${s.slice(5, 7)}-${s.slice(0, 4)}`;
const fmtShort = (s) => `${+s.slice(8, 10)} ${MND_KORT[+s.slice(5, 7) - 1]}`;
const isoDay = (ms) => new Date(ms).toISOString().slice(0, 10);
const fmtMs = (ms, off) => { const d = new Date(ms + off * 3600e3); return `${p2(d.getUTCDate())}-${p2(d.getUTCMonth() + 1)}-${d.getUTCFullYear()} ${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}`; };
const monthLabel = (k) => `${MAANDEN[+k.slice(5, 7) - 1]} ${k.slice(0, 4)}`;
const signed = (v) => (v > 0 ? '+' : v < 0 ? '−' : '±') + fi(Math.abs(v));

/* ---------- tijd en weken (Venezolaanse tijd) ---------- */
const parseD = (s) => Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10));
function isoWeek(dateStr) {
  const t = parseD(dateStr);
  const dow = (new Date(t).getUTCDay() + 6) % 7;
  const mon = t - dow * DAY;
  const thu = mon + 3 * DAY;
  const y = new Date(thu).getUTCFullYear();
  const wk = Math.floor((thu - Date.UTC(y, 0, 1)) / DAY / 7) + 1;
  return { key: `${y}-W${p2(wk)}`, start: mon, label: `week ${wk} (${y})` };
}

/* ---------- geo ---------- */
const rad = (d) => d * Math.PI / 180;
function haversine(lat1, lon1, lat2, lon2) {
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 6371.0088 * 2 * Math.asin(Math.sqrt(a));
}
const norm = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const depthClass = (d) => (d < 20 ? 'd1' : d < 70 ? 'd2' : d < 150 ? 'd3' : 'd4');
const coordTxt = (lat, lon) => `${f2(Math.abs(lat))}° ${lat >= 0 ? 'N' : 'Z'}, ${f2(Math.abs(lon))}° ${lon >= 0 ? 'O' : 'W'}`;

/* ---------- statistiek ---------- */
function stats(list) {
  if (!list.length) return { n: 0, max: null, avg: null, latest: null };
  let max = list[0], sum = 0, latest = list[0];
  for (const e of list) {
    sum += e.mag;
    if (e.mag > max.mag || (e.mag === max.mag && e.utc > max.utc)) max = e;
    if (e.utc > latest.utc) latest = e;
  }
  return { n: list.length, max, avg: sum / list.length, latest };
}
function buckets(list, keys, keyOf) {
  const m = new Map(keys.map((k) => [k.key, []]));
  for (const e of list) m.get(keyOf(e))?.push(e);
  return keys.map((k) => ({ ...k, ...stats(m.get(k.key)) }));
}

/* ---------- componenten ---------- */
const card = (lbl, val, sub) => h('div', { class: 'card' }, h('div', { class: 'lbl' }, lbl), h('div', { class: 'val' }, val), sub ? h('div', { class: 'sub' }, sub) : null);

function table(el, heads, rows) {
  clear(el).append(h('table', {},
    h('thead', {}, h('tr', {}, heads.map((t, i) => h('th', { class: i === 0 ? 'l' : null, scope: 'col' }, t)))),
    h('tbody', {}, rows.map((r) => h('tr', {}, r.map((c, i) => h('td', { class: i === 0 ? 'l' : null }, c)))))));
}

function listTable(el, evs, size = 100) {
  clear(el);
  const heads = ['Datum (HLV)', 'Tijd (HLV)', 'Mag.', 'Diepte (km)', 'Afstand La Guaira (km)', 'Plaats', 'Breedte', 'Lengte', 'Rapport'];
  const tb = h('tbody');
  const wrap = h('div', { class: 'tablewrap' }, h('table', {},
    h('thead', {}, h('tr', {}, heads.map((t, i) => h('th', { class: i === 0 || i === 5 ? 'l' : null, scope: 'col' }, t)))), tb));
  let shown = 0;
  const more = h('button', { type: 'button', class: 'more' });
  const render = () => {
    for (const e of evs.slice(shown, shown + size)) {
      tb.append(h('tr', {},
        h('td', { class: 'l' }, fmtD(e.datum_hlv)), h('td', {}, e.tijd_hlv), h('td', {}, f1(e.mag)),
        h('td', {}, f1(e.diepte_km) + (e.diepte_vast ? ' (vast)' : '')), h('td', {}, f1(e.afstand)),
        h('td', { class: 'l' }, e.plaats), h('td', {}, f2(e.lat)), h('td', {}, f2(e.lon)),
        h('td', {}, h('a', { href: e.rapport, rel: 'noopener' }, 'rapport'))));
    }
    shown = Math.min(evs.length, shown + size);
    more.hidden = shown >= evs.length;
    more.textContent = `Toon meer (${fi(evs.length - shown)} te gaan)`;
  };
  more.addEventListener('click', render);
  el.append(wrap, h('p', { class: 'note' }, `${fi(evs.length)} bevingen`), more);
  if (!evs.length) { wrap.replaceChildren(h('p', { class: 'note', style: 'padding:10px' }, 'Geen bevingen.')); more.hidden = true; return; }
  render();
}

function showDetail(el, e) {
  clear(el).append(h('h4', { style: 'margin:0 0 8px' }, `Magnitude ${f1(e.mag)}`), h('dl', { class: 'det' },
    h('dt', {}, 'Tijd (HLV)'), h('dd', {}, `${fmtD(e.datum_hlv)} ${e.tijd_hlv}`),
    h('dt', {}, 'Tijd (UTC)'), h('dd', {}, fmtMs(Date.parse(e.utc), 0)),
    h('dt', {}, 'Diepte'), h('dd', {}, `${f1(e.diepte_km)} km${e.diepte_vast ? ' (vastgezet)' : ''}`),
    h('dt', {}, 'Afstand'), h('dd', {}, `${f1(e.afstand)} km van La Guaira`),
    h('dt', {}, 'Coördinaten'), h('dd', {}, coordTxt(e.lat, e.lon)),
    h('dt', {}, 'Plaats'), h('dd', {}, e.plaats),
    h('dt', {}, 'Bron'), h('dd', {}, h('a', { href: e.rapport, rel: 'noopener' }, 'FUNVISIS-rapport'))));
}

function legend(el) {
  clear(el).append(
    ...[['d1', 'diepte < 20 km'], ['d2', '20–70 km'], ['d3', '70–150 km'], ['d4', '> 150 km']].map(([c, t]) => {
      const i = h('i'); i.style.background = `var(--${c.replace('d', 'd')})`; return h('span', {}, i, t);
    }), h('span', {}, 'Grootte = magnitude'));
}

function pointEl(e, cx, cy, r, detailEl, group) {
  const c = sv('circle', {
    class: `pt ${depthClass(e.diepte_km)}`, cx, cy, r, tabindex: 0, role: 'button',
    'aria-label': `Magnitude ${f1(e.mag)} op ${fmtD(e.datum_hlv)} ${e.tijd_hlv}, ${f1(e.diepte_km)} km diep, ${f1(e.afstand)} km van La Guaira`,
  });
  const go = () => { group.querySelector('.sel')?.classList.remove('sel'); c.classList.add('sel'); showDetail(detailEl, e); };
  c.addEventListener('click', go); c.addEventListener('mouseenter', go); c.addEventListener('focus', go);
  c.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(); } });
  return c;
}

/* ---------- land en kust (uit data/geo.json) ---------- */
function landLayer(geoPart, proj, extra = {}) {
  const g = sv('g', extra);
  for (const land of geoPart.landen) {
    const d = land.ringen.map((r) => { let t = ''; for (let i = 0; i < r.length; i += 2) { const [x, y] = proj(r[i], r[i + 1]); t += `${i ? 'L' : 'M'}${x.toFixed(2)} ${y.toFixed(2)}`; } return t + 'Z'; }).join('');
    g.append(sv('path', { d, class: land.vz ? 'land vz' : 'land', 'fill-rule': 'evenodd' }));
  }
  return g;
}
function placesLayer(plaatsen, proj, fs, dx) {
  const g = sv('g');
  for (const [naam, lat, lon] of plaatsen) {
    const [x, y] = proj(lon, lat);
    g.append(sv('circle', { cx: x, cy: y, r: fs * 0.22, style: 'fill:var(--text);opacity:.7' }), sv('text', { x: x + dx, y: y + fs * 0.3, 'font-size': fs, class: 'place' }, naam));
  }
  return g;
}

/* ---------- kaart La Guaira ---------- */
function mapLG(el, detailEl, evs, cfg, geo) {
  const R = cfg.la_guaira.straal_km, { lat: lat0, lon: lon0 } = cfg.la_guaira, k = Math.cos(rad(lat0)) * 111.32;
  const pts = sv('g');
  const svg = sv('svg', { class: 'map', viewBox: `${-R - 8} ${-R - 8} ${2 * R + 16} ${2 * R + 16}`, role: 'img', 'aria-label': `Kaart met ${evs.length} bevingen binnen ${R} km van La Guaira`, style: '--sw:.25' });
  const projKm = (lon, lat) => [(lon - lon0) * k, -(lat - lat0) * 110.574];
  if (geo) { svg.append(landLayer(geo.lg, projKm)); svg.append(placesLayer(geo.lg.plaatsen, projKm, 2.6, 1.5)); }
  for (let r = 10; r <= R; r += 10) {
    svg.append(sv('circle', { class: r === R ? 'ring main' : 'ring', cx: 0, cy: 0, r }));
    svg.append(sv('text', { x: r * 0.7071 + .6, y: -r * 0.7071 - .3, 'font-size': 2.6 }, `${r} km`));
  }
  svg.append(sv('path', { d: 'M-2.5 0H2.5M0 -2.5V2.5', stroke: 'var(--text)', 'stroke-width': .5 }));
  svg.append(sv('text', { x: 2.2, y: 5.2, 'font-size': 3, style: 'fill:var(--text);font-weight:700' }, 'La Guaira'));
  svg.append(sv('g', { transform: `translate(${R + 3} ${-R + 1})` },
    sv('path', { d: 'M0 -6L2.2 1L0 -.6L-2.2 1Z', style: 'fill:var(--text)' }), sv('text', { x: 0, y: 5, 'font-size': 3, 'text-anchor': 'middle' }, 'N')));
  svg.append(sv('g', { transform: `translate(${-R - 4} ${R + 3})` },
    sv('path', { d: 'M0 0H10M0 -1V1M10 -1V1', stroke: 'var(--text)', 'stroke-width': .5, fill: 'none' }), sv('text', { x: 0, y: 4.5, 'font-size': 2.8 }, '10 km')));
  for (const e of [...evs].sort((a, b) => a.mag - b.mag)) {
    pts.append(pointEl(e, +((e.lon - lon0) * k).toFixed(2), +(-(e.lat - lat0) * 110.574).toFixed(2), +(0.3 + 0.22 * e.mag).toFixed(2), detailEl, pts));
  }
  svg.append(pts);
  clear(el).append(svg);
}

/* ---------- kaart rest van Venezuela (raster van lengte/breedte) ---------- */
function mapRest(el, detailEl, evs, geo) {
  if (!evs.length) { clear(el).append(h('p', { class: 'note' }, 'Geen bevingen.')); return; }
  const lons = evs.map((e) => e.lon), lats = evs.map((e) => e.lat);
  const minLon = Math.min(-74, Math.floor(Math.min(...lons))), maxLon = Math.max(-59, Math.ceil(Math.max(...lons)));
  const minLat = Math.min(0, Math.floor(Math.min(...lats))), maxLat = Math.max(13, Math.ceil(Math.max(...lats)));
  const k = Math.cos(rad((minLat + maxLat) / 2)), W = (maxLon - minLon) * k, H = maxLat - minLat, mL = 1.1, mB = 0.9;
  const X = (lon) => (lon - minLon) * k, Y = (lat) => maxLat - lat;
  const svg = sv('svg', { class: 'map', viewBox: `${-mL} -0.3 ${W + mL + 0.3} ${H + mB + 0.3}`, role: 'img', 'aria-label': `Overzichtskaart met ${evs.length} bevingen`, style: '--sw:.03' });
  const line = { style: 'stroke:var(--grid);stroke-width:.03' };
  if (geo) { svg.append(landLayer(geo.regio, (lo, la) => [X(lo), Y(la)])); }
  for (let lo = minLon; lo <= maxLon; lo++) {
    svg.append(sv('line', { ...line, x1: X(lo), x2: X(lo), y1: 0, y2: H }));
    if (lo % 2 === 0) svg.append(sv('text', { x: X(lo), y: H + 0.7, 'font-size': 0.5, 'text-anchor': 'middle' }, `${Math.abs(lo)}°${lo < 0 ? 'W' : 'O'}`));
  }
  for (let la = minLat; la <= maxLat; la++) {
    svg.append(sv('line', { ...line, x1: 0, x2: W, y1: Y(la), y2: Y(la) }));
    svg.append(sv('text', { x: -0.15, y: Y(la) + 0.17, 'font-size': 0.5, 'text-anchor': 'end' }, `${Math.abs(la)}°${la >= 0 ? 'N' : 'Z'}`));
  }
  if (geo) svg.append(placesLayer(geo.regio.plaatsen, (lo, la) => [X(lo), Y(la)], 0.42, 0.18));
  const pts = sv('g');
  for (const e of [...evs].sort((a, b) => a.mag - b.mag)) pts.append(pointEl(e, +X(e.lon).toFixed(3), +Y(e.lat).toFixed(3), +(0.02 + 0.014 * e.mag).toFixed(3), detailEl, pts));
  svg.append(pts);
  clear(el).append(svg);
}

/* ---------- staafdiagram ---------- */
function niceTop(max) {
  for (const step of [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000]) if (max / step <= 5) return { step, top: Math.ceil(max / step) * step };
  return { step: 1000, top: Math.ceil(max / 1000) * 1000 };
}
function barChart(el, items, ariaLabel, minGap = 70) {
  const W = 640, H = 230, ml = 40, mr = 8, mt = 10, mb = 36, iw = W - ml - mr, ih = H - mt - mb;
  const { step, top } = niceTop(Math.max(1, ...items.map((i) => i.value)));
  const svg = sv('svg', { class: 'chart', viewBox: `0 0 ${W} ${H}`, role: 'group', 'aria-label': ariaLabel });
  for (let v = 0; v <= top; v += step) {
    const y = mt + ih - (v / top) * ih;
    svg.append(sv('line', { class: 'grid', x1: ml, x2: W - mr, y1: y, y2: y }), sv('text', { x: ml - 5, y: y + 4, 'font-size': 11, 'text-anchor': 'end' }, fi(v)));
  }
  const tip = h('p', { class: 'tip', 'aria-live': 'polite' }, 'Tik op een staaf voor details.');
  const bw = iw / items.length, every = Math.max(1, Math.ceil(minGap / bw)), bw2 = Math.max(1, bw * 0.78);
  items.forEach((it, i) => {
    const x = ml + i * bw, bh = (it.value / top) * ih;
    const g = sv('g', { class: 'b', tabindex: 0, role: 'button', 'aria-label': it.tip });
    g.append(sv('rect', { x, y: mt, width: bw, height: ih, fill: 'transparent' }), sv('rect', { class: 'bar', x: x + (bw - bw2) / 2, y: mt + ih - bh, width: bw2, height: bh }));
    const go = () => { svg.querySelector('.sel')?.classList.remove('sel'); g.classList.add('sel'); tip.textContent = it.tip; };
    g.addEventListener('click', go); g.addEventListener('focus', go); g.addEventListener('mouseenter', go);
    g.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(); } });
    svg.append(g);
    if (i % every === 0) svg.append(sv('text', { x: x + bw / 2, y: H - mb + 15, 'font-size': 11, 'text-anchor': 'middle' }, it.tick));
  });
  svg.append(sv('line', { class: 'axis', x1: ml, x2: W - mr, y1: mt + ih, y2: mt + ih }));
  clear(el).append(svg, tip);
}

/* ---------- lijngrafiek (cumulatief) ---------- */
function lineChart(el, official, daily, ariaLabel) {
  const W = 640, H = 260, ml = 44, mr = 12, mt = 12, mb = 30, iw = W - ml - mr, ih = H - mt - mb;
  const ts = [...official.map((p) => p.t), ...daily.map((p) => p.t)];
  const t0 = Math.min(...ts), t1 = Math.max(...ts), vmax = Math.max(...official.map((p) => p.v), ...daily.map((p) => p.v), 1);
  const { step, top } = niceTop(vmax);
  const X = (t) => ml + ((t - t0) / Math.max(1, t1 - t0)) * iw, Y = (v) => mt + ih - (v / top) * ih;
  const svg = sv('svg', { class: 'chart', viewBox: `0 0 ${W} ${H}`, role: 'group', 'aria-label': ariaLabel });
  for (let v = 0; v <= top; v += step) svg.append(sv('line', { class: 'grid', x1: ml, x2: W - mr, y1: Y(v), y2: Y(v) }), sv('text', { x: ml - 5, y: Y(v) + 4, 'font-size': 11, 'text-anchor': 'end' }, fi(v)));
  const d0 = new Date(t0); let my = d0.getUTCFullYear(), mm = d0.getUTCMonth() + 1;
  for (; Date.UTC(my, mm, 1) <= t1; ) {
    const t = Date.UTC(my, mm, 1);
    svg.append(sv('line', { class: 'grid', x1: X(t), x2: X(t), y1: mt, y2: mt + ih }), sv('text', { x: X(t), y: H - 10, 'font-size': 11, 'text-anchor': 'middle' }, MND_KORT[mm % 12]));
    if (++mm > 11) { mm = 0; my++; }
  }
  svg.append(sv('path', { d: daily.map((p, i) => `${i ? 'L' : 'M'}${X(p.t).toFixed(1)} ${Y(p.v).toFixed(1)}`).join(''), fill: 'none', style: 'stroke:var(--muted);stroke-width:2;stroke-dasharray:5 4' }));
  svg.append(sv('path', { d: official.map((p, i) => `${i ? 'L' : 'M'}${X(p.t).toFixed(1)} ${Y(p.v).toFixed(1)}`).join(''), fill: 'none', style: 'stroke:var(--bar);stroke-width:2.5' }));
  const tip = h('p', { class: 'tip', 'aria-live': 'polite' }, 'Tik op een punt voor details.');
  for (const p of official) {
    const c = sv('circle', { cx: X(p.t), cy: Y(p.v), r: 6, tabindex: 0, role: 'button', 'aria-label': p.tip, style: `fill:${p.ca ? 'var(--card)' : 'var(--bar)'};stroke:var(--bar);stroke-width:2.5;cursor:pointer` });
    const go = () => { tip.textContent = p.tip; };
    c.addEventListener('click', go); c.addEventListener('focus', go); c.addEventListener('mouseenter', go);
    c.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(); } });
    svg.append(c);
  }
  svg.append(sv('line', { class: 'axis', x1: ml, x2: W - mr, y1: mt + ih, y2: mt + ih }));
  const leg = h('div', { class: 'legend' }, h('span', {}, '● officieel totaal FUNVISIS (open cirkel = “circa”)'), h('span', {}, '- - telling uit de losse lijst (zonder buurlanden)'));
  clear(el).append(svg, leg, tip);
}

/* ---------- week/maand-blokken ---------- */
/* Staafdiagram met een venster van `size` staven en knoppen < en > om 1 week/maand op te schuiven. */
function windowed(el, items, size, aria, noun, minGap) {
  let end = items.length;
  const prev = h('button', { type: 'button', class: 'more navbtn', 'aria-label': `Een ${noun} eerder` }, '‹');
  const next = h('button', { type: 'button', class: 'more navbtn', 'aria-label': `Een ${noun} later` }, '›');
  const info = h('span', { class: 'note', 'aria-live': 'polite' });
  el.parentNode.insertBefore(h('div', { class: 'filter navrow' }, prev, next, info), el);
  const draw = () => {
    const start = Math.max(0, end - size), part = items.slice(start, end);
    barChart(el, part, aria, minGap);
    info.textContent = `${part[0].span.split(' – ')[0]} t/m ${part[part.length - 1].span.split(' – ').pop()}`;
    prev.disabled = start <= 0; next.disabled = end >= items.length;
  };
  prev.addEventListener('click', () => { end = Math.max(Math.min(size, items.length), end - 1); draw(); });
  next.addEventListener('click', () => { end = Math.min(items.length, end + 1); draw(); });
  draw();
}

function periodBlock(prefix, evs, weeks, months) {
  const wk = buckets(evs, weeks, (e) => e.wk), mo = buckets(evs, months, (e) => e.mo);
  const tipOf = (b, naam) => b.n ? `${naam}: ${fi(b.n)} bevingen, hoogste magnitude ${f1(b.max.mag)}, gemiddelde ${f1(b.avg)}.` : `${naam}: geen bevingen.`;
  windowed($(`${prefix}-weekchart`), wk.map((b) => ({ value: b.n, tick: b.short, tip: tipOf(b, `${b.label}, ${b.range}`), span: b.range })), 16, 'Aantal bevingen per week', 'week', 36);
  table($(`${prefix}-weektable`), ['Week', 'Periode', 'Aantal', 'Hoogste mag.'], [...wk].reverse().map((b) => [b.label, b.range, fi(b.n), b.n ? f1(b.max.mag) : '–']));
  windowed($(`${prefix}-monthchart`), mo.map((b) => ({ value: b.n, tick: MND_KORT[+b.key.slice(5) - 1], tip: tipOf(b, monthLabel(b.key)), span: monthLabel(b.key) })), 6, 'Aantal bevingen per maand', 'maand', 40);
  table($(`${prefix}-monthtable`), ['Maand', 'Aantal', 'Gemiddelde mag.', 'Hoogste mag.'], [...mo].reverse().map((b) => [monthLabel(b.key), fi(b.n), b.n ? f1(b.avg) : '–', b.n ? f1(b.max.mag) : '–']));
}

function statCards(el, st, since, extra = []) {
  const m = st.max, l = st.latest;
  clear(el).append(
    card('Aantal bevingen', fi(st.n), since),
    m ? card('Grootste', `M ${f1(m.mag)}`, `${fmtD(m.datum_hlv)} ${m.tijd_hlv} HLV · ${f1(m.diepte_km)} km diep · ${f1(m.afstand)} km van La Guaira`) : card('Grootste', '–'),
    l ? card('Laatste', `M ${f1(l.mag)}`, `${fmtD(l.datum_hlv)} ${l.tijd_hlv} HLV · ${f1(l.diepte_km)} km diep · ${l.plaats}`) : card('Laatste', '–'),
    ...extra);
}

/* ---------- hoofdprogramma ---------- */
async function load() {
  const get = async (f) => { const r = await fetch(`data/${f}`, { cache: 'no-cache' }); if (!r.ok) throw new Error(`${f}: HTTP ${r.status}`); return r.json(); };
  return Promise.all([get('config.json'), get('events.json'), get('official.json'), get('meta.json'), get('geo.json').catch(() => null)]);
}

function build(cfg, events, off, meta, geo) {
  const { lat: la0, lon: lo0, straal_km: R } = cfg.la_guaira;
  const terms = cfg.buurland_plaatsen.map(norm);
  for (const e of events) {
    e.afstand = haversine(la0, lo0, e.lat, e.lon);
    e.mo = e.datum_hlv.slice(0, 7);
    e.wk = isoWeek(e.datum_hlv).key;
    const p = norm(e.plaats);
    e.zone = terms.some((t) => p.includes(t)) ? 'buur' : e.afstand <= R ? 'lg' : 'rest';
  }
  const lg = events.filter((e) => e.zone === 'lg'), rest = events.filter((e) => e.zone === 'rest'), buur = events.filter((e) => e.zone === 'buur');
  const first = events.length ? events[events.length - 1].datum_hlv : null, last = events[0]?.datum_hlv;
  const nowHlv = Date.now() - 4 * 3600e3, today = isoDay(nowHlv);

  // weken en maanden (doorlopend, ook lege)
  const lastDay = last && last > today ? last : today;
  const weeks = []; for (let t = isoWeek(first).start; t <= parseD(lastDay); t += 7 * DAY) {
    const w = isoWeek(isoDay(t)), end = isoDay(t + 6 * DAY);
    weeks.push({ key: w.key, label: w.label, range: `${fmtShort(isoDay(t))} – ${fmtShort(end)}`, short: `${+isoDay(t).slice(8)}/${+isoDay(t).slice(5, 7)}` });
  }
  const months = []; for (let y = +first.slice(0, 4), m = +first.slice(5, 7); `${y}-${p2(m)}` <= lastDay.slice(0, 7);) { months.push({ key: `${y}-${p2(m)}` }); if (++m > 12) { m = 1; y++; } }

  /* Overzicht */
  const cum = [...off.cumulatief].sort((a, b) => a.datum.localeCompare(b.datum)), lastCum = cum[cum.length - 1];
  const curMonth = today.slice(0, 7);
  const inMonth = events.filter((e) => e.mo === curMonth);
  const age = meta.laatste_controle_utc ? (Date.now() - Date.parse(meta.laatste_controle_utc)) / DAY : Infinity;
  const limit = cfg.waarschuwing_na_dagen ?? 9;
  clear($('ov-warn'));
  if (age > limit) $('ov-warn').append(h('div', { class: 'warn', role: 'alert' }, `Let op: de gegevens zijn ${Number.isFinite(age) ? `${Math.floor(age)} dagen` : 'onbekend lang'} niet bijgewerkt (meer dan ${limit} dagen). De getoonde cijfers kunnen achterlopen.`));
  clear($('ov-cards')).append(
    card('Totaal sinds 24 juni', fi(lastCum.aantal), `${lastCum.ca ? 'circa, ' : ''}stand ${fmtD(lastCum.datum)} · ${lastCum.bron}`),
    ...off.hoofdbevingen.map((b, i) => card(`Hoofdbeving ${i + 1}`, `M ${f1(b.mag)}`, `${fmtD(b.datum_hlv)} ${b.tijd_hlv} HLV · ${f1(b.diepte_km)} km diep · ${b.omschrijving}`)),
    card(`Lopende maand (${monthLabel(curMonth)})`, fi(inMonth.filter((e) => e.zone !== 'buur').length), `losse bevingen in Venezuela, ${fi(inMonth.filter((e) => e.zone === 'buur').length)} in buurlanden niet meegeteld`));
  $('ov-upd').textContent = meta.laatste_controle_utc
    ? `Laatst bijgewerkt: ${fmtMs(Date.parse(meta.laatste_controle_utc), -4)} HLV (${fmtMs(Date.parse(meta.laatste_controle_utc), 0)} UTC). Nieuwste beving in de lijst: ${events[0] ? `${fmtD(events[0].datum_hlv)} ${events[0].tijd_hlv} HLV` : '–'}.`
    : 'Laatste update onbekend.';

  /* Deel 1 */
  $('lg-lead').textContent = `Bevingen binnen ${R} km van 10,60° N, 66,93° W (afstand berekend met de haversine-formule), sinds ${fmtD(first)}.`;
  legend($('lg-legend')); legend($('r-legend'));
  const sel = $('lg-filter');
  sel.replaceChildren(h('option', { value: 'all' }, 'Alle bevingen'),
    h('optgroup', { label: 'Per maand' }, [...months].reverse().map((m) => h('option', { value: `m:${m.key}` }, monthLabel(m.key)))),
    h('optgroup', { label: 'Per week' }, [...weeks].reverse().map((w) => h('option', { value: `w:${w.key}` }, `${w.label}: ${w.range}`))));
  const drawLG = () => {
    const v = sel.value;
    const sub = v === 'all' ? lg : lg.filter((e) => (v.startsWith('m:') ? e.mo === v.slice(2) : e.wk === v.slice(2)));
    mapLG($('lg-map'), clear($('lg-detail')).appendChild(h('p', { class: 'note' }, 'Tik of beweeg over een punt voor details.')) && $('lg-detail'), sub, cfg, geo);
    $('lg-count').textContent = `${fi(sub.length)} bevingen getoond`;
    // Kerncijfers volgen de gekozen periode
    const label = v === 'all' ? `sinds ${fmtD(first)}` : v.startsWith('m:') ? `in ${monthLabel(v.slice(2))}` : `in ${weeks.find((w) => w.key === v.slice(2)).label}, ${weeks.find((w) => w.key === v.slice(2)).range}`;
    statCards($('lg-stats'), stats(sub), label);
  };
  sel.addEventListener('change', drawLG); drawLG();
  periodBlock('lg', lg, weeks, months);
  listTable($('lg-list'), lg);

  /* Deel 2 */
  statCards($('r-stats'), stats(rest), `sinds ${fmtD(first)}`, [card('Buurlanden (niet meegeteld)', fi(buur.length), 'bevingen die FUNVISIS ook meldt, net buiten Venezuela')]);
  const startReeks = off.start_reeks;
  const vz = events.filter((e) => e.zone !== 'buur');
  const perDag = new Map(); for (const e of vz) if (e.datum_hlv >= startReeks) perDag.set(e.datum_hlv, (perDag.get(e.datum_hlv) || 0) + 1);
  const countUntil = (d) => vz.filter((e) => e.datum_hlv >= startReeks && e.datum_hlv <= d).length;
  const dailyEnd = lastCum.datum > lastDay ? lastCum.datum : lastDay;
  const daily = []; let run = 0;
  for (let t = parseD(startReeks); t <= parseD(dailyEnd); t += DAY) { run += perDag.get(isoDay(t)) || 0; daily.push({ t, v: run }); }
  lineChart($('r-cumchart'), cum.map((c) => ({ t: parseD(c.datum), v: c.aantal, ca: c.ca, tip: `${fmtD(c.datum)}: ${fi(c.aantal)} bevingen sinds 24 juni${c.ca ? ' (circa)' : ''}. Bron: ${c.bron}.` })), daily, 'Cumulatief aantal bevingen sinds 24 juni');
  $('r-cumnote').textContent = 'Officiële cijfers zijn handmatig overgenomen en komen niet op elke datum voor; de lijn tussen de punten is een verbindingslijn, geen meting.';
  const wr = [...off.weekrapporten].sort((a, b) => a.van.localeCompare(b.van));
  barChart($('r-reportchart'), wr.map((w) => ({ value: w.aantal, tick: fmtShort(w.van), tip: `Week ${fmtD(w.van)} t/m ${fmtD(w.tot)}: ${fi(w.aantal)} bevingen (FUNVISIS, heel het land). Bron: ${w.bron}.` })), 'Aantal bevingen per weekrapport', 60);

  // afwijkingen
  const mc = Object.entries(meta.controle_per_maand || {}).sort(([a], [b]) => a.localeCompare(b));
  let lastBad = -1; mc.forEach(([, v], i) => { if (v.klopt === false) lastBad = i; });
  const okN = mc.filter(([, v]) => v.klopt === true).length, noN = mc.filter(([, v]) => v.klopt === null).length;
  const completeFrom = mc.length ? (lastBad + 1 < mc.length ? fmtD(`${mc[lastBad + 1][0]}-01`) : null) : null;
  $('r-complete').textContent = mc.length
    ? `De losse lijst begint op ${fmtD(first)}. ${completeFrom ? `Vanaf ${completeFrom} komt het aantal per maand overeen met de teller van FUNVISIS` : 'Geen enkele maand komt overeen met de FUNVISIS-teller'} (${fi(okN)} van ${fi(mc.length)} maanden gecontroleerd${noN ? `, ${fi(noN)} zonder teller` : ''}).`
    : 'Er zijn nog geen maandcontroles beschikbaar.';
  const rows = [
    ...cum.map((c) => { const l = countUntil(c.datum); return ['Totaal', `24-06-2026 t/m ${fmtD(c.datum)}${c.ca ? ' (circa)' : ''}`, fi(c.aantal), fi(l), signed(l - c.aantal), c.bron]; }),
    ...wr.map((w) => { const l = vz.filter((e) => e.datum_hlv >= w.van && e.datum_hlv <= w.tot).length; return ['Week', `${fmtD(w.van)} t/m ${fmtD(w.tot)}`, fi(w.aantal), fi(l), signed(l - w.aantal), w.bron]; }),
  ];
  table($('r-compare'), ['Soort', 'Periode', 'Officieel', 'Losse lijst', 'Verschil', 'Bron'], rows);

  mapRest($('r-map'), $('r-detail'), rest, geo);
  periodBlock('r', rest, weeks, months);
  listTable($('r-list'), rest);
  $('r-neigh-s').textContent = `Bevingen in buurlanden (${fi(buur.length)}, niet meegeteld)`;
  listTable($('r-neigh'), buur);
}

function initChrome() {
  const root = document.documentElement, btn = $('themeBtn');
  try { const t = localStorage.getItem('thema'); if (t === 'light' || t === 'dark') root.dataset.theme = t; } catch { /* geen opslag */ }
  const eff = () => root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  const label = () => { btn.textContent = eff() === 'dark' ? '☀' : '☾'; btn.title = eff() === 'dark' ? 'Schakel naar licht thema' : 'Schakel naar donker thema'; };
  btn.addEventListener('click', () => { root.dataset.theme = eff() === 'dark' ? 'light' : 'dark'; try { localStorage.setItem('thema', root.dataset.theme); } catch { /* */ } label(); });
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', label);
  label();
  const tabs = [...document.querySelectorAll('.tab')];
  const mark = (id) => tabs.forEach((t) => t.setAttribute('aria-current', String(t.dataset.s === id)));
  mark('overzicht');
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((en) => en.forEach((x) => { if (x.isIntersecting) mark(x.target.id); }), { rootMargin: '-35% 0px -60% 0px' });
    document.querySelectorAll('main > section').forEach((s) => io.observe(s));
  }
}

initChrome();
load().then(([cfg, events, off, meta, geo]) => build(cfg, events, off, meta, geo)).catch((err) => {
  console.error(err);
  clear($('ov-cards')).append(h('div', { class: 'warn', role: 'alert' }, `De gegevens konden niet worden geladen (${err.message}). Probeer het later opnieuw.`));
});
