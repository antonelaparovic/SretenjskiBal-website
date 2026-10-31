# GDPR i kolačići (Slovenija / EU)

Nisam pravnik — tekstove treba da pregleda pravnik, a SL i EN verzije izvorni govornik.

## Šta je urađeno
- Stranice `/privacy` i `/cookies` (SR/SL/EN, prekidač jezika): `frontend/src/app/core/content/legal-content.ts`.
- Podaci o organizatoru: `ORGANIZER` u `site-content.ts` — **zameniti sve [UPISATI: …] pre objave** (adresa, matična/davčna, e-adresa za privatnost). Hosting (Cloudflare Workers) i e-pošta (Google Workspace) su upisani.
- Verzija teksta: `PRIVACY_POLICY_VERSION` — menjati pri svakoj izmeni teksta; upisuje se uz rezervaciju (kolona „Saglasnost").
- Rezervacija: izričita saglasnost (čl. 9(2)(a)) za polje „Posebna ishrana i alergije" (podatak o zdravlju). Bez saglasnosti forma i Apps Script odbijaju ishranu.
- Kontakt forma: saglasnost sa jasnim svrhom i rokom čuvanja.
- Kolačići: sajt ne postavlja kolačiće ni localStorage i nema analitike → baner nije potreban (ZEKom-2, čl. 225). Ako se doda analitika/embed, uvesti baner PRE toga.
- Arhitektura: sajt je statički (Cloudflare Workers); forme šalju podatke direktno Google Apps Scriptu (tabela + Gmail). Forme učitavaju **Cloudflare Turnstile** (zaštita od botova) sa challenges.cloudflare.com.
- Link „Uslovi korišćenja" je sakriven.

## Rokovi čuvanja (moje pretpostavke — potvrditi)
Rezervacije 6 meseci posle bala (potvrđeno); ishrana 30 dana; kontakt poruke 12 meseci; računi po zakonu.

## Obaveze van koda
- **Pravnik:** dodati Cloudflare (hosting i Turnstile) u spisak obrađivača u politici privatnosti (SR/SL/EN) i proveriti tekst stranice Kolačići zbog Turnstilea (TODO u `legal-content.ts`).
- Tabela rezervacija: ograničiti deljenje (nije javna), samo tim. Poželjno Google Workspace sa DPA umesto ličnog Gmail naloga.
- Ručno brisati/anonimizovati podatke po rokovima (Apps Script automatsko čišćenje nije implementirano).
- Obnoviti Apps Script (novi `Code.gs`; kolona „Saglasnost" se dodaje sama).
- Evidencija aktivnosti obrade (čl. 30) i ugovori sa obrađivačima (Cloudflare, Google).
- Obaveštenje o fotografisanju na ulazu bala; odluka o DPO (verovatno nije obavezan za male organizatore).
- Nadzorni organ: Informacijski pooblaščenec, Dunajska cesta 22, Ljubljana, gp.ip@ip-rs.si.
