/**
 * Lokalna provera gotovog sajta na sva tri jezika (/, /sl/, /en/): `npm run start:all`, pa http://localhost:4000/
 * Isto kao što radi statički hosting: nepoznata adresa vraća 404.html.
 */
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';

const root = join(import.meta.dirname, '..', 'dist', 'frontend', 'browser');
const port = Number(process.env.PORT ?? 4000);
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain' };

createServer((req, res) => {
  let path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  let file = join(root, path);
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  let status = 200;
  if (!existsSync(file)) { file = join(root, '404.html'); status = 404; }
  res.writeHead(status, { 'content-type': types[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(port, () => console.log(`Sajt: http://localhost:${port}/  (/sl/, /en/)`));
