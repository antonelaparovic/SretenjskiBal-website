# Objava sajta — Cloudflare (besplatno)

Sajt je **statički**: `npm run build` napravi gotove HTML stranice, a forme šalju rezervacije i poruke
direktno Google skripti u tabeli. Zato mu ne treba server — dovoljan je besplatan statički hosting.

**Cloudflare Workers (statički sajt):** besplatno bez kartice, komercijalna upotreba dozvoljena, HTTPS i domen uključeni,
sajt nikad „ne spava", brz u celoj Evropi. Isti Cloudflare nalog daje i **Turnstile** (zaštita formi od botova).

---

## 1. Cloudflare nalog (jednom)

1. **dash.cloudflare.com** → **Sign up** (najbolje sa info@kcsretenje.si). Kartica nije potrebna.

## 2. Turnstile — zaštita formi od botova (jednom)

1. Cloudflare → **Turnstile** → **Add widget**.
2. **Widget name:** `Sretenjski bal`.
   **Hostnames:** adresa sajta (vidi odeljak 4, npr. `sretenjskibal.si` i `www.sretenjskibal.si`)
   i adresa koju da Cloudflare (`sretenjskibal-website.fbozic7.workers.dev`). Za `localhost` ne treba ništa —
   lokalno sajt sam koristi Cloudflareov probni ključ.
   **Widget mode:** **Managed**.
3. **Create** → dobijate dva ključa:
   - **Site key** (javni) → u `frontend/src/app/core/config/app.constants.ts`: `TURNSTILE_SITE_KEY = '…'`
   - **Secret key** (tajni) → u tabeli: Proširenja → Apps Script → ⚙️ **Podešavanja projekta** →
     **Svojstva skripte** → **Dodaj svojstvo**: `TURNSTILE_SECRET` = secret key → **Sačuvaj**.
     Tajni ključ ne ide u kod sajta, git ni mejl.

Obavezno upišite **oba** ključa pre otvaranja prodaje. Dok `TURNSTILE_SECRET` nije upisan, skripta
propušta sve (probni režim).

## 3. Prva objava (Cloudflare Workers, automatski iz GitHuba)

Cloudflare → **Workers & Pages** → **Create** → **Import a repository** → GitHub → organizacija
**kcsretenje** → `SretenjskiBal-website`. Podešavanja (kasnije: Worker → **Settings → Build**):

| Polje | Vrednost |
|---|---|
| Project name | `sretenjskibal-website` (mora biti isto kao `name` u `frontend/wrangler.jsonc`) |
| Production branch | `main` |
| Root directory | `frontend` |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |

`frontend/wrangler.jsonc` kaže Cloudflareu da objavi gotove stranice iz `dist/frontend/browser`,
da za nepoznate adrese vrati `404.html` i da adrese budu bez kose crte na kraju (`/rezervacija`).
Bez tog fajla Cloudflare objavi prazan sajt (sve adrese 404).

Od tada svaki merge na `main` sam objavi novu verziju (~2–3 min). Sajt je na
**https://sretenjskibal-website.fbozic7.workers.dev** (dok se ne poveže domen).

Ručna objava sa računara, ako zatreba: `cd frontend && npm run build && npx wrangler deploy`
(prvi put `npx wrangler login`).

## 4. Adresa sajta (domen)

> **Važno:** domen **sretenjskibal.si trenutno nije registrovan** (provereno u .si registru).
> Domen **kcsretenje.si** jeste — njegov DNS je kod **Neoserva**.

Izaberite jednu od dve mogućnosti:

**a) Poddomen kulturnog centra, npr. `bal.kcsretenje.si`** — besplatno, odmah:
1. Za sopstveni domen Workers traži da DNS domena bude na Cloudflareu. Za `bal.kcsretenje.si` to znači
   preneti DNS zonu kcsretenje.si na Cloudflare (besplatno; Cloudflare uveze postojeće zapise, uključujući mejl),
   ili koristiti varijantu b sa novim domenom.
2. Zatim Worker → **Settings → Domains & Routes → Add → Custom domain** → `bal.kcsretenje.si`.
3. HTTPS se uključi sam za nekoliko minuta.

**b) Sopstveni domen `sretenjskibal.si`** — registracija ~10–20 € godišnje (npr. kod Neoserva):
1. Registrujte domen.
2. Najjednostavnije: u Cloudflareu **Add a site** → `sretenjskibal.si` (Free plan) i kod registrara
   zamenite nameservere onima koje Cloudflare prikaže. Zatim u projektu **Custom domains** dodajte
   `sretenjskibal.si` i `www.sretenjskibal.si` — Cloudflare sam podesi zapise i HTTPS.

Posle izbora adrese:
- u `frontend/src/app/core/config/app.constants.ts` proverite `SITE_URL` (koristi se za linkove za deljenje
  na mrežama i za pretraživače) — sada je `https://sretenjskibal.si`;
- u Turnstile widgetu dodajte tu adresu u **Hostnames**.

## 5. Provera posle objave

| Šta | Očekivano |
|---|---|
| početna, `/rezervacija`, `/kontakt` | stranice se otvaraju |
| `/karte` | preusmerava na `/rezervacija` |
| `/nepostojeca-stranica` | stranica „Ova stranica ne postoji." |
| forma za rezervaciju | prikazuje formu (ili „Rezervacije trenutno nisu dostupne" ako je `BOOKING_OPEN` isključen) |
| probna rezervacija i probna poruka iz kontakt forme | red u tabeli (Rezervacije / Poruke) i mejlovi |

Ako forma kaže „Rezervacije trenutno nisu dostupne" iako je `BOOKING_OPEN` uključen: proverite
`APPS_SCRIPT_URL` u `app.constants.ts` i da je u Apps Scriptu objavljena **nova verzija** skripte
(Primeni → Upravljaj primenama → ✏️ → Nova verzija).

## 6. Kad se nešto menja

| Šta | Gde | Treba nova objava sajta? |
|---|---|---|
| Otvaranje/zatvaranje rezervacija, cene u tabeli, podaci za uplatu | tab „Podešavanja" u tabeli | ne |
| Tekstovi, karte i cene na sajtu, program | `frontend/src/app/core/content/site-content.ts` | da |
| Adresa skripte, Turnstile site key | `frontend/src/app/core/config/app.constants.ts` | da |
| Kod skripte (`Code.gs`) | Apps Script → nova verzija primene | ne |

## Šta je gde (za tehničku osobu)

- `frontend/` — Angular, `outputMode: static` + prerender svih stranica; `npm run build` = `ng build`
  + `scripts/postbuild.mjs` (kopira stranicu /404 u `404.html`, koju Cloudflare vraća sa statusom 404).
- `frontend/public/_redirects` — trajno preusmerenje `/karte` → `/rezervacija`.
- `frontend/public/_headers` — bezbednosna zaglavlja i dugo keširanje JS/CSS fajlova.
- `frontend/.node-version` — Node 24 za build na Cloudflareu.
- `frontend/wrangler.jsonc` — Cloudflare Workers: folder sa gotovim sajtom, 404 stranica, adrese bez kose crte.
- `frontend/src/app/core/services/forms-api.service.ts` — poziv skripte (POST, JSON kao `text/plain`,
  pa browser ne traži CORS dozvolu koju Apps Script ne podržava; proveren u pravom Chromeu).
- `google-apps-script/` — skripta u tabeli i njeni testovi (`npm test`).
