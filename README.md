# Sretenjski bal — sajt

Sajt za Sretenjski bal (13. februar 2027, Maribor).

- **frontend/** — Angular 22. Ceo sajt, dizajn i sadržaj. Build pravi gotove (statičke) HTML stranice.
- **google-apps-script/** — skripta u Google tabeli „Bal rezervacije": prima rezervacije i poruke iz
  kontakt forme, dodeljuje broj rezervacije, šalje mejlove, podsetnike. Uputstvo:
  **[docs/REZERVACIJE.md](docs/REZERVACIJE.md)**.
- **docs/** — uputstva: rezervacije i rad u tabeli ([REZERVACIJE.md](docs/REZERVACIJE.md)),
  objava sajta ([DEPLOY.md](docs/DEPLOY.md)).

Nema servera ni baze podataka. Sav sadržaj (program, karte, mesto, partneri) je u jednom fajlu u
frontendu, a rezervacije i poruke se čuvaju u Google tabeli.

---

## 1. Šta ti treba na računaru

1. **Node.js 24** (ili 22.22.3+). Proveri u terminalu: `node -v`
2. **Git** (opciono, za verzionisanje)

---

## 2. Pokretanje (lokalno)

```bash
cd frontend
npm install
npm start
```

Otvori http://localhost:4200. Izmene u kodu se odmah vide u browseru.

Forme (rezervacija i kontakt) šalju direktno Google skripti iz `APPS_SCRIPT_URL`
(`frontend/src/app/core/config/app.constants.ts`) — probne rezervacije i poruke zato stižu u tabelu.

---

## 3. Kako da menjaš sadržaj

Skoro sve što se menja pred bal je u **jednom fajlu**:

`frontend/src/app/core/content/site-content.ts`

| Šta menjaš | Gde u fajlu |
|---|---|
| Mesto, adresa, link ka mapi | `EVENT.venueName`, `EVENT.venueAddress`, `EVENT.mapUrl` |
| Prodaja karata na početnoj | `EVENT.salesStatus`: `'COMING_SOON'`, `'OPEN'` ili `'SOLD_OUT'` |
| Satnica večeri | `PROGRAM` |
| Karte i cene | `TICKETS` — cena u centima (`6500` = 65 €), `ctaUrl` = `'/rezervacija'` (forma na sajtu) |
| Otvaranje/zatvaranje rezervacija | tab „Podešavanja" u Google tabeli → `BOOKING_OPEN` (bez izmene koda) |
| Partneri | `SPONSORS` — logo stavi u `frontend/public/partners/` |

Tekstovi sekcija na početnoj su u `frontend/src/app/features/home/sections/`, svaka sekcija u svom fajlu.

**Fotografija u heru (početna):** stavi je u `frontend/public/images/` i upiši putanju u `HERO_IMAGE` u istom fajlu
(`site-content.ts`). Sajt je sam tonira u bordo, pa slika ne mora da bude u bojama sajta. Bez fotografije hero je čist bordo.

**Fotografije:** dok ih nema, na njihovom mestu stoji tonirana površina sa opisom šta treba da bude na slici.
Kad stignu, stavi ih u `frontend/public/images/` i u sekciji upiši `[src]="'/images/ime-slike.jpg'"`
na `<app-editorial-image>`.

---

## 4. Objava sajta

Besplatno, na Cloudflare Pages — uputstvo korak po korak: **[docs/DEPLOY.md](docs/DEPLOY.md)**.

Build za proveru na svom računaru:

```bash
cd frontend
npm run build          # gotov sajt je u frontend/dist/frontend/browser
```

---

## 5. Testovi

```bash
cd frontend && npx ng test --watch=false          # forme na sajtu
cd google-apps-script && npm install && npm test  # cela logika skripte u tabeli (lažna tabela i mejl)
```

---

## 6. Kako je napravljeno (kratko)

**Frontend**
- `src/styles/` — dizajn sistem: boje, tipografija, raspored, dugmad, forme, animacije.
- `src/app/layout/` — header (providan preko hera, bordo pri skrolu, mobilni meni) i futer.
- `src/app/features/home/` — početna, 12 sekcija.
- `src/app/features/reservation/` — rezervacija karata.
- `src/app/features/contact/` + `shared/components/contact-form/` — kontakt.
- `src/app/shared/` — komponente koje se ponavljaju (znak, slika, satnica, karte, partneri, odbrojavanje,
  Turnstile provera).
- Sve stranice se prave unapred pri build-u (prerender) — pretraživači dobijaju gotov HTML.
- Fontovi (Cormorant Garamond, Manrope) su na samom sajtu, ne sa Google Fonts — brže i bez slanja podataka posetilaca Google-u.
- Animacije poštuju sistemsko podešavanje „smanji pokret".
- SEO: naslov, opis, canonical, OpenGraph i Event podaci za Google na početnoj.
- Tekstovi su obeleženi za prevod (`i18n`), pa se slovenački kasnije dodaje bez prepravljanja koda.

**Forme → Google skripta** (`google-apps-script/Code.gs`)
- provera svih polja i u skripti, uklanjanje HTML-a, zaštita od formula u tabeli
- Cloudflare Turnstile („da li je čovek"), skriveno polje, prebrzo popunjena forma, najviše 20 slanja u minuti
- svaka poruka iz kontakt forme se čuva u tabu „Poruke", čak i kad mejl ne prođe
- „Odgovori" na mejl sa sajta ide direktno osobi koja je pisala

---

## 7. Šta još nije urađeno

- Podstranice (O balu, Sretenje, Program, Prostor, Pravila oblačenja, Partneri, FAQ, Organizator, pravne stranice)
  trenutno prikazuju „stranica u pripremi".
- Tekst politike privatnosti (potreban zbog formi).
- Prave fotografije i `public/brand/og-image.jpg` (slika za deljenje na mrežama, 1200×630).
- Ostale stavke za rezervacije: TODO lista u [docs/REZERVACIJE.md](docs/REZERVACIJE.md).
