/**
 * Posle `ng build`: stranicu „ne postoji" (prerender /404) kopira u 404.html u korenu,
 * jer statički hosting (Cloudflare Pages) taj fajl vraća sa statusom 404 za nepoznate adrese.
 */
import { copyFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const out = join(import.meta.dirname, '..', 'dist', 'frontend', 'browser');
const page = join(out, '404', 'index.html');
if (!existsSync(page)) {
  console.error('postbuild: nema dist/frontend/browser/404/index.html — da li je ruta /404 obrisana?');
  process.exit(1);
}
copyFileSync(page, join(out, '404.html'));
console.log('postbuild: 404.html napravljen.');
