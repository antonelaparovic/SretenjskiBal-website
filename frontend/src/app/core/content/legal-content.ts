/**
 * Pravni tekstovi (politika privatnosti, kolačići) na srpskom, slovenačkom i engleskom.
 * Vrednosti iz ORGANIZER ubacuju se u tekst. Slovenački i engleski tekst treba da pregleda izvorni govornik / pravnik.
 * Pri svakoj izmeni teksta promeniti PRIVACY_POLICY_VERSION u site-content.ts.
 */
import { Locale } from '../i18n/locale';
import { ORGANIZER as O, PRIVACY_POLICY_VERSION } from './site-content';

export interface LegalSection {
  h: string;
  p?: string[];
  list?: string[];
  table?: { head: string[]; rows: string[][] };
}
export interface LegalDoc {
  title: string;
  updated: string;
  sections: LegalSection[];
}

const IP = {
  name: 'Informacijski pooblaščenec',
  address: 'Dunajska cesta 22, 1000 Ljubljana',
  email: 'gp.ip@ip-rs.si',
  url: 'https://www.ip-rs.si/',
};

const privacySr: LegalDoc = {
  title: 'Politika privatnosti',
  updated: `Verzija ${PRIVACY_POLICY_VERSION}`,
  sections: [
    {
      h: '1. Ko je upravljač podataka',
      p: [
        `Upravljač vaših ličnih podataka je ${O.legalName}, ${O.address}, ${O.registration} (u daljem tekstu: organizator). Pitanja o privatnosti: ${O.privacyEmail}.`,
        'Ova politika važi za sajt Sretenjskog bala i obrađuje podatke u skladu sa Uredbom (EU) 2016/679 (GDPR) i slovenačkim Zakonom o zaštiti ličnih podataka (ZVOP-2).',
      ],
    },
    {
      h: '2. Koje podatke obrađujemo i zašto',
      table: {
        head: ['Svrha', 'Podaci', 'Pravni osnov'],
        rows: [
          ['Rezervacija ulaznica', 'Ime i prezime, e-adresa, telefon, vrsta i broj ulaznica, napomena, izvor informacije o balu, podaci za račun (ako ih tražite)', 'Izvršenje ugovora / radnje na vaš zahtev pre ugovora (čl. 6(1)(b) GDPR)'],
          ['Ishrana i alergije (nije obavezno)', 'Slobodan tekst koji sami upišete; može otkriti zdravstveno stanje', 'Vaša izričita saglasnost (čl. 9(2)(a) GDPR); možete je opozvati u svakom trenutku'],
          ['Poruke preko kontakt forme', 'Ime, e-adresa, tekst poruke', 'Saglasnost (čl. 6(1)(a)); odgovor na vaš upit (čl. 6(1)(b))'],
          ['Račun i knjigovodstvo', 'Podaci na računu', 'Zakonska obaveza (čl. 6(1)(c))'],
          ['Zaštita od zloupotrebe (neželjene poruke)', 'Tehnički podaci o slanju forme, bez kolačića', 'Legitimni interes (čl. 6(1)(f)) — bezbednost sajta'],
        ],
      },
    },
    {
      h: '3. Koliko dugo čuvamo podatke',
      list: [
        'Podaci o rezervaciji: do 6 meseci nakon održavanja bala, osim podataka koje zakon traži da čuvamo (računi).',
        'Podaci o ishrani i alergijama: do 30 dana nakon bala, a ranije ako opozovete saglasnost.',
        'Poruke iz kontakt forme: do 12 meseci.',
        'Računi i knjigovodstvena dokumentacija: koliko propisuje zakon.',
      ],
    },
    {
      h: '4. Ko ima pristup podacima',
      p: [
        'Podacima pristupaju samo članovi organizacionog tima. Koristimo sledeće obrađivače, koji podatke obrađuju samo po našem nalogu:',
      ],
      list: [
        `Hosting sajta: ${O.hosting}`,
        `Slanje e-pošte: ${O.mailProvider}`,
        'Google Ireland Ltd. (Google Sheets / Apps Script) — evidencija rezervacija. Mogući prenos podataka van EU zasniva se na Okviru EU–SAD za privatnost podataka ili standardnim ugovornim klauzulama.',
      ],
    },
    {
      h: '5. Vaša prava',
      p: [
        'Imate pravo na pristup, ispravku, brisanje, ograničenje obrade, prenosivost podataka i prigovor na obradu. Saglasnost možete opozvati u svakom trenutku, bez uticaja na zakonitost obrade pre opoziva.',
        `Zahtev pošaljite na ${O.privacyEmail}; odgovaramo u roku od mesec dana.`,
        `Imate pravo da podnesete pritužbu nadzornom organu: ${IP.name}, ${IP.address}, ${IP.email}, ${IP.url}.`,
      ],
    },
    {
      h: '6. Obaveznost podataka i automatsko odlučivanje',
      p: [
        'Ime, e-adresa, telefon i broj ulaznica potrebni su da bismo obradili rezervaciju; bez njih ne možemo da je primimo. Podaci o ishrani su dobrovoljni. Ne vršimo automatsko odlučivanje ni profilisanje.',
        'Sajt je namenjen osobama starijim od 15 godina; maloletnici mlađi od 15 godina ne mogu sami da daju saglasnost.',
      ],
    },
    {
      h: '7. Kolačići i praćenje',
      p: ['Sajt ne postavlja kolačiće niti upisuje podatke u lokalnu memoriju pregledača (localStorage), a ne koristimo ni analitiku, oglase, društvene dodatke ili spoljne servise koji prate posetioce. Fontovi se učitavaju sa našeg servera. Zato nema banera za saglasnost; ako u budućnosti uvedemo analitiku, tražićemo vašu saglasnost pre toga.'],
    },
    {
      h: '8. Fotografisanje na balu',
      p: ['Na balu se mogu snimati fotografije i video. Obaveštenje o tome biće istaknuto na ulazu; ako ne želite da budete snimljeni, recite to osoblju.'],
    },
    {
      h: '9. Izmene politike',
      p: ['Politiku možemo menjati; važeća verzija je uvek na ovoj stranici, sa oznakom verzije na vrhu.'],
    },
  ],
};

const privacySl: LegalDoc = {
  title: 'Politika zasebnosti',
  updated: `Različica ${PRIVACY_POLICY_VERSION}`,
  sections: [
    {
      h: '1. Kdo je upravljavec podatkov',
      p: [
        `Upravljavec vaših osebnih podatkov je ${O.legalName}, ${O.address}, ${O.registration} (v nadaljevanju: organizator). Vprašanja o zasebnosti: ${O.privacyEmail}.`,
        'Ta politika velja za spletno stran Sretenjskega bala; podatke obdelujemo v skladu z Uredbo (EU) 2016/679 (GDPR) in Zakonom o varstvu osebnih podatkov (ZVOP-2).',
      ],
    },
    {
      h: '2. Katere podatke obdelujemo in zakaj',
      table: {
        head: ['Namen', 'Podatki', 'Pravna podlaga'],
        rows: [
          ['Rezervacija vstopnic', 'Ime in priimek, e-naslov, telefon, vrsta in število vstopnic, opomba, vir informacije o plesu, podatki za račun (če ga zahtevate)', 'Izvajanje pogodbe / ukrepi na vašo zahtevo pred sklenitvijo pogodbe (čl. 6(1)(b) GDPR)'],
          ['Prehrana in alergije (neobvezno)', 'Prosto besedilo, ki ga vnesete sami; lahko razkrije zdravstveno stanje', 'Vaša izrecna privolitev (čl. 9(2)(a) GDPR); prekličete jo lahko kadar koli'],
          ['Sporočila prek kontaktnega obrazca', 'Ime, e-naslov, besedilo sporočila', 'Privolitev (čl. 6(1)(a)); odgovor na vaše vprašanje (čl. 6(1)(b))'],
          ['Računi in računovodstvo', 'Podatki na računu', 'Zakonska obveznost (čl. 6(1)(c))'],
          ['Zaščita pred zlorabo (neželena sporočila)', 'Tehnični podatki o oddaji obrazca, brez piškotkov', 'Zakoniti interes (čl. 6(1)(f)) — varnost spletne strani'],
        ],
      },
    },
    {
      h: '3. Kako dolgo hranimo podatke',
      list: [
        'Podatki o rezervaciji: do 6 mesecev po plesu, razen podatkov, ki jih moramo hraniti po zakonu (računi).',
        'Podatki o prehrani in alergijah: do 30 dni po plesu, prej, če privolitev prekličete.',
        'Sporočila iz kontaktnega obrazca: do 12 mesecev.',
        'Računi in računovodska dokumentacija: v skladu z zakonom.',
      ],
    },
    {
      h: '4. Kdo ima dostop do podatkov',
      p: ['Do podatkov dostopajo le člani organizacijske ekipe. Uporabljamo naslednje obdelovalce, ki podatke obdelujejo samo po naših navodilih:'],
      list: [
        `Gostovanje spletne strani: ${O.hosting}`,
        `Pošiljanje e-pošte: ${O.mailProvider}`,
        'Google Ireland Ltd. (Google Sheets / Apps Script) — evidenca rezervacij. Morebitni prenos podatkov izven EU temelji na okviru EU–ZDA za varstvo podatkov ali standardnih pogodbenih klavzulah.',
      ],
    },
    {
      h: '5. Vaše pravice',
      p: [
        'Imate pravico do dostopa, popravka, izbrisa, omejitve obdelave, prenosljivosti podatkov in ugovora. Privolitev lahko kadar koli prekličete, ne da bi to vplivalo na zakonitost obdelave pred preklicem.',
        `Zahtevo pošljite na ${O.privacyEmail}; odgovorimo v enem mesecu.`,
        `Pritožbo lahko vložite pri nadzornem organu: ${IP.name}, ${IP.address}, ${IP.email}, ${IP.url}.`,
      ],
    },
    {
      h: '6. Obveznost podatkov in avtomatsko odločanje',
      p: [
        'Ime, e-naslov, telefon in število vstopnic so potrebni za obdelavo rezervacije; brez njih je ne moremo sprejeti. Podatki o prehrani so prostovoljni. Ne izvajamo avtomatskega odločanja ali profiliranja.',
        'Spletna stran je namenjena osebam, starejšim od 15 let; mlajši od 15 let ne morejo sami dati privolitve.',
      ],
    },
    {
      h: '7. Piškotki in sledenje',
      p: ['Spletna stran ne nastavlja piškotkov in ne zapisuje podatkov v lokalni pomnilnik brskalnika (localStorage); ne uporabljamo niti analitike, oglasov, družbenih vtičnikov ali zunanjih storitev, ki bi sledile obiskovalcem. Pisave se nalagajo z našega strežnika. Zato ni pasice za privolitev; če bomo v prihodnje uvedli analitiko, bomo pred tem zahtevali vašo privolitev.'],
    },
    {
      h: '8. Fotografiranje na plesu',
      p: ['Na plesu lahko nastajajo fotografije in video posnetki. Obvestilo bo objavljeno ob vhodu; če ne želite biti posneti, to sporočite osebju.'],
    },
    {
      h: '9. Spremembe politike',
      p: ['Politiko lahko spremenimo; veljavna različica je vedno na tej strani, z oznako različice na vrhu.'],
    },
  ],
};

const privacyEn: LegalDoc = {
  title: 'Privacy Policy',
  updated: `Version ${PRIVACY_POLICY_VERSION}`,
  sections: [
    {
      h: '1. Who is the controller',
      p: [
        `The controller of your personal data is ${O.legalName}, ${O.address}, ${O.registration} (the organiser). Privacy enquiries: ${O.privacyEmail}.`,
        'This policy applies to the Sretenjski bal website and complies with Regulation (EU) 2016/679 (GDPR) and the Slovenian Personal Data Protection Act (ZVOP-2).',
      ],
    },
    {
      h: '2. What data we process and why',
      table: {
        head: ['Purpose', 'Data', 'Legal basis'],
        rows: [
          ['Ticket reservations', 'Full name, email, phone, ticket type and number, note, how you heard about the ball, invoice details (if requested)', 'Performance of a contract / steps at your request before a contract (Art. 6(1)(b) GDPR)'],
          ['Diet and allergies (optional)', 'Free text you enter yourself; it may reveal health information', 'Your explicit consent (Art. 9(2)(a) GDPR); you can withdraw it at any time'],
          ['Messages via the contact form', 'Name, email, message text', 'Consent (Art. 6(1)(a)); replying to your enquiry (Art. 6(1)(b))'],
          ['Invoices and accounting', 'Invoice data', 'Legal obligation (Art. 6(1)(c))'],
          ['Spam and abuse protection', 'Technical data about form submission, no cookies', 'Legitimate interest (Art. 6(1)(f)) — site security'],
        ],
      },
    },
    {
      h: '3. How long we keep data',
      list: [
        'Reservation data: up to 6 months after the ball, except data we are legally required to keep (invoices).',
        'Diet and allergy information: up to 30 days after the ball, or sooner if you withdraw consent.',
        'Contact form messages: up to 12 months.',
        'Invoices and accounting records: as required by law.',
      ],
    },
    {
      h: '4. Who has access',
      p: ['Only members of the organising team can access the data. We use the following processors, which act only on our instructions:'],
      list: [
        `Website hosting: ${O.hosting}`,
        `Email delivery: ${O.mailProvider}`,
        'Google Ireland Ltd. (Google Sheets / Apps Script) — reservation records. Any transfer outside the EU relies on the EU–US Data Privacy Framework or standard contractual clauses.',
      ],
    },
    {
      h: '5. Your rights',
      p: [
        'You have the right to access, rectification, erasure, restriction, data portability and to object. You may withdraw consent at any time without affecting the lawfulness of processing before withdrawal.',
        `Send requests to ${O.privacyEmail}; we reply within one month.`,
        `You may lodge a complaint with the supervisory authority: ${IP.name}, ${IP.address}, ${IP.email}, ${IP.url}.`,
      ],
    },
    {
      h: '6. Mandatory data and automated decisions',
      p: [
        'Name, email, phone and number of tickets are needed to process a reservation; without them we cannot accept it. Diet information is voluntary. We do not use automated decision-making or profiling.',
        'The site is intended for people aged 15 and over; younger visitors cannot give consent on their own.',
      ],
    },
    {
      h: '7. Cookies and tracking',
      p: ['The site does not set cookies or write data to your browser’s local storage (localStorage), and we use no analytics, advertising, social plug-ins or third-party services that track visitors. Fonts are served from our own server. That is why there is no consent banner; if we later introduce analytics, we will ask for your consent first.'],
    },
    {
      h: '8. Photography at the ball',
      p: ['Photos and video may be taken at the ball. A notice will be displayed at the entrance; if you do not wish to be photographed, tell our staff.'],
    },
    {
      h: '9. Changes',
      p: ['We may update this policy; the current version is always on this page, with the version label at the top.'],
    },
  ],
};

export const LEGAL: Record<'privacy', Record<Locale, LegalDoc>> = {
  privacy: { sr: privacySr, sl: privacySl, en: privacyEn },
};

export const LEGAL_LANG_LABEL: Record<Locale, string> = { sr: 'Srpski', sl: 'Slovenščina', en: 'English' };
