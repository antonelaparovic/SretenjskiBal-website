# Prevodi sajta (srpski, slovenački, engleski)

Sajt ima tri jezičke verzije, svaka je zasebna gradnja:

| Jezik | Adresa | Fajl sa prevodom |
|---|---|---|
| Srpski (izvorni) | `/` | tekstovi su direktno u kodu, spisak je u `frontend/src/locale/messages.xlf` |
| Slovenački | `/sl/` | `frontend/src/locale/messages.sl.xlf` |
| Engleski | `/en/` | `frontend/src/locale/messages.en.xlf` |

Prevod jednog teksta je u `<target>` oznaci, odmah ispod izvornog `<source>`.
Ispravka prevoda = izmeni tekst u `<target>`, pa ponovo objavi sajt (`docker compose up --build`).
Delovi unutar vitičastih/oštrih oznaka (`<x id="..." />`) su mesta za linkove i ubačene vrednosti — ne brisati ih.

## Kad se promeni ili doda tekst na sajtu

1. U `frontend/` pokrenuti: `npx ng extract-i18n --format xlf --output-path src/locale` — osvežava `messages.xlf`.
2. Novi ili izmenjeni tekstovi dobijaju novi ID. U `messages.sl.xlf` i `messages.en.xlf` dodati taj `<trans-unit>`
   (kopirati ga iz `messages.xlf`) i ispod `<source>` dopisati `<target>` sa prevodom.
   Tekst bez prevoda se prikazuje na srpskom (gradnja ispiše upozorenje „No translation found").
3. Pravni tekstovi (`/privacy`, `/cookies`) ne idu kroz ovaj sistem; njihovi prevodi su u `core/content/legal-content.ts`.

## Napomene

- Nazivi stranica (`/rezervacija`, `/kontakt`, `/balska-tradicija`) su isti u sva tri jezika; menja se samo prefiks (`/sl/rezervacija`).
- Prevodi su pisani kao nacrt: pre objave ih treba da pregleda osoba kojoj je slovenački odnosno engleski maternji jezik.
- `npm run start:dev` (`ng serve`, brzo osvežavanje) prikazuje samo srpski, pa tamo prekidač SL/EN ne vodi nigde. Za proveru sva tri jezika:
  `npm start` (u folderu `frontend`; gradi sajt i pokreće ga), pa otvoriti `http://localhost:4000/`, `/sl/` i `/en/`.
- Pregled na Netlify-ju (`npm run build:preview`) takođe gradi sva tri jezika; `_redirects` šalje `/sl/*` i `/en/*` na svoju jezičku verziju.
