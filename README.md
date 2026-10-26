# Sretenjski bal — sajt

Sajt za Sretenjski bal (13. februar 2027, Maribor).

- **frontend/** — Angular 22 sa server-side renderingom (SSR). Ceo sajt, dizajn i sadržaj.
- **backend/** — mali NestJS 12 servis: prima poruke iz kontakt forme i šalje ih mejlom, i prima rezervacije karata.
- **google-apps-script/** — skripta u Google tabeli „Bal rezervacije": broj rezervacije, upis, mejlovi, podsetnici.
  Uputstvo za postavljanje i rad: **[docs/REZERVACIJE.md](docs/REZERVACIJE.md)**.

Nema baze podataka. Sav sadržaj (program, karte, mesto, partneri) je u jednom fajlu u frontendu.
Rezervacije karata se čuvaju u Google tabeli.

---

## 1. Šta ti treba na računaru

1. **Node.js 24** (ili 22.22.3+). Proveri u terminalu: `node -v`
2. **Git** (opciono, za verzionisanje)
3. **Docker Desktop** (opciono — samo ako želiš da sve pokreneš jednom komandom)

---

## 2. Prvo pokretanje (lokalno, bez Dockera)

Treba ti **dva terminala**: jedan za backend, jedan za frontend.

### Terminal 1 — backend (kontakt forma)

```bash
cd backend
npm install
cp .env.example .env      # na Windowsu: copy .env.example .env
npm run start:dev
```

Kad vidiš da je server pokrenut, otvori http://localhost:3000/api/health — treba da piše `{"status":"ok"}`.

> SMTP ne moraš da podešavaš za lokalni rad. Poruke iz forme tada se ispisuju u ovom terminalu
> i upisuju u fajl `backend/data/poruke.jsonl`.

### Terminal 2 — frontend (sajt)

```bash
cd frontend
npm install
npm start
```

Otvori http://localhost:4200. Izmene u kodu se odmah vide u browseru.
Forma na `/kontakt` šalje poruke backendu iz Terminala 1 (preko `proxy.conf.json`).

---

## 3. Kako da menjaš sadržaj

Skoro sve što se menja pred bal je u **jednom fajlu**:

`frontend/src/app/core/content/site-content.ts`

| Šta menjaš | Gde u fajlu |
|---|---|
| Mesto, adresa, link ka mapi | `EVENT.venueName`, `EVENT.venueAddress`, `EVENT.mapUrl` |
| Početak prodaje karata | `EVENT.salesStatus`: `'COMING_SOON'` → `'OPEN'` (ili `'SOLD_OUT'`) |
| Satnica večeri | `PROGRAM` |
| Cene i linkovi za kupovinu | `TICKETS` — cena u centima (`6500` = 65 €), `ctaUrl` = `'/rezervacija'` (forma na sajtu) ili link prodavca karata |
| Otvaranje/zatvaranje rezervacija | tab „Podešavanja" u Google tabeli → `BOOKING_OPEN` (bez izmene koda) |
| Partneri | `SPONSORS` — logo stavi u `frontend/public/partners/` |

Tekstovi sekcija na početnoj su u `frontend/src/app/features/home/sections/`, svaka sekcija u svom fajlu.

**Fotografija u heru (početna):** stavi je u `frontend/public/images/` i upiši putanju u `HERO_IMAGE` u istom fajlu
(`site-content.ts`). Sajt je sam tonira u bordo, pa slika ne mora da bude u bojama sajta. Bez fotografije hero je čist bordo.

**Fotografije:** dok ih nema, na njihovom mestu stoji tonirana površina sa opisom šta treba da bude na slici.
Kad stignu, stavi ih u `frontend/public/images/` i u sekciji upiši `[src]="'/images/ime-slike.jpg'"`
na `<app-editorial-image>`.

---

## 4. Podešavanje mejla (za pravi sajt)

U `backend/.env` popuni:

```
NODE_ENV=production
SMTP_HOST=...        # npr. smtp.gmail.com ili SMTP sa hostinga
SMTP_PORT=587
SMTP_USER=...        # nalog sa kog se šalje
SMTP_PASS=...        # za Gmail: "App password", ne obična lozinka
MAIL_TO=...          # gde stižu poruke sa sajta
CORS_ORIGINS=https://sretenjskibal.si
```

U produkciji backend neće ni da startuje ako SMTP nije podešen — da se ne desi da poruke tiho ne stižu.
Svaka poruka se uvek čuva i u `data/poruke.jsonl`, čak i kad mejl ne prođe.

Kad odgovoriš na mejl sa sajta, odgovor ide direktno osobi koja je pisala.

---

## 5. Pokretanje sa Dockerom (sve odjednom)

```bash
cp backend/.env.example backend/.env
docker compose up --build
```

Sajt je na http://localhost:4000. Poruke se čuvaju u Docker volumenu `poruke`.

---

## 6. Build za produkciju (bez Dockera)

```bash
cd backend && npm ci && npm run build && node dist/main.js
cd frontend && npm ci && npx ng build
API_INTERNAL_URL=http://localhost:3000 PORT=4000 node dist/frontend/server/server.mjs
```

Frontend server (port 4000) služi sajt i prosleđuje `/api/...` backendu, pa je spolja dovoljan jedan domen.
Ako sajt ide na drugi domen, dodaj ga u `frontend/angular.json` → `security.allowedHosts`.

---

## 7. Kako je napravljeno (kratko)

**Frontend**
- `src/styles/` — dizajn sistem: boje, tipografija, raspored, dugmad, forme, animacije.
- `src/app/layout/` — header (providan preko hera, bordo pri skrolu, mobilni meni) i futer.
- `src/app/features/home/` — početna, 12 sekcija.
- `src/app/features/contact/` + `shared/components/contact-form/` — kontakt.
- `src/app/shared/` — komponente koje se ponavljaju (znak, slika, satnica, karte, partneri, odbrojavanje).
- Fontovi (Cormorant Garamond, Manrope) su na samom sajtu, ne sa Google Fonts — brže i bez slanja podataka posetilaca Google-u.
- Animacije poštuju sistemsko podešavanje „smanji pokret".
- SEO: naslov, opis, canonical, OpenGraph i Event podaci za Google na početnoj.
- Tekstovi su obeleženi za prevod (`i18n`), pa se slovenački kasnije dodaje bez prepravljanja koda.

**Backend** — `POST /api/contact`, `GET /api/reservations/status`, `POST /api/reservations` i `GET /api/health`
- provera svih polja, uklanjanje HTML-a iz poruke
- najviše 5 poruka sa iste adrese u 10 minuta
- zaštita od botova: skriveno polje + prebrzo popunjena forma (botu se vrati „uspeh", ali se ništa ne šalje)
- Helmet sigurnosna zaglavlja, CORS samo za adresu sajta

---

## 8. Šta još nije urađeno

- Podstranice (O balu, Sretenje, Program, Karte, Prostor, Pravila oblačenja, Partneri, FAQ, Organizator, pravne stranice)
  trenutno prikazuju „stranica u pripremi".
- Tekst politike privatnosti (potreban zbog kontakt forme).
- Prave fotografije i `public/brand/og-image.jpg` (slika za deljenje na mrežama, 1200×630).
