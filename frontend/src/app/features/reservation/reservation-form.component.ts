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
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { TICKETS } from '../../core/content/site-content';
import { currentLocale } from '../../core/i18n/locale';
import { ReservationPayload, ReservationSource, TicketTypeCode } from '../../core/models/content.models';
import { FormsApiService } from '../../core/services/forms-api.service';
import { formatPrice } from '../../core/util/format';

type Booking = 'loading' | 'open' | 'closed' | 'error';

/** Šifre moraju biti iste u backend/src/reservations/reservation.dto.ts i google-apps-script/Code.gs. */
export const TICKET_TYPE_OPTIONS: { value: TicketTypeCode; label: string }[] = [
  { value: 'SVECANA', label: $localize`Svečana` },
  { value: 'GALERIJA', label: $localize`Galerija` },
];

export const SOURCE_OPTIONS: { value: ReservationSource; label: string }[] = [
  { value: 'PREPORUKA', label: $localize`Preporuka prijatelja` },
  { value: 'DRUSTVENE_MREZE', label: $localize`Društvene mreže` },
  { value: 'RANIJI_DOLAZAK', label: $localize`Raniji dolazak na bal` },
  { value: 'SAJT', label: $localize`Sajt` },
  { value: 'EMAIL', label: $localize`E-mail` },
  { value: 'DRUGO', label: $localize`Drugo` },
];

/** Tehnička zaštita od zloupotrebe forme (nije prodajno ograničenje); ista vrednost je u backendu i Apps Scriptu. */
const MAX_TICKETS = 100;
/** Isti uslov kao na backendu: cifre, razmaci, + ( ) / . - i najmanje 6 cifara. */
const PHONE = /^(?=(?:\D*\d){6})[+0-9 ()/.-]{6,30}$/;
const UTM_KEYS = ['source', 'medium', 'campaign', 'term', 'content'] as const;

/** Ime i prezime: najmanje 2 znaka bez razmaka na krajevima. */
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
  imports: [ReactiveFormsModule, RouterLink],
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
  protected readonly result = signal<{ number: string; ticketLabel: string; count: number; mailTo: string | null } | null>(null);

  private readonly api = inject(FormsApiService);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly doc = inject(DOCUMENT);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  private readonly successEl = viewChild<ElementRef<HTMLElement>>('success');
  private readonly locale = currentLocale();
  private renderedAt = Date.now();
  /** Ostaje isti dok rezervacija ne uspe, pa ponovno slanje posle greške ne pravi duplikat. */
  private requestId: string | null = null;

  protected readonly form = this.fb.group({
    fullName: ['', [Validators.required, personName, Validators.maxLength(120)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    phone: ['', [Validators.required, Validators.pattern(PHONE)]],
    ticketCount: [1 as number | null, [Validators.required, wholeNumber, Validators.min(1), Validators.max(MAX_TICKETS)]],
    ticketType: ['' as TicketTypeCode | '', Validators.required],
    diet: ['', Validators.maxLength(1000)],
    note: ['', Validators.maxLength(2000)],
    invoiceNeeded: [false],
    company: this.fb.group({
      name: ['', [Validators.required, personName, Validators.maxLength(200)]],
      address: ['', [Validators.required, personName, Validators.maxLength(300)]],
      taxId: ['', [Validators.required, personName, Validators.maxLength(40)]],
    }),
    source: ['' as ReservationSource | '', Validators.required],
    sourceOther: ['', Validators.maxLength(200)],
    website: [''],
  });

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
    c.invoiceNeeded.valueChanges.subscribe((needed) => (needed ? c.company.enable() : c.company.disable()));
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

  /** Dugmad − / + pored broja karata. */
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
    this.requestId ??= newRequestId();
    this.sending.set(true);
    const payload = this.buildPayload(this.requestId);
    this.api.createReservation(payload).subscribe({
      next: (res) => {
        this.sending.set(false);
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
      error: (e: HttpErrorResponse) => {
        this.sending.set(false);
        const code = (e.error as { code?: string } | null)?.code;
        if (e.status === 409 || code === 'BOOKING_CLOSED') {
          this.booking.set('closed');
          this.serverError.set($localize`Rezervacije su u međuvremenu zatvorene, pa vaša rezervacija nije evidentirana.`);
        } else if (e.status === 429) {
          this.serverError.set($localize`Poslali ste više zahteva u kratkom roku. Pokušajte ponovo za nekoliko minuta — uneti podaci su sačuvani u formi.`);
        } else if (e.status === 400) {
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
      fullName: v.fullName.trim(),
      email: v.email.trim(),
      phone: v.phone.trim(),
      tickets: [{ ticketType: v.ticketType as TicketTypeCode, count: v.ticketCount as number }],
      invoice: v.invoiceNeeded
        ? { needed: true, companyName: v.company.name.trim(), companyAddress: v.company.address.trim(), taxId: v.company.taxId.trim() }
        : { needed: false },
      diet: v.diet.trim(),
      note: v.note.trim(),
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
