import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ORGANIZER, PRIVACY_POLICY_VERSION, TICKETS } from '../../core/content/site-content';
import { currentLocale } from '../../core/i18n/locale';
import { CompanyCountry, ReservationPayload, ReservationSource, TicketTypeCode } from '../../core/models/content.models';
import { FormsApiService, ScriptError } from '../../core/services/forms-api.service';
import { TurnstileComponent } from '../../shared/components/turnstile/turnstile.component';
import { formatPrice } from '../../core/util/format';

type Booking = 'loading' | 'open' | 'closed' | 'error';

/** Šifre moraju biti iste kao u google-apps-script/Code.gs (TICKET_TYPES); naziv i cena su u site-content.ts (TICKETS). */
export const TICKET_TYPE_OPTIONS: { value: TicketTypeCode; label: string }[] = [
  { value: 'SVECANA', label: $localize`Svečana` },
  { value: 'GALERIJA', label: $localize`Galerija` },
];

export const SOURCE_OPTIONS: { value: ReservationSource; label: string }[] = [
  { value: 'PREPORUKA', label: $localize`Preporuka prijatelja` },
  { value: 'DRUSTVENE_MREZE', label: $localize`Društvene mreže` },
  { value: 'DRUGO', label: $localize`Drugo` },
];

/** Tehnička zaštita od zloupotrebe forme (nije prodajno ograničenje); ista vrednost je u backendu i Apps Scriptu. */
const MAX_TICKETS = 100;
/** Isti uslov kao na backendu: cifre, razmaci, + ( ) / . - i najmanje 6 cifara. */
const PHONE = /^(?=(?:\D*\d){6})[+0-9 ()/.-]{6,30}$/;
const UTM_KEYS = ['source', 'medium', 'campaign', 'term', 'content'] as const;

/** Ime i prezime: najmanje 2 znaka bez razmaka na krajevima. */
/** Ista pravila kao isValidTaxId u backendu i u Apps Scriptu. */
export function taxIdValid(country: CompanyCountry, taxId: string): boolean {
  const v = taxId.replace(/[\s.-]/g, '').toUpperCase();
  if (country === 'SI') return /^(SI)?\d{8}$/.test(v);
  if (country === 'EU') return /^[A-Z]{2}[0-9A-Z+*]{2,12}$/.test(v) && !v.startsWith('SI');
  return taxId.trim().length >= 2;
}

function companyTaxId(group: AbstractControl): ValidationErrors | null {
  const country = group.get('country')?.value as CompanyCountry;
  const taxId = (group.get('taxId')?.value as string) ?? '';
  return taxId.trim() && !taxIdValid(country, taxId) ? { taxId: true } : null;
}

function personName(c: AbstractControl<string>): ValidationErrors | null {
  return (c.value ?? '').trim().length >= 2 ? null : { name: true };
}

function wholeNumber(c: AbstractControl<number | null>): ValidationErrors | null {
  return Number.isInteger(c.value) ? null : { wholeNumber: true };
}

function newRequestId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

@Component({
  selector: 'app-reservation-form',
  imports: [ReactiveFormsModule, RouterLink, TurnstileComponent],
  templateUrl: './reservation-form.component.html',
  styleUrl: './reservation-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReservationFormComponent {
  protected readonly ticketTypes = TICKET_TYPE_OPTIONS.map((t) => {
    const cents = TICKETS.find((x) => x.code === t.value)?.priceCents ?? 0;
    return { ...t, cents, price: cents > 0 ? formatPrice(cents) : null };
  });
  protected readonly sources = SOURCE_OPTIONS;
  protected readonly maxTickets = MAX_TICKETS;
  protected readonly booking = signal<Booking>('loading');
  protected readonly sending = signal(false);
  protected readonly submitted = signal(false);
  protected readonly serverError = signal<string | null>(null);
  /** Token Turnstile provere za sledeće slanje. */
  protected readonly captcha = signal<string | null>(null);
  protected readonly captchaFailed = signal(false);
  protected readonly result = signal<{ number: string; ticketLabel: string; count: number; mailTo: string | null } | null>(null);

  private readonly api = inject(FormsApiService);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly doc = inject(DOCUMENT);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly successEl = viewChild<ElementRef<HTMLElement>>('success');
  private readonly turnstile = viewChild(TurnstileComponent);
  private readonly locale = currentLocale();
  private renderedAt = Date.now();
  /** Ostaje isti dok rezervacija ne uspe, pa ponovno slanje posle greške ne pravi duplikat. */
  private requestId: string | null = null;

  protected readonly organizerName = ORGANIZER.name;
  protected readonly form = this.fb.group({
    firstName: ['', [Validators.required, personName, Validators.maxLength(60)]],
    lastName: ['', [Validators.required, personName, Validators.maxLength(60)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    phone: ['', [Validators.required, Validators.pattern(PHONE)]],
    ticketCount: [1 as number | null, [Validators.required, wholeNumber, Validators.min(1), Validators.max(MAX_TICKETS)]],
    ticketType: ['' as TicketTypeCode | '', Validators.required],
    guests: this.fb.array<ReturnType<ReservationFormComponent['newGuest']>>([]),
    diet: ['', Validators.maxLength(1000)],
    dietConsent: [false, Validators.requiredTrue],
    note: ['', Validators.maxLength(2000)],
    invoiceNeeded: [false],
    company: this.fb.group({
      name: ['', [Validators.required, personName, Validators.maxLength(200)]],
      address: ['', [Validators.required, personName, Validators.maxLength(300)]],
      country: ['SI' as CompanyCountry, Validators.required],
      taxId: ['', [Validators.required, personName, Validators.maxLength(40)]],
      vatPayer: [null as boolean | null, Validators.required],
    }, { validators: companyTaxId }),
    source: ['' as ReservationSource | '', Validators.required],
    sourceOther: ['', Validators.maxLength(200)],
    website: [''],
  });

  /** Podaci jednog gosta preko prvog (prvi gost je osoba koja rezerviše). */
  protected newGuest() {
    return this.fb.group({
      firstName: ['', [Validators.required, personName, Validators.maxLength(60)]],
      lastName: ['', [Validators.required, personName, Validators.maxLength(60)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
      phone: ['', [Validators.required, Validators.pattern(PHONE)]],
    });
  }
  protected get guests() { return this.form.controls.guests; }
  protected readonly dietText = toSignal(this.form.controls.diet.valueChanges, { initialValue: '' });
  protected readonly companyCountry = toSignal(this.form.controls.company.controls.country.valueChanges, { initialValue: 'SI' as CompanyCountry });
  protected taxIdInvalid(): boolean {
    const g = this.form.controls.company;
    return g.controls.taxId.touched && !!g.controls.taxId.value.trim() && !!g.errors?.['taxId'];
  }
  protected readonly invoiceNeeded = toSignal(this.form.controls.invoiceNeeded.valueChanges, { initialValue: false });
  protected readonly ticketCount = toSignal(this.form.controls.ticketCount.valueChanges, { initialValue: 1 as number | null });
  protected readonly ticketType = toSignal(this.form.controls.ticketType.valueChanges, { initialValue: '' as TicketTypeCode | '' });
  protected readonly source = toSignal(this.form.controls.source.valueChanges, { initialValue: '' as ReservationSource | '' });

  /** Okvirni iznos po cenama sa sajta; tačan iznos stiže u mejlu sa instrukcijama za uplatu. */
  protected readonly estimate = computed(() => {
    const t = this.ticketTypes.find((x) => x.value === this.ticketType());
    const count = Number(this.ticketCount());
    if (!t || t.cents <= 0 || !Number.isInteger(count) || count < 1 || count > MAX_TICKETS) return null;
    return { total: formatPrice(t.cents * count), count, unit: t.price };
  });

  constructor() {
    const c = this.form.controls;
    c.company.disable();
    const syncGuests = () => {
      const raw = Number(c.ticketCount.value);
      const want = Number.isInteger(raw) ? Math.min(MAX_TICKETS, Math.max(1, raw)) - 1 : 0;
      const arr = c.guests;
      while (arr.length < want) arr.push(this.newGuest());
      while (arr.length > want) arr.removeAt(arr.length - 1);
    };
    c.ticketCount.valueChanges.subscribe(syncGuests);
    // Saglasnost za podatke o zdravlju traži se samo kad je ishrana popunjena.
    c.dietConsent.disable();
    c.diet.valueChanges.subscribe((text) => {
      if (text.trim()) c.dietConsent.enable({ emitEvent: false });
      else c.dietConsent.disable({ emitEvent: false });
    });
    const syncVatPayer = () => {
      const vat = c.company.controls.vatPayer;
      if (c.company.controls.country.value === 'SI' && c.invoiceNeeded.value) vat.enable({ emitEvent: false });
      else vat.disable({ emitEvent: false });
    };
    c.invoiceNeeded.valueChanges.subscribe((needed) => {
      if (needed) c.company.enable();
      else c.company.disable();
      syncVatPayer();
    });
    c.company.controls.country.valueChanges.subscribe(syncVatPayer);
    // Status (otvoreno/zatvoreno) proveravamo u browseru, da ne bi ostao zapamćen u HTML-u sa servera.
    afterNextRender(() => this.loadStatus());
  }

  protected loadStatus(): void {
    this.booking.set('loading');
    this.api.getReservationStatus().subscribe({
      next: (s) => this.booking.set(s.open ? 'open' : 'closed'),
      error: () => this.booking.set('error'),
    });
  }

  protected invalid(c: AbstractControl): boolean {
    return c.invalid && (c.touched || this.submitted());
  }

  /** Dugmad − / + pored broja ulaznica. */
  protected step(delta: number): void {
    const c = this.form.controls.ticketCount;
    const current = Number.isInteger(c.value) ? (c.value as number) : 1;
    c.setValue(Math.min(MAX_TICKETS, Math.max(1, current + delta)));
    c.markAsTouched();
  }

  protected submit(): void {
    if (this.sending()) return;
    this.submitted.set(true);
    this.serverError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.focusFirstInvalid();
      return;
    }
    const captcha = this.captcha();
    if (!captcha) {
      this.serverError.set(
        this.captchaFailed()
          ? $localize`Provera da niste robot nije mogla da se učita. Proverite internet vezu ili isključite blokator reklama za ovaj sajt, pa osvežite stranicu.`
          : $localize`Još trenutak — proveravamo da niste robot. Pokušajte ponovo za nekoliko sekundi.`,
      );
      return;
    }
    this.requestId ??= newRequestId();
    this.sending.set(true);
    const payload = this.buildPayload(this.requestId);
    this.api.createReservation(payload, captcha).subscribe({
      next: (res) => {
        this.sending.set(false);
        this.turnstile()?.reset();
        this.requestId = null;
        this.result.set({
          number: res.reservationNumber,
          ticketLabel: this.ticketTypes.find((t) => t.value === payload.tickets[0].ticketType)?.label ?? '',
          count: payload.tickets[0].count,
          mailTo: res.guestMailSent ? payload.email : null,
        });
        setTimeout(() => {
          const el = this.successEl()?.nativeElement;
          el?.scrollIntoView({ block: 'start' });
          el?.focus({ preventScroll: true });
        });
      },
      error: (e: unknown) => {
        this.sending.set(false);
        this.turnstile()?.reset(); // token važi za jedno slanje
        const code = e instanceof ScriptError ? e.code : null;
        if (code === 'BOOKING_CLOSED') {
          this.booking.set('closed');
          this.serverError.set($localize`Rezervacije su u međuvremenu zatvorene, pa Vaša rezervacija nije evidentirana.`);
        } else if (code === 'BUSY') {
          this.serverError.set($localize`Trenutno je velika gužva. Pokušajte ponovo za minut — uneti podaci su sačuvani u formi i nećete napraviti duplu rezervaciju.`);
        } else if (code === 'CAPTCHA_FAILED') {
          this.serverError.set($localize`Provera da niste robot nije prošla. Pokušajte ponovo za nekoliko sekundi.`);
        } else if (code === 'INVALID' || code === 'REJECTED') {
          this.serverError.set($localize`Proverite unete podatke i pokušajte ponovo.`);
        } else {
          this.serverError.set(
            $localize`Rezervacija nije sačuvana zbog privremenog tehničkog problema. Vaši podaci su ostali u formi — pokušajte ponovo za nekoliko trenutaka. Ponovnim slanjem nećete napraviti duplu rezervaciju.`,
          );
        }
      },
    });
  }

  private buildPayload(requestId: string): ReservationPayload {
    const v = this.form.getRawValue();
    const params = new URLSearchParams(this.doc.location?.search ?? '');
    const utm: ReservationPayload['utm'] = {};
    for (const k of UTM_KEYS) {
      const value = params.get(`utm_${k}`);
      if (value) utm[k] = value.slice(0, 100);
    }
    return {
      requestId,
      fullName: `${v.firstName.trim()} ${v.lastName.trim()}`,
      email: v.email.trim(),
      phone: v.phone.trim(),
      tickets: [{ ticketType: v.ticketType as TicketTypeCode, count: v.ticketCount as number }],
      invoice: v.invoiceNeeded
        ? {
            needed: true,
            companyName: v.company.name.trim(),
            companyAddress: v.company.address.trim(),
            companyCountry: v.company.country,
            taxId: v.company.taxId.trim().toUpperCase(),
            ...(v.company.country === 'SI' ? { vatPayer: v.company.vatPayer === true } : {}),
          }
        : { needed: false },
      diet: v.diet.trim(),
      dietConsent: v.diet.trim() !== '' && v.dietConsent === true,
      privacyPolicyVersion: PRIVACY_POLICY_VERSION,
      note: v.note.trim(),
      ...(v.guests.length ? { guests: v.guests.map((g) => ({ firstName: g.firstName.trim(), lastName: g.lastName.trim(), email: g.email.trim(), phone: g.phone.trim() })) } : {}),
      source: v.source as ReservationSource,
      sourceOther: v.source === 'DRUGO' ? v.sourceOther.trim() : '',
      locale: this.locale,
      pageUrl: (this.doc.location?.pathname ?? '').slice(0, 500),
      utm,
      website: v.website,
      elapsedMs: Date.now() - this.renderedAt,
    };
  }

  private focusFirstInvalid(): void {
    setTimeout(() => this.host.nativeElement.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
  }
}
