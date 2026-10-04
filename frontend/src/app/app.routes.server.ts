import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Sve stranice renderuje server na zahtev (SSR): pretraživači dobijaju gotov HTML,
 * odbrojavanje je tačno, a nepostojeće adrese vraćaju pravi 404 status.
 */
export const serverRoutes: ServerRoute[] = [{ path: '**', renderMode: RenderMode.Server }];
