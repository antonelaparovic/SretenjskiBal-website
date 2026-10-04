import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_PREFIX } from '../config/app.constants';
import { ContactPayload } from '../models/content.models';

@Injectable({ providedIn: 'root' })
export class FormsApiService {
  private readonly http = inject(HttpClient);

  sendContact(payload: ContactPayload): Observable<{ ok: true }> {
    return this.http.post<{ ok: true }>(`${API_PREFIX}/contact`, payload);
  }
}
