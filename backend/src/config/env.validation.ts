import { plainToInstance } from 'class-transformer';
import { IsEmail, IsEnum, IsInt, IsOptional, IsString, IsUrl, Max, Min, validateSync } from 'class-validator';

enum NodeEnv {
  development = 'development',
  production = 'production',
  test = 'test',
}

/**
 * Sva podešavanja iz .env fajla; aplikacija ne startuje ako je nešto pogrešno.
 * Brojevi moraju imati eksplicitan tip (`: number`), inače se tekst iz .env ne pretvara u broj.
 */
export class EnvVars {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.development;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT: number = 3000;

  /** Zarezom odvojene adrese sajta kojima je dozvoljeno da šalju formu. */
  @IsString()
  CORS_ORIGINS = 'http://localhost:4200,http://localhost:4000';

  /** Fajl u koji se, kao rezervna kopija, upisuje svaka poruka. */
  @IsString()
  MESSAGES_FILE = 'data/poruke.jsonl';

  // SMTP — odakle se šalju mejlovi (npr. mejl sa hostinga ili Gmail sa „app password").
  @IsOptional() @IsString() SMTP_HOST?: string;
  @IsOptional() @IsInt() SMTP_PORT?: number;
  @IsOptional() @IsString() SMTP_USER?: string;
  @IsOptional() @IsString() SMTP_PASS?: string;
  @IsOptional() @IsString() MAIL_FROM?: string;

  /** Adresa na koju stižu poruke sa sajta. */
  @IsOptional() @IsEmail() MAIL_TO?: string;

  // Rezervacije karata — Google Apps Script web aplikacija vezana za tabelu (docs/REZERVACIJE.md).
  /** URL web aplikacije (…/exec). Bez njega: lokalno se upisuje u fajl, u produkciji su rezervacije zatvorene. */
  @IsOptional() @IsUrl({ protocols: ['https'], require_protocol: true }) APPS_SCRIPT_URL?: string;
  /** Tajni ključ iz tabele (meni Sretenjski bal → Prikaži ključ za sajt). */
  @IsOptional() @IsString() APPS_SCRIPT_SECRET?: string;

  @IsInt()
  @Min(5000)
  @Max(120000)
  APPS_SCRIPT_TIMEOUT_MS: number = 40000;

  /** Lokalni fajl za rezervacije dok Apps Script nije podešen (samo razvoj). */
  @IsString()
  RESERVATIONS_DEV_FILE = 'data/rezervacije-dev.jsonl';
}

export function validateEnv(config: Record<string, unknown>): EnvVars {
  // Prazan red u .env (npr. `MAIL_TO=`) znači „nije podešeno", isto kao da reda nema.
  const filled = Object.fromEntries(Object.entries(config).filter(([, v]) => v !== ''));
  const parsed = plainToInstance(EnvVars, filled, { enableImplicitConversion: true });
  const errors = validateSync(parsed);
  if (errors.length) {
    const list = errors.map((e) => `${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`);
    throw new Error(`Neispravna podešavanja u .env:\n  ${list.join('\n  ')}`);
  }
  if (parsed.NODE_ENV === NodeEnv.production && (!parsed.SMTP_HOST || !parsed.MAIL_TO)) {
    throw new Error('U produkciji moraju biti podešeni SMTP_HOST i MAIL_TO, inače poruke ne bi stizale.');
  }
  if (parsed.APPS_SCRIPT_URL && (!parsed.APPS_SCRIPT_SECRET || parsed.APPS_SCRIPT_SECRET.length < 32)) {
    throw new Error('Uz APPS_SCRIPT_URL mora biti podešen i APPS_SCRIPT_SECRET (ključ iz tabele, najmanje 32 znaka).');
  }
  return parsed;
}
