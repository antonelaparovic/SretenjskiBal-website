import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, timeout } from 'rxjs';
import { APPS_SCRIPT_URL } from '../config/app.constants';
import { BookingStatus, CheckinResult, ContactPayload, ReservationPayload, ReservationResult } from '../models/content.models';

/** Skripta je odgovorila, ali zahtev nije prihvaćen (npr. BOOKING_CLOSED, INVALID, CAPTCHA_FAILED, BUSY). */
export class ScriptError extends Error {
  constructor(readonly code: string) {
    super(`Google skripta je odbila zahtev: ${code}`);
  }
}

/** Duže od ovoga skripta ne radi ni kad je zauzeta; posle toga posetilac može da pokuša ponovo. */
const TIMEOUT_MS = 45_000;

/**
 * Sajt je statički i šalje direktno Google Apps Scriptu u tabeli.
 * Telo je JSON poslat kao običan tekst — tako browser ne traži posebnu CORS dozvolu koju Apps Script ne podržava.
 */
@Injectable({ providedIn: 'root' })
export class FormsApiService {
  private readonly http = inject(HttpClient);

  sendContact(payload: ContactPayload, captcha: string): Observable<{ ok: true }> {
    return this.call<{ ok: true }>({ action: 'contact', contact: payload, captcha });
  }

  getReservationStatus(): Observable<BookingStatus> {
    return this.call<BookingStatus>({ action: 'status' });
  }

  createReservation(payload: ReservationPayload, captcha: string): Observable<ReservationResult> {
    return this.call<ReservationResult>({ action: 'create', reservation: payload, captcha });
  }

  /** Skeniranje na ulazu (stranica /ulaz). Bez koda samo proverava PIN. */
  checkin(pin: string, device: string, code?: string): Observable<CheckinResult> {
    return this.call<CheckinResult>({ action: 'checkin', pin, device, ...(code ? { code } : {}) });
  }

  private call<T>(body: object): Observable<T> {
    return this.http
      .post<{ ok?: boolean; code?: string }>(APPS_SCRIPT_URL, JSON.stringify(body), {
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      })
      .pipe(
        timeout(TIMEOUT_MS),
        map((res) => {
          if (!res || res.ok !== true) throw new ScriptError(res?.code ?? 'SERVER_ERROR');
          return res as T;
        }),
      );
  }
}
