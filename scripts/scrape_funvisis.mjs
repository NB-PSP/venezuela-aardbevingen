#!/usr/bin/env node
// Haalt aardbevingen op van FUNVISIS en voegt ze toe aan data/events.json.
// Gebruik:
//   node scripts/scrape_funvisis.mjs                  (vorige + lopende maand)
//   node scripts/scrape_funvisis.mjs --vanaf 2026-01  (backfill vanaf maand t/m nu)
//   node scripts/scrape_funvisis.mjs --droog          (niets schrijven, alleen tonen)
// Bij een fout: niets overschrijven en stoppen met afsluitcode 1.

import { readFile, writeFile, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EVENTS_FILE = path.join(ROOT, 'data', 'events.json');
const META_FILE = path.join(ROOT, 'data', 'meta.json');
const BASE = 'http://www.funvisis.gob.ve/old/';
const URL_MES = BASE + 'sis_mes.php';
const URL_ANT = BASE + 'sis_ant.php';
const UA = 'venezuela-aardbevingen-dashboard/1.0 (open-source hobbyproject; leest openbare FUNVISIS-tabel)';
const TIMEOUT_MS = 30000;
const PAUZE_MS = 5000;
const EERSTE_MAAND = '2026-01'; // gegevens worden bijgehouden vanaf 1-1-2026
const META_VERVERS_MS = 20 * 3600 * 1000; // meta.json hoogstens 1x per dag herschrijven als er niets nieuws is (20 uur: marge voor de dagelijkse run, waarvan de starttijd bij GitHub wat kan schuiven)

const args = process.argv.slice(2);
const droog = args.includes('--droog');
const vanafIdx = args.indexOf('--vanaf');
const vanaf = vanafIdx >= 0 ? args[vanafIdx + 1] : null;
// FUNVISIS' database valt geregeld even weg. Daarom meer dan 3 pogingen met oplopende pauze.
const POGINGEN = vanaf ? 8 : 6;

const log = (...a) => console.log(...a);
const slaap = (ms) => new Promise((r) => setTimeout(r, ms));

async function leesJson(file, fallback) {
  try { return JSON.parse(await readFile(file, 'utf8')); }
  catch (e) { if (e.code === 'ENOENT') return fallback; throw e; }
}

async function schrijfAtomisch(file, obj) {
  const tmp = file + '.tmp';
  await writeFile(tmp, JSON.stringify(obj, null, 2) + '\n', 'utf8');
  await rename(tmp, file);
}

// ---------- ophalen met herhaling ----------
async function haal(url, { post } = {}) {
  let laatsteFout;
  for (let poging = 1; poging <= POGINGEN; poging++) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method: post ? 'POST' : 'GET',
        headers: {
          'User-Agent': UA,
          'Accept': 'text/html',
          ...(post ? { 'Content-Type': 'application/x-www-form-urlencoded' } : {}),
        },
        body: post ? new URLSearchParams(post).toString() : undefined,
        signal: ctl.signal,
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = new TextDecoder('utf-8').decode(await res.arrayBuffer());
      if (html.includes('fuera_servicio.php')) throw new Error('FUNVISIS meldt "fuera de servicio" (databasefout)');
      return html;
    } catch (e) {
      laatsteFout = e.name === 'AbortError' ? new Error('timeout') : e;
      log(`  poging ${poging}/${POGINGEN} mislukt voor ${url}${post ? ' ' + JSON.stringify(post) : ''}: ${laatsteFout.message}`);
      if (poging < POGINGEN) await slaap(Math.min(PAUZE_MS * poging, 20000));
    } finally { clearTimeout(timer); }
  }
  throw new Error(`Ophalen mislukt na ${POGINGEN} pogingen: ${laatsteFout.message}`);
}

// ---------- parsen ----------
const decode = (s) => s
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&quot;/g, '"').replace(/&#0?39;/g, "'")
  .replace(/&([aeiouAEIOUnN])(acute|tilde|grave|uml);/g, (_, c, t) =>
    ({ acute: { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', A: 'Á', E: 'É', I: 'Í', O: 'Ó', U: 'Ú' }, tilde: { n: 'ñ', N: 'Ñ' } }[t]?.[c] ?? c))
  .replace(/\s+/g, ' ').trim();

function parseMaand(html) {
  const cap = html.match(/Se han registrado\s*<font[^>]*>\s*(\d*)\s*<\/font>\s*eventos entre el\s*(\d{2}\/\d{2}\/\d{4})\s*y\s*(\d{2}\/\d{2}\/\d{4})/i);
  if (!cap) throw new Error('Kop "Se han registrado ... eventos" niet gevonden: paginastructuur gewijzigd?');
  const n = cap[1] === '' ? null : Number(cap[1]);

  const rijen = [];
  const trRe = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m;
  while ((m = trRe.exec(html))) {
    const blok = m[1];
    const link = blok.match(/href=['"]([^'"]*reporte_(\d+)\.gif)['"]/i);
    if (!link) continue;
    const cellen = [...blok.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((c) => decode(c[1].replace(/<[^>]+>/g, '')));
    if (cellen.length < 7) throw new Error(`Rij voor rapport ${link[2]} heeft ${cellen.length} kolommen i.p.v. 7`);
    const [datum, tijd, lat, lon, diep, mag, ...plaats] = cellen;
    const d = datum.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    const t = tijd.match(/^(\d{1,2})[:.](\d{2})/); // FUNVISIS schrijft soms "22.41"
    if (!d || !t) throw new Error(`Ongeldige datum/tijd in rapport ${link[2]}: "${datum}" "${tijd}"`);
    // Typefouten in de bron: "10:41" of "10,41" i.p.v. "10.41" worden als decimaalpunt gelezen (wordt gelogd).
    const num = (x) => {
      const schoon = x.replace(/^-{2,}/, '-').replace(/[:,]/, '.');
      if (/^-?\d+:\d+$/.test(x) || /^-{2,}/.test(x)) log(`  let op: rapport ${link[2]} heeft getal "${x}"; gelezen als ${schoon}`);
      const v = Number(schoon); if (!Number.isFinite(v)) throw new Error(`Ongeldig getal "${x}" in rapport ${link[2]}`); return v; };
    // Diepte met "F" (bijv. "5.0F") = door FUNVISIS vastgezette diepte; we bewaren het getal en markeren dat.
    const diepVast = /^\d+([.,]\d+)?F$/i.test(diep);
    const utc = new Date(Date.UTC(+d[3], +d[2] - 1, +d[1], +t[1] + 4, +t[2])); // HLV = UTC-4
    rijen.push({
      id: link[2],
      datum_hlv: `${d[3]}-${d[2]}-${d[1]}`,
      tijd_hlv: `${t[1].padStart(2, '0')}:${t[2]}`,
      utc: utc.toISOString().replace('.000Z', 'Z'),
      lat: num(lat), lon: num(lon), diepte_km: num(diepVast ? diep.slice(0, -1) : diep), mag: num(mag),
      ...(diepVast ? { diepte_vast: true } : {}),
      plaats: plaats.join(' ').replace(/\s+/g, ' ').trim(),
      rapport: new URL(link[1], BASE).href,
    });
  }
  return { n, van: cap[2], tot: cap[3], rijen };
}

// ---------- hulpfuncties ----------
function hlvNu() { return new Date(Date.now() - 4 * 3600 * 1000); }
function maandSleutel(d) { return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`; }
function maandenLijst() {
  const nu = hlvNu();
  const eind = maandSleutel(nu);
  let start;
  if (vanaf) {
    if (!/^\d{4}-\d{2}$/.test(vanaf)) throw new Error('--vanaf verwacht JJJJ-MM');
    start = vanaf < EERSTE_MAAND ? EERSTE_MAAND : vanaf; // de reeks begint op 1 januari 2026
  } else {
    start = maandSleutel(new Date(Date.UTC(nu.getUTCFullYear(), nu.getUTCMonth() - 1, 1)));
  }
  const lijst = [];
  let [y, mo] = start.split('-').map(Number);
  while (`${y}-${String(mo).padStart(2, '0')}` <= eind) {
    lijst.push(`${y}-${String(mo).padStart(2, '0')}`);
    if (++mo > 12) { mo = 1; y++; }
  }
  return { lijst, huidig: eind };
}
const VELDEN = ['utc', 'lat', 'lon', 'diepte_km', 'mag', 'plaats', 'rapport', 'datum_hlv', 'tijd_hlv', 'diepte_vast'];

// ---------- hoofdprogramma ----------
async function main() {
  const { lijst, huidig } = maandenLijst();
  const bestaand = await leesJson(EVENTS_FILE, []);
  const perId = new Map(bestaand.map((e) => [e.id, e]));
  const vandaag = new Date().toISOString().slice(0, 10);
  const maandControle = {};
  let nieuw = 0, gewijzigd = 0;

  log(`Maanden om op te halen: ${lijst.join(', ')}`);
  for (const mnd of lijst) {
    const html = mnd === huidig ? await haal(URL_MES) : await haal(URL_MES, { post: { select_m: mnd } });
    const p = parseMaand(html);
    const unieke = new Set(p.rijen.map((r) => r.id));
    const klopt = p.n === null ? null : p.n === p.rijen.length;
    maandControle[mnd] = { funvisis_teller: p.n, geparsed: p.rijen.length, unieke_ids: unieke.size, klopt };
    const status = klopt === null ? 'geen teller bij FUNVISIS' : klopt ? 'OK' : `AFWIJKING (teller ${p.n})`;
    log(`  ${mnd}: ${p.rijen.length} rijen (${unieke.size} unieke ID's) - ${status}`);
    if (p.rijen.length !== unieke.size) log(`  WAARSCHUWING ${mnd}: dubbele ID's in de bronpagina, samengevoegd`);

    for (const r of p.rijen) {
      const oud = perId.get(r.id);
      if (!oud) {
        perId.set(r.id, { ...r, eerst_gezien: vandaag });
        nieuw++;
      } else {
        const verschil = VELDEN.filter((v) => oud[v] !== r[v]);
        if (verschil.length) {
          log(`  gewijzigd ${r.id}: ${verschil.map((v) => `${v} ${oud[v]} -> ${r[v]}`).join('; ')}`);
          perId.set(r.id, { ...oud, ...r, gewijzigd: vandaag });
          gewijzigd++;
        }
      }
    }
  }

  const events = [...perId.values()].sort((a, b) => (a.utc < b.utc ? 1 : a.utc > b.utc ? -1 : 0));
  const meta = await leesJson(META_FILE, {});
  const nuIso = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const verouderd = args.includes('--forceer') || !meta.laatste_controle_utc ||Date.now() - Date.parse(meta.laatste_controle_utc) > META_VERVERS_MS;
  const veranderd = nieuw > 0 || gewijzigd > 0;

  log(`Nieuw: ${nieuw}, gewijzigd: ${gewijzigd}, totaal opgeslagen: ${events.length}`);
  if (droog) { log('Droog draaien: niets geschreven.'); return; }
  if (!veranderd && !verouderd) { log('Geen wijzigingen: niets geschreven.'); return; }

  const nieuweMeta = {
    ...meta,
    laatste_controle_utc: nuIso,
    laatste_wijziging_utc: veranderd ? nuIso : meta.laatste_wijziging_utc ?? null,
    aantal_events: events.length,
    nieuwste_beving_utc: events[0]?.utc ?? null,
    controle_per_maand: { ...(meta.controle_per_maand ?? {}), ...maandControle },
    bronnen: {
      lopende_maand: URL_MES,
      archief: URL_ANT,
      rapport_voorbeeld: 'http://www.funvisis.gob.ve/old/images/reportes/JJJJ/MM/reporte_<ID>.gif',
    },
    tijdzone: 'HLV = UTC-4 (geen zomertijd)',
  };
  if (veranderd) await schrijfAtomisch(EVENTS_FILE, events);
  await schrijfAtomisch(META_FILE, nieuweMeta);
  log('Bestanden bijgewerkt.');
}

main().catch((e) => {
  console.error(`FOUT: ${e.message}`);
  console.error('Er is niets overschreven.');
  process.exit(1);
});
