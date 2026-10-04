import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { Transporter } from 'nodemailer';
import type { EnvVars } from '../config/env.validation.js';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly from?: string;
  private readonly to?: string;

  constructor(config: ConfigService<EnvVars, true>) {
    const host = config.get('SMTP_HOST', { infer: true });
    const port = config.get('SMTP_PORT', { infer: true }) ?? 587;
    this.from = config.get('MAIL_FROM', { infer: true }) ?? config.get('SMTP_USER', { infer: true });
    this.to = config.get('MAIL_TO', { infer: true });
    this.transporter = host
      ? nodemailer.createTransport({
          host,
          port,
          secure: port === 465,
          auth: { user: config.get('SMTP_USER', { infer: true }), pass: config.get('SMTP_PASS', { infer: true }) },
        })
      : null;
    if (!this.transporter) this.logger.warn('SMTP nije podešen — poruke se samo upisuju u fajl i log (u redu za lokalni razvoj).');
  }

  /** Vraća true ako je mejl poslat. */
  async send(subject: string, text: string, replyTo: string): Promise<boolean> {
    if (!this.transporter || !this.to) {
      this.logger.log(`[bez SMTP-a] ${subject}\n${text}`);
      return false;
    }
    await this.transporter.sendMail({ from: this.from, to: this.to, subject, text, replyTo });
    return true;
  }
}
