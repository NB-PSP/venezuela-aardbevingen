// Kleine lokale server om het dashboard te testen: node scripts/serve.mjs  ->  http://localhost:8080
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml' };
const port = Number(process.env.PORT) || 8080;

http.createServer(async (req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const base = p.startsWith('/data/') ? ROOT : path.join(ROOT, 'public');
  const file = path.normalize(path.join(base, p));
  if (!file.startsWith(base)) { res.writeHead(403); return res.end(); }
  try {
    const buf = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(buf);
  } catch { res.writeHead(404); res.end('Niet gevonden'); }
}).listen(port, () => console.log(`Dashboard op http://localhost:${port}`));
