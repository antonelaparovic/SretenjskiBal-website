import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Sve stranice se prave unapred pri build-u (prerender): pretraživači dobijaju gotov HTML,
 * a sajt je skup statičkih fajlova — ne treba mu server (hosting: docs/DEPLOY.md).
 * Stvari koje se menjaju (odbrojavanje, da li su rezervacije otvorene) računa browser.
 */
export const serverRoutes: ServerRoute[] = [{ path: '**', renderMode: RenderMode.Prerender }];
