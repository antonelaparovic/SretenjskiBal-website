import { ChangeDetectionStrategy, Component, inject, input, signal, effect } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { ContactTopic } from '../../../core/models/content.models';
import { FormsApiService } from '../../../core/services/forms-api.service';

type Status = 'idle' | 'sending' | 'sent' | 'error';

export const CONTACT_TOPICS: { value: ContactTopic; label: string }[] = [
  { value: 'OPSTE', label: $localize`Opšti upit` },
  { value: 'PARTNERSTVO', label: $localize`Partnerstvo i sponzorstvo` },
  { value: 'KARTE', label: $localize`Rezervacije` },
  { value: 'MEDIJI', label: $localize`Mediji` },
  { value: 'SARADNJA', label: $localize`Saradnja i nastup` },
];

@Component({
  selector: 'app-contact-form',
  imports: [ReactiveFormsModule],
  templateUrl: './contact-form.component.html',
  styleUrl: './contact-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactFormComponent {
  /** Unapred izabrana tema, npr. iz ?tema=PARTNERSTVO. */
  readonly topic = input<string | undefined>();

  protected readonly topics = CONTACT_TOPICS;
  protected readonly status = signal<Status>('idle');
  protected readonly serverError = signal<string | null>(null);
  protected readonly submitted = signal(false);
  private readonly api = inject(FormsApiService);
  private renderedAt = Date.now();

  protected readonly form = inject(FormBuilder).nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(80)]],
    lastName: ['', [Validators.required, Validators.maxLength(80)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    topic: ['OPSTE' as ContactTopic, Validators.required],
    message: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(4000)]],
    consent: [false, Validators.requiredTrue],
    website: [''],
  });

  constructor() {
    effect(() => {
      const t = this.topic();
      if (t && CONTACT_TOPICS.some((x) => x.value === t)) {
        this.form.controls.topic.setValue(t as ContactTopic);
      }
    });
  }

  protected invalid(name: keyof typeof this.form.controls): boolean {
    const c = this.form.controls[name];
    return c.invalid && (c.touched || this.submitted());
  }

  protected submit(): void {
    this.submitted.set(true);
    this.serverError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.status.set('sending');
    this.api
      .sendContact({ ...this.form.getRawValue(), elapsedMs: Date.now() - this.renderedAt })
      .subscribe({
        next: () => this.status.set('sent'),
        error: (e: HttpErrorResponse) => {
          this.status.set('error');
          this.serverError.set(
            e.status === 429
              ? $localize`Poslali ste više poruka u kratkom roku. Pokušajte ponovo za nekoliko minuta.`
              : e.status === 400
                ? $localize`Proverite unete podatke i pokušajte ponovo.`
                : $localize`Poruka trenutno nije poslata. Pokušajte ponovo ili nam pišite direktno na email.`,
          );
        },
      });
  }

  protected reset(): void {
    this.form.reset({ topic: 'OPSTE' });
    this.submitted.set(false);
    this.renderedAt = Date.now();
    this.status.set('idle');
  }
}
