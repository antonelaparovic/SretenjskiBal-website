import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';
import { MailService } from '../mail/mail.service.js';
import { cleanText } from '../common/text.js';
import type { EnvVars } from '../config/env.validation.js';
import { CONTACT_TOPICS, CreateContactDto } from './contact.dto.js';

/** Brže od ovoga čovek ne popuni formu — verovatno bot. */
const MIN_FILL_MS = 2500;

@Injectable()
export class ContactService {
  private readonly logger = new Logger(ContactService.name);
  private readonly file: string;

  constructor(
    private readonly mail: MailService,
    config: ConfigService<EnvVars, true>,
  ) {
    this.file = config.get('MESSAGES_FILE', { infer: true });
  }

  async handle(dto: CreateContactDto): Promise<void> {
    // Botu vraćamo isti uspešan odgovor, ali ništa ne šaljemo.
    if (dto.website || (dto.elapsedMs !== undefined && dto.elapsedMs < MIN_FILL_MS)) {
      this.logger.warn('Odbačena sumnjiva poruka (skriveno polje ili prebrzo slanje).');
      return;
    }

    const msg = {
      receivedAt: new Date().toISOString(),
      firstName: cleanText(dto.firstName),
      lastName: cleanText(dto.lastName),
      email: dto.email,
      topic: CONTACT_TOPICS[dto.topic],
      message: cleanText(dto.message, { multiline: true }),
    };

    // 1) Rezervna kopija u fajl — poruka se ne gubi ni ako mejl ne prođe.
    const saved = await this.saveCopy(msg);

    // 2) Mejl timu; „Odgovori" u mejl programu ide direktno pošiljaocu.
    try {
      await this.mail.send(
        `Sajt · ${msg.topic} · ${msg.firstName} ${msg.lastName}`,
        `${msg.firstName} ${msg.lastName} <${msg.email}>\nTema: ${msg.topic}\nPrimljeno: ${msg.receivedAt}\n\n${msg.message}`,
        msg.email,
      );
    } catch (err) {
      this.logger.error(`Mejl nije poslat: ${(err as Error).message}`);
      // Ako nema ni kopije ni mejla, korisnik mora da zna da poruka nije stigla.
      if (!saved) throw new ServiceUnavailableException('Poruka trenutno ne može da se pošalje.');
    }
  }

  private async saveCopy(msg: object): Promise<boolean> {
    try {
      await mkdir(dirname(this.file), { recursive: true });
      await appendFile(this.file, `${JSON.stringify(msg)}\n`, 'utf8');
      return true;
    } catch (err) {
      this.logger.error(`Kopija poruke nije upisana: ${(err as Error).message}`);
      return false;
    }
  }
}
