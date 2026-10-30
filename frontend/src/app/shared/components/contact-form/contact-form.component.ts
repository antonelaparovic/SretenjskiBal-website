import { ChangeDetectionStrategy, Component, inject, input, signal, effect, viewChild } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ContactTopic } from '../../../core/models/content.models';
import { FormsApiService, ScriptError } from '../../../core/services/forms-api.service';
import { TurnstileComponent } from '../turnstile/turnstile.component';

type Status = 'idle' | 'sending' | 'sent' | 'error';

export const CONTACT_TOPICS: { value: ContactTopic; label: string }[] = [
  { value: 'OPSTE', label: $localize`Opšti upit` },
  { value: 'PARTNERSTVO', label: $localize`Partnerstvo i sponzorstvo` },
  { value: 'MEDIJI', label: $localize`Mediji` },
  { value: 'SARADNJA', label: $localize`Saradnja i nastup` },
];

@Component({
  selector: 'app-contact-form',
  imports: [ReactiveFormsModule, TurnstileComponent],
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
  /** Token Turnstile provere za sledeće slanje. */
  protected readonly captcha = signal<string | null>(null);
  protected readonly captchaFailed = signal(false);
  private readonly api = inject(FormsApiService);
  private readonly turnstile = viewChild(TurnstileComponent);
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
    const captcha = this.captcha();
    if (!captcha) {
      this.serverError.set(
        this.captchaFailed()
          ? $localize`Provera da niste robot nije mogla da se učita. Proverite internet vezu ili isključite blokator reklama za ovaj sajt, pa osvežite stranicu.`
          : $localize`Još trenutak — proveravamo da niste robot. Pokušajte ponovo za nekoliko sekundi.`,
      );
      return;
    }
    this.status.set('sending');
    this.api
      .sendContact({ ...this.form.getRawValue(), elapsedMs: Date.now() - this.renderedAt }, captcha)
      .subscribe({
        next: () => this.status.set('sent'),
        error: (e: unknown) => {
          this.status.set('error');
          this.turnstile()?.reset(); // token važi za jedno slanje
          const code = e instanceof ScriptError ? e.code : null;
          this.serverError.set(
            code === 'BUSY'
              ? $localize`Trenutno je velika gužva. Pokušajte ponovo za minut.`
              : code === 'CAPTCHA_FAILED'
                ? $localize`Provera da niste robot nije prošla. Pokušajte ponovo za nekoliko sekundi.`
                : code === 'INVALID' || code === 'REJECTED'
                  ? $localize`Proverite unete podatke i pokušajte ponovo.`
                  : $localize`Poruka trenutno nije poslata. Pokušajte ponovo ili nam pišite direktno na email.`,
          );
        },
      });
  }

  protected reset(): void {
    this.captcha.set(null);
    this.form.reset({ topic: 'OPSTE' });
    this.submitted.set(false);
    this.renderedAt = Date.now();
    this.status.set('idle');
  }
}
