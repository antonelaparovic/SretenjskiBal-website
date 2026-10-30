# Objava sajta — Cloudflare Pages (besplatno)

Sajt je **statički**: `npm run build` napravi gotove HTML stranice, a forme šalju rezervacije i poruke
direktno Google skripti u tabeli. Zato mu ne treba server — dovoljan je besplatan statički hosting.

**Cloudflare Pages:** besplatno bez kartice, komercijalna upotreba dozvoljena, HTTPS i domen uključeni,
sajt nikad „ne spava", brz u celoj Evropi. Isti Cloudflare nalog daje i **Turnstile** (zaštita formi od botova).

---

## 1. Cloudflare nalog (jednom)

1. **dash.cloudflare.com** → **Sign up** (najbolje sa info@kcsretenje.si). Kartica nije potrebna.

## 2. Turnstile — zaštita formi od botova (jednom)

1. Cloudflare → **Turnstile** → **Add widget**.
2. **Widget name:** `Sretenjski bal`.
   **Hostnames:** adresa sajta (vidi odeljak 4, npr. `sretenjskibal.si` i `www.sretenjskibal.si`)
   i adresa koju da Cloudflare Pages (`sretenjski-bal.pages.dev`). Za `localhost` ne treba ništa —
   lokalno sajt sam koristi Cloudflareov probni ključ.
   **Widget mode:** **Managed**.
3. **Create** → dobijate dva ključa:
   - **Site key** (javni) → u `frontend/src/app/core/config/app.constants.ts`: `TURNSTILE_SITE_KEY = '…'`
   - **Secret key** (tajni) → u tabeli: Proširenja → Apps Script → ⚙️ **Podešavanja projekta** →
     **Svojstva skripte** → **Dodaj svojstvo**: `TURNSTILE_SECRET` = secret key → **Sačuvaj**.
     Tajni ključ ne ide u kod sajta, git ni mejl.

Obavezno upišite **oba** ključa pre otvaranja prodaje. Dok `TURNSTILE_SECRET` nije upisan, skripta
propušta sve (probni režim).

## 3. Prva objava

Dve mogućnosti — **A** je za stalno, **B** radi odmah i bez pristupa GitHubu.

### A) Automatski iz GitHuba (preporučeno)

Cloudflare → **Workers & Pages** → **Create** → **Pages** → **Connect to Git** → GitHub →
repozitorijum `SretenjskiBal-website` (GitHub traži da instalaciju Cloudflare aplikacije odobri
**vlasnik repozitorijuma**). Podešavanja:

| Polje | Vrednost |
|---|---|
| Project name | `sretenjski-bal` |
| Production branch | `main` |
| Framework preset | `None` |
| Root directory | `frontend` |
| Build command | `npm run build` |
| Build output directory | `dist/frontend/browser` |

**Save and Deploy.** Od tada svaki merge na `main` sam objavi novu verziju (~2–3 min), a svaki
pull request dobije svoju probnu adresu.

### B) Ručno sa računara (bez GitHuba)

```bash
cd frontend
npm run build
npx wrangler login                     # jednom: otvara browser, prijava na Cloudflare
npx wrangler pages deploy dist/frontend/browser --project-name sretenjski-bal
```

Prvi put pita da napravi projekat → **Yes**, production branch → `main`.
Za svaku novu verziju ponovite `npm run build` i poslednju komandu.

Posle objave sajt je na **https://sretenjski-bal.pages.dev**.

## 4. Adresa sajta (domen)

> **Važno:** domen **sretenjskibal.si trenutno nije registrovan** (provereno u .si registru).
> Domen **kcsretenje.si** jeste — njegov DNS je kod **Neoserva**.

Izaberite jednu od dve mogućnosti:

**a) Poddomen kulturnog centra, npr. `bal.kcsretenje.si`** — besplatno, odmah:
1. Cloudflare → projekat `sretenjski-bal` → **Custom domains** → **Set up a domain** → `bal.kcsretenje.si`.
2. Ko ima pristup DNS-u kod Neoserva doda zapis: **CNAME** `bal` → `sretenjski-bal.pages.dev`.
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
  + `scripts/postbuild.mjs` (kopira stranicu /404 u `404.html`, koju Pages vraća sa statusom 404).
- `frontend/public/_redirects` — trajno preusmerenje `/karte` → `/rezervacija`.
- `frontend/public/_headers` — bezbednosna zaglavlja i dugo keširanje JS/CSS fajlova.
- `frontend/.node-version` — Node 24 za build na Cloudflareu.
- `frontend/src/app/core/services/forms-api.service.ts` — poziv skripte (POST, JSON kao `text/plain`,
  pa browser ne traži CORS dozvolu koju Apps Script ne podržava; proveren u pravom Chromeu).
- `google-apps-script/` — skripta u tabeli i njeni testovi (`npm test`).
