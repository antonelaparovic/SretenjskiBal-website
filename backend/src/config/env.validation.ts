import { plainToInstance } from 'class-transformer';
import { IsEmail, IsEnum, IsInt, IsOptional, IsString, Max, Min, validateSync } from 'class-validator';

enum NodeEnv {
  development = 'development',
  production = 'production',
  test = 'test',
}

/** Sva podešavanja iz .env fajla; aplikacija ne startuje ako je nešto pogrešno. */
export class EnvVars {
  @IsEnum(NodeEnv)
  NODE_ENV: NodeEnv = NodeEnv.development;

  @IsInt()
  @Min(1)
  @Max(65535)
  PORT = 3000;

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
}

export function validateEnv(config: Record<string, unknown>): EnvVars {
  const parsed = plainToInstance(EnvVars, config, { enableImplicitConversion: true });
  const errors = validateSync(parsed);
  if (errors.length) {
    const list = errors.map((e) => `${e.property}: ${Object.values(e.constraints ?? {}).join(', ')}`);
    throw new Error(`Neispravna podešavanja u .env:\n  ${list.join('\n  ')}`);
  }
  if (parsed.NODE_ENV === NodeEnv.production && (!parsed.SMTP_HOST || !parsed.MAIL_TO)) {
    throw new Error('U produkciji moraju biti podešeni SMTP_HOST i MAIL_TO, inače poruke ne bi stizale.');
  }
  return parsed;
}
