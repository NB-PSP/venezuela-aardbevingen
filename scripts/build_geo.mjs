#!/usr/bin/env node
// Eenmalig: zet landgrenzen (Natural Earth via het npm-pakket "world-atlas", publiek domein)
// om naar een klein bestand data/geo.json met kust en landgrenzen rond Venezuela.
// Gebruik: node scripts/build_geo.mjs pad/naar/countries-10m.json
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const src = process.argv[2];
if (!src) { console.error('Geef het pad naar countries-10m.json mee.'); process.exit(1); }
const topo = JSON.parse(await readFile(src, 'utf8'));

// --- topojson decoderen ---
const { scale: [sx, sy], translate: [tx, ty] } = topo.transform;
const arcs = topo.arcs.map((arc) => { let x = 0, y = 0; return arc.map(([dx, dy]) => { x += dx; y += dy; return [x * sx + tx, y * sy + ty]; }); });
const ringOf = (idx) => {
  const pts = [];
  for (const i of idx) {
    const a = i >= 0 ? arcs[i] : [...arcs[~i]].reverse();
    pts.push(...(pts.length ? a.slice(1) : a));
  }
  return pts;
};
const polygonsOf = (g) => (g.type === 'Polygon' ? [g.arcs] : g.type === 'MultiPolygon' ? g.arcs : []).map((p) => p.map(ringOf));

// --- clippen (Sutherland-Hodgman) op een rechthoek ---
function clip(ring, [x0, y0, x1, y1]) {
  const edges = [
    [(p) => p[0] >= x0, (a, b) => { const t = (x0 - a[0]) / (b[0] - a[0]); return [x0, a[1] + t * (b[1] - a[1])]; }],
    [(p) => p[0] <= x1, (a, b) => { const t = (x1 - a[0]) / (b[0] - a[0]); return [x1, a[1] + t * (b[1] - a[1])]; }],
    [(p) => p[1] >= y0, (a, b) => { const t = (y0 - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), y0]; }],
    [(p) => p[1] <= y1, (a, b) => { const t = (y1 - a[1]) / (b[1] - a[1]); return [a[0] + t * (b[0] - a[0]), y1]; }],
  ];
  let out = ring;
  for (const [inside, cut] of edges) {
    const inp = out; out = [];
    for (let i = 0; i < inp.length; i++) {
      const cur = inp[i], prev = inp[(i + inp.length - 1) % inp.length];
      if (inside(cur)) { if (!inside(prev)) out.push(cut(prev, cur)); out.push(cur); }
      else if (inside(prev)) out.push(cut(prev, cur));
    }
    if (!out.length) return [];
  }
  return out;
}

// --- vereenvoudigen (Douglas-Peucker) ---
function dp(pts, tol) {
  if (pts.length < 3) return pts;
  const keep = new Uint8Array(pts.length); keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop(); let max = 0, idx = -1;
    const [ax, ay] = pts[a], [bx, by] = pts[b], dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy) || 1e-12;
    for (let i = a + 1; i < b; i++) { const d = Math.abs(dy * (pts[i][0] - ax) - dx * (pts[i][1] - ay)) / len; if (d > max) { max = d; idx = i; } }
    if (max > tol) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
  }
  return pts.filter((_, i) => keep[i]);
}

// Ring vereenvoudigen: splits op het verste punt, anders valt een gesloten ring (begin = eind) in elkaar.
function dpRing(ring, tol) {
  let pts = ring;
  if (pts.length > 1 && pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) pts = pts.slice(0, -1);
  let m = 0, best = -1;
  pts.forEach((p, i) => { const d = Math.hypot(p[0] - pts[0][0], p[1] - pts[0][1]); if (d > best) { best = d; m = i; } });
  const a = dp(pts.slice(0, m + 1), tol), b = dp([...pts.slice(m), pts[0]], tol);
  return [...a, ...b.slice(1, -1)];
}

function bouw(bbox, tol, dec) {
  const f = 10 ** dec, landen = [];
  for (const g of topo.objects.countries.geometries) {
    const ringen = [];
    for (const poly of polygonsOf(g)) for (const ring of poly) {
      const c = dpRing(clip(ring, bbox), tol);
      if (c.length >= 4) ringen.push(c.flatMap(([x, y]) => [Math.round(x * f) / f, Math.round(y * f) / f]));
    }
    if (ringen.length) landen.push({ id: g.id, naam: g.properties?.name, vz: g.id === '862', ringen });
  }
  return { bbox, landen };
}

// Plaatsen ter oriëntatie (lat, lon)
const plaatsRegio = [['Caracas', 10.48, -66.90], ['Maracaibo', 10.64, -71.64], ['Valencia', 10.16, -68.00], ['Barquisimeto', 10.07, -69.32], ['San Felipe', 10.34, -68.74], ['Mérida', 8.59, -71.15], ['San Cristóbal', 7.77, -72.22], ['Cumaná', 10.46, -64.18], ['Maturín', 9.75, -63.18], ['Ciudad Bolívar', 8.12, -63.55], ['Puerto Ayacucho', 5.66, -67.62]];
const plaatsLG = [['Caracas', 10.4806, -66.9036], ['Los Teques', 10.3443, -67.0426], ['Naiguatá', 10.615, -66.74], ['Guarenas', 10.47, -66.61]];

const geo = {
  bron: 'Natural Earth (publiek domein) via world-atlas 2.0.2',
  regio: { ...bouw([-76, -1, -57, 16], 0.012, 2), plaatsen: plaatsRegio },
  lg: { ...bouw([-67.7, 9.9, -66.2, 11.3], 0.0006, 3), plaatsen: plaatsLG },
};
const out = JSON.stringify(geo);
await writeFile(path.join(ROOT, 'data', 'geo.json'), out + '\n', 'utf8');
for (const k of ['regio', 'lg']) console.log(k, geo[k].landen.map((l) => `${l.naam}(${l.ringen.reduce((s, r) => s + r.length / 2, 0)})`).join(', '));
console.log(`data/geo.json: ${(out.length / 1024).toFixed(0)} kB`);
