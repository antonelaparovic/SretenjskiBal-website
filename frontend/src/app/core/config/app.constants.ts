/** Javni URL sajta — koristi se za canonical i OpenGraph linkove. */
export const SITE_URL = 'https://sretenjskibal.si';

export const SITE_NAME = 'Sretenjski bal';

/**
 * Google Apps Script web aplikacija u tabeli „Bal rezervacije" — prima rezervacije i poruke iz kontakt forme.
 * Tabela i skripta su na nalogu admin@kcsretenje.si; mejlovi gostima idu sa info@kcsretenje.si.
 * Adresa je javna (nije tajna); zaštita je Turnstile provera i provera podataka u skripti.
 * Posle izmene skripte objavljuje se nova verzija iste primene, pa adresa ostaje ista.
 */
export const APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycby9GluD26VgBsQNsPifnTiufb0IxVrFpH7ZOi8IpqlNEzGaHufCrXniIOsDwn4hQfTw/exec';

/**
 * Cloudflare Turnstile — javni ključ widgeta (site key; tajni ključ je samo u skripti, TURNSTILE_SECRET).
 * Dok je prazno, i lokalno (localhost), koristi se Cloudflareov probni ključ koji uvek propušta.
 * TODO: upisati site key iz Cloudflare naloga (docs/DEPLOY.md).
 */
export const TURNSTILE_SITE_KEY = '';
export const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA';
