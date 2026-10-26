# Rezervacije karata — uputstvo

Gost popuni formu na **/rezervacija**, dobije broj rezervacije (npr. `27001`), a rezervacija se sama upiše
u Google tabelu „Bal rezervacije". Organizator dobija mejl, a gost potvrdu. Iznos i instrukcije za uplatu
šalje osoba zadužena za karte, iz menija u tabeli. Podsetnike i isticanje neplaćenih rezervacija tabela
radi sama, jednom dnevno.

```
Browser ──► Angular SSR server (/api, isti domen) ──► NestJS backend ──► Google Apps Script ──► tabela + Gmail
             forma, provere                          provera podataka,   zaključavanje, broj,
                                                     zaštita od botova,  upis reda, mejlovi,
                                                     tajni ključ         meni, dnevna provera
```

Browser nikad ne razgovara direktno sa Googleom: nema CORS problema, a tajni ključ ostaje na serveru.

---

## TODO — šta još treba promeniti ili saznati

Sve ove stavke su u kodu označene sa `TODO`. Spisak u kodu daje komanda
`grep -rn TODO --exclude-dir=node_modules --exclude-dir=dist .`

| # | Šta | Gde |
|---|---|---|
| 1 | **Ograničiti deljenje tabele** (sada je javna) | Google tabela → Deli (odeljak 1.1) |
| 2 | **Pravi podaci za uplatu**: primalac sa adresom, IBAN, BIC, banka. Sada stoje izmišljene vrednosti sa „TODO", obojene žuto. | Tabela → tab „Podešavanja" (početne vrednosti su u `google-apps-script/Code.gs`, `SETTINGS`) |
| 3 | Opisi (šta je uključeno) za Svečanu i Galeriju | `frontend/src/app/core/content/site-content.ts`, `TICKETS` |
| 4 | Otvaranje prodaje na sajtu: `salesStatus: 'OPEN'` | `site-content.ts`, `EVENT` |
| 5 | URL web aplikacije i ključ u produkcionom `.env` | `backend/.env` (vidi `backend/.env.example`) |
| 6 | Tekst politike privatnosti | `frontend/src/app/app.routes.ts`, ruta `privacy` |

Dok u podacima za uplatu piše „TODO", meni „Pošalji instrukcije za uplatu" odbija slanje i kaže šta
nedostaje. Podsetnik tada izostavlja primaoca i IBAN. **Gost nikad ne dobija izmišljen broj računa.**
Opciona polja (`BIC`, `BANK`) koja vam ne trebaju jednostavno obrišite.

---

## 1. Prvo postavljanje (jednom, ~20 minuta)

Sve radite **prijavljeni kao `fbozic7@gmail.com`**. Sa tog naloga će se slati svi mejlovi gostima,
i tom nalogu gosti odgovaraju.

### 1.1 Ograničite deljenje tabele — VAŽNO

Tabela je trenutno dostupna svakome ko ima link („Anyone with the link can view"). Kad u nju počnu
da stižu imena, mejlovi i telefoni gostiju, to ne sme tako da ostane.

Tabela → **Deli (Share)** → Opšti pristup → **Ograničeno (Restricted)** → dodajte samo ljude iz ekipe.

### 1.2 Ubacite skriptu u tabelu

1. Otvorite tabelu → **Proširenja → Apps Script** (Extensions → Apps Script).
2. U fajlu `Code.gs` obrišite sve i nalepite ceo sadržaj fajla `google-apps-script/Code.gs` iz ovog repozitorijuma.
3. ⚙️ **Podešavanja projekta** (Project Settings) → uključite **„Prikaži datoteku manifesta appsscript.json"**.
   Vratite se u Editor, otvorite `appsscript.json` i zamenite sadržaj fajlom `google-apps-script/appsscript.json`.
4. Sačuvajte (💾).

### 1.3 Podesite tabelu

1. Vratite se u tabelu i osvežite stranicu. Pojaviće se meni **Sretenjski bal**.
2. **Sretenjski bal → Podesi tabelu (prvo pokretanje)**.
3. Google traži dozvolu: *Nastavi → izaberite fbozic7@gmail.com → Napredno (Advanced) →
   Idi na projekat (nebezbedno) → Dozvoli*. Upozorenje „nebezbedno" se pojavljuje za svaku skriptu koju
   Google nije pregledao. Skripta je vaša i radi samo nad ovom tabelom.
4. Skripta dodaje tabove **Rezervacije**, **Podešavanja** i **Statistika**. Postojeći `Sheet1` ostaje netaknut.
   Ponovno pokretanje „Podesi tabelu" je bezbedno: ništa ne briše i ne menja već upisane vrednosti.
   Jedino tab `Statistika` pravi iznova.

### 1.4 Popunite tab „Podešavanja"

| Podešavanje | Šta je |
|---|---|
| `BOOKING_OPEN` | ☑ = sajt prima rezervacije. **Početno je isključeno.** |
| `BALL_YEAR` | Dve cifre godine bala, početak broja rezervacije: `27` → 27001, 27002… |
| `PRICE_SVECANA`, `PRICE_GALERIJA` | Cene u evrima (140, 70). Po njima se iznos za uplatu upisuje automatski kao predlog. Ako cenu menjate, promenite je i na sajtu (`site-content.ts`, `TICKETS`). |
| `PAYMENT_DAYS` | Rok za uplatu u danima od slanja instrukcija (7). |
| `GRACE_DAYS` | Dani posle podsetnika u kojima gost još može da plati (2). Sutradan rezervacija postaje ISTEKLO. |
| `ADMIN_EMAIL` | Kome stižu nove rezervacije i dnevni izveštaj (fbozic7@gmail.com). |
| `REPLY_TO` | Kome gosti odgovaraju (fbozic7@gmail.com). |
| `GUEST_EMAILS` | ☑ = gost odmah dobija mejl da je rezervacija evidentirana. |
| `PAYEE`, `IBAN` | **Obavezno** pre slanja instrukcija za uplatu: primalac i broj računa. Početno stoji privremena vrednost sa „TODO" (žuto) — zamenite je pravom. |
| `BIC`, `BANK` | Opciono. Početno „TODO" — upišite pravu vrednost ili obrišite polje. |
| `PAYMENT_NOTE` | Opciono. |

Ne menjajte nazive u koloni A, jer ih skripta prepoznaje po njima. Kolone u tabu „Rezervacije" možete
premeštati, širiti i sortirati, ali **nemojte ih preimenovati**.

### 1.5 Objavite web aplikaciju

1. U Apps Scriptu: **Primeni → Nova primena** (Deploy → New deployment) → tip ⚙️ **Web aplikacija**.
2. *Izvrši kao:* **Ja (fbozic7@gmail.com)**. *Ko ima pristup:* **Bilo ko (Anyone)**.
   Sajt poziva skriptu sa servera i bez Google prijave. Zaštita je tajni ključ: bez njega skripta ne radi ništa.
3. **Primeni** → kopirajte **URL web aplikacije** (završava se na `/exec`).

### 1.6 Povežite sajt

U tabeli: **Sretenjski bal → Prikaži ključ za sajt**. Na serveru sajta, u `backend/.env`, upišite:

```
APPS_SCRIPT_URL=https://script.google.com/macros/s/…/exec
APPS_SCRIPT_SECRET=<ključ iz tabele>
```

Restartujte backend. Ključ ne stavljajte u frontend, git ili mejl.

### 1.7 Uključite automatiku i proverite mejl

1. **Sretenjski bal → Uključi dnevnu proveru rokova**. Provera se pokreće svakog dana između 9 i 10 časova.
   Da li okidač postoji vidite u Apps Scriptu → ⏰ **Okidači (Triggers)**, a da li je radio u
   → **Izvršenja (Executions)**.
2. **Sretenjski bal → Pošalji probni mejl organizatoru**. Mejl treba da stigne na `ADMIN_EMAIL`.

### 1.8 Probna rezervacija pre otvaranja

1. Uključite `BOOKING_OPEN`.
2. Na sajtu napravite rezervaciju sa **svojim** mejlom. Proverite red u tabeli i oba mejla.
3. Probajte meni „Pošalji instrukcije za uplatu" i „Pošalji potvrdu uplate" na tom redu.
4. Obrišite probni red. Pošto brojevi nikad ne idu unazad, sledeća rezervacija bi dobila 27002.
   Da prava prodaja krene od 27001: Apps Script → ⚙️ Podešavanja projekta → **Svojstva skripte**
   → obrišite `COUNTER_27`. Radite to **samo dok u tabeli nema pravih rezervacija.**
5. Isključite `BOOKING_OPEN` dok prodaja zvanično ne počne.

### 1.9 Prikaz na sajtu

Forma je na `/rezervacija`. Dugmad „Rezerviši kartu" u sekciji Karte na početnoj (već vode na formu)
pojavljuju se kad u `frontend/src/app/core/content/site-content.ts` postavite `EVENT.salesStatus: 'OPEN'`.
Do tada sekcija prikazuje karte sa cenama i „Prodaja uskoro počinje".

Tipovi karata su **Svečana** (140 €) i **Galerija** (70 €), isti na početnoj i u formi.
Ako se menjaju, menjaju se na tri mesta (iste šifre): `reservation-form.component.ts` (`TICKET_TYPE_OPTIONS`),
`backend/src/reservations/reservation.dto.ts` (`TICKET_TYPES`) i `google-apps-script/Code.gs` (`TICKET_TYPES`).
Posle izmene `Code.gs` ponovo pokrenite „Podesi tabelu", da tab Statistika dobije red za novi tip.

---

## 2. Svakodnevni rad (bez tehničkog znanja)

### Šta je u redu rezervacije

Jedan red je jedna rezervacija. Karte glase na **osobu koja rezerviše**; ako kupuje za nekog drugog,
to piše u koloni **Napomena**. Posebna ishrana i alergije su u zasebnoj koloni **Ishrana i alergije**:
filterom na toj koloni dobijate spisak za kuhinju, a mejl o novoj rezervaciji u naslovu ima
„· posebna ishrana". Broj karata po rezervaciji nije ograničen (postoji samo tehnička granica od 100,
kao zaštita forme od zloupotrebe).

### Raspored taba „Rezervacije"

Kolone su grupisane po boji zaglavlja:

| Boja | Grupa | Kolone |
|---|---|---|
| bordo | Rezervacija | broj, status, ime, tip i broj karata, iznos, ishrana, napomena, datum prijave, e-mail, telefon |
| zelena | Uplata | datumi instrukcija, rok, podsetnik, uplata, potvrda, isticanje, administrativna napomena |
| mesing | Faktura i izvor | faktura, podaci firme, izvor prijave, jezik |
| siva | Tehnički podaci | stranica, UTM, sistemska napomena, ID zahteva — skupljeno, otvara se klikom na „+" iznad kolona |

Broj, status i ime su zamrznuti (vidljivi i pri pomeranju udesno). Pređite mišem preko zaglavlja za
objašnjenje kolone. Boje upozorenja: **žuto** = posebna ishrana, **crven rok** = rok za uplatu je prošao,
**crveni iznos** = iznos nedostaje, **sivi red** = isteklo ili otkazano.

„Podesi tabelu" može da se pokrene bilo kad: sređuje raspored i boje, podaci se premeštaju zajedno sa
kolonama i ništa se ne briše. Isključuje samo trenutno uključene filtere.

### Statusi

| Status | Značenje | Ko ga postavlja |
|---|---|---|
| NOVA | rezervacija je primljena | sajt |
| ČEKA NA UPLATU | poslate su instrukcije za uplatu | meni ili ručno |
| PODSETNIK POSLAT | rok je prošao, poslat je podsetnik | dnevna provera |
| PLAĆENO | uplata je proverena na izvodu | **vi, ručno** |
| ISTEKLO | uplata nije stigla, mesta su slobodna | dnevna provera |
| OTKAZANO | rezervacija je otkazana | vi, ručno |

Kolona statusa je padajuća lista i obojena je: plavo NOVA, žuto ČEKA, narandžasto PODSETNIK, zeleno
PLAĆENO, sivo ISTEKLO/OTKAZANO. Filtrom u zaglavlju lako izdvojite npr. sve koje čekaju uplatu.

### Nova rezervacija → instrukcije za uplatu

1. Stiže mejl „Nova rezervacija za Sretenjski bal — 27001". *Odgovori* u mejlu ide direktno gostu.
2. Kolona **Iznos za uplatu** je već popunjena po cenama (npr. 2 × Svečana = 280). Proverite je i,
   ako treba (popust, dogovor), upišite drugi iznos.
3. Kliknite bilo gde u redu → **Sretenjski bal → Pošalji instrukcije za uplatu (izabrani red)**.
   Prikazaće se kome se šalje, koji je iznos i koji je rok. Potvrdite sa **Da**.
4. Skripta šalje mejl na jeziku gosta i sama upisuje datum slanja, rok (danas + 7 dana) i status
   ČEKA NA UPLATU. Ako u kolonu „Rok za uplatu" ranije upišete datum, koristi se taj datum.

Ako instrukcije šaljete sami iz Gmaila (šablon je u odeljku 4), u red ručno upišite **Datum slanja
instrukcija za uplatu**, **Rok za uplatu** i status **ČEKA NA UPLATU**. Bez ta dva datuma sistem neće slati
podsetnik niti oslobađati mesto.

### Uplata je na izvodu → PLAĆENO

1. Promenite status u **PLAĆENO**. Po želji upišite **Datum evidentirane uplate**; ako ga ne upišete,
   upisuje se danas.
2. **Sretenjski bal → Pošalji potvrdu uplate (izabrani red)** → **Da**.
3. Upisuje se **Datum slanja potvrde uplate**. Ponovni pokušaj neće poslati drugu potvrdu.
   Ako baš treba ponovo poslati, obrišite taj datum.

### Šta dnevna provera radi sama

- **Podsetnik:** status ČEKA NA UPLATU, poslate instrukcije, uneti rok koji je **prošao**, a podsetnik
  još nije slat → gost dobija ljubazan podsetnik (sa napomenom da odgovori ako je već platio). Upisuje se
  datum, a status postaje PODSETNIK POSLAT.
- **Isticanje:** status PODSETNIK POSLAT, a od podsetnika je prošlo više od `GRACE_DAYS` dana →
  ISTEKLO i upisuje se datum isteka. Gost pri isticanju ne dobija mejl.
- Plaćene, otkazane i istekle rezervacije se nikad ne diraju. Isto važi i za rezervacije sa upisanim
  datumom uplate, čak i kad status nije promenjen.
- Ako podsetnik ne može da se pošalje, status se **ne menja**, pa mesto ne može greškom da se oslobodi.
- Ako je bilo promena ili nešto treba proveriti (npr. status ČEKA bez roka), na `ADMIN_EMAIL` stiže
  kratak izveštaj.
- Ručno pokretanje: **Sretenjski bal → Proveri rokove sada**.

Primer sa podrazumevanim vrednostima: instrukcije 1.11, rok 8.11 → podsetnik 9.11 („platite do 11.11")
→ ISTEKLO 12.11. Ako je gost ipak platio, samo vratite status na PLAĆENO.

### Zatvaranje i ponovno otvaranje prijava

Tab **Podešavanja** → isključite ☐ **`BOOKING_OPEN`**. To je sve: bez izmene koda i bez objavljivanja sajta.

- Forma za najviše ~20 sekundi prikazuje „Rezervacije trenutno nisu dostupne".
- Backend odbija i prijave poslate sa stranice koja je bila otvorena ranije. Skripta to proverava pri
  svakom upisu.
- Već upisane rezervacije ostaju.

Ponovno otvaranje: označite ☑ `BOOKING_OPEN`.

### Statistika

Tab **Statistika** se računa sam: broj prijava, broj karata (ukupno i aktivnih), po statusu, procenat
plaćenih, iznos evidentiranih uplata, prosečan broj dana od prijave do uplate, karte po tipu, izvor
prijave, jezik forme i broj zahteva za fakturu. Za dublju analizu svaki red ima i stranicu prijave
i UTM parametre kampanje (ako ih je link imao).

---

## 3. Šta treba znati

- **Ograničenje Gmaila:** sa običnog Gmail naloga skripta može da pošalje oko **100 mejlova dnevno**.
  Svaka rezervacija troši 2 (organizator + gost). Ako zatreba više, isključite `GUEST_EMAILS` ili
  pređite na Google Workspace nalog (1.500 dnevno). Preostali broj prikazuje „Pošalji probni mejl".
- **Ako mejl ne prođe**, rezervacija ostaje sačuvana, a gost vidi uspešan ekran sa brojem.
  U koloni **Sistemska napomena** piše šta nije poslato.
- **Brojevi rezervacija** se dodeljuju pod zaključavanjem, jedan po jedan, pa ni istovremene prijave
  ne mogu dobiti isti broj. Ponovljen zahtev (npr. posle prekida mreže) vraća isti broj i ne pravi
  novi red.
- **Ispravke koda skripte:** posle izmene `Code.gs` → **Primeni → Upravljaj primenama → ✏️ → Verzija:
  Nova verzija → Primeni**. URL ostaje isti. Bez ovog koraka sajt i dalje koristi staru verziju.
  Meni i dnevna provera odmah koriste novi kod.
- **Nova godina bala:** promenite `BALL_YEAR` (npr. `28`) i brojevi kreću od 28001.

---

## 4. Šabloni za ručno slanje (ako ne koristite meni)

**Instrukcije za uplatu**

> Naslov: Sretenjski bal — instrukcije za uplatu, rezervacija 27001
>
> Dobar dan, [ime],
>
> pregledali smo vašu rezervaciju broj **27001** ([broj] × [tip karte]).
>
> Iznos za uplatu: **[iznos] EUR**
> Rok za uplatu: **[datum, 7 dana od danas]**
> Primalac: [naziv i adresa]
> IBAN: [broj računa]
> Svrha uplate: **Sretenjski bal 27001**
>
> Molimo vas da u svrsi uplate obavezno navedete „Sretenjski bal 27001", kako bismo uplatu povezali sa
> vašom rezervacijom. Kada uplatu evidentiramo na izvodu, poslaćemo vam potvrdu.
>
> Srdačan pozdrav,
> Sretenjski bal

**Potvrda uplate**

> Naslov: Sretenjski bal — uplata za rezervaciju 27001 je evidentirana
>
> Dobar dan, [ime],
>
> potvrđujemo da je uplata za vašu rezervaciju broj **27001** evidentirana. Hvala vam!
> Radujemo se vašem dolasku na Sretenjski bal.
>
> Srdačan pozdrav,
> Sretenjski bal

Automatski mejlovi postoje na srpskom, slovenačkom i engleskom (`MAIL` u `Code.gs`).
Šalju se na jeziku na kom je gost popunio formu.

---

## 5. Lokalni razvoj i testovi

- Bez `APPS_SCRIPT_URL` backend lokalno upisuje rezervacije u `backend/data/rezervacije-dev.jsonl`,
  sa istom numeracijom i bez slanja mejlova. U produkciji bez `APPS_SCRIPT_URL` rezervacije su zatvorene.
- `cd backend && npm test`: provere API-ja, Apps Script klijenta, lokalnog skladišta i **cele logike
  `Code.gs`**. Skripta se izvršava u Node-u sa lažnom tabelom i lažnim Gmailom, pa se ništa ne šalje.
- `cd frontend && npx ng test --watch=false`: provere forme.
- Za testiranje sa pravom tabelom koristite **kopiju tabele** (Datoteka → Napravi kopiju, kopija dobija
  i skriptu) sa sopstvenom web aplikacijom i svojim mejlom, a ne produkcionu tabelu.
