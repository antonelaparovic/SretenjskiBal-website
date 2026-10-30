import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

/** Šifre su iste na sajtu, ovde i u Apps Scriptu (tamo su i nazivi koji se vide u tabeli). */
export const TICKET_TYPES = ['SVECANA', 'GALERIJA'] as const;
export type TicketTypeCode = (typeof TICKET_TYPES)[number];

export const RESERVATION_SOURCES = ['PREPORUKA', 'DRUSTVENE_MREZE', 'RANIJI_DOLAZAK', 'SAJT', 'EMAIL', 'DRUGO'] as const;
export type ReservationSource = (typeof RESERVATION_SOURCES)[number];

/** SI = firma iz Slovenije, EU = druga država EU, OTHER = izvan EU. Od ovoga zavisi kako se na fakturi obračunava DDV. */
export const COMPANY_COUNTRIES = ['SI', 'EU', 'OTHER'] as const;
export type CompanyCountry = (typeof COMPANY_COUNTRIES)[number];

/**
 * Format poreskog broja po poreklu firme (ista pravila su u formi i u Apps Scriptu):
 * SI: davčna številka = 8 cifara, uz opcioni prefiks SI (ID za DDV);
 * EU: ID za DDV = dvoslovni kod države + 2-12 znakova (npr. HR12345678901, ATU12345678);
 * OTHER: slobodan unos.
 */
export function isValidTaxId(country: CompanyCountry | undefined, taxId: string | undefined): boolean {
  const v = (taxId ?? '').replace(/[\s.-]/g, '').toUpperCase();
  if (country === 'SI') return /^(SI)?\d{8}$/.test(v);
  if (country === 'EU') return /^[A-Z]{2}[0-9A-Z+*]{2,12}$/.test(v) && !v.startsWith('SI');
  return (taxId ?? '').trim().length >= 2 && (taxId ?? '').trim().length <= 40;
}

export const LOCALES = ['sr', 'sl', 'en'] as const;
export type Locale = (typeof LOCALES)[number];

/** Tehnička zaštita od zloupotrebe forme (nije prodajno ograničenje); ista vrednost je u Apps Scriptu. */
export const MAX_TICKETS_PER_RESERVATION = 100;

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

/** Jedna stavka: tip karte i broj karata. Za sada jedna stavka po rezervaciji; lista omogućava kasnije kombinovanje tipova. */
export class TicketLineDto {
  @IsIn(TICKET_TYPES)
  ticketType!: TicketTypeCode;

  @IsInt()
  @Min(1)
  @Max(MAX_TICKETS_PER_RESERVATION)
  count!: number;
}

export class InvoiceDto {
  @IsBoolean()
  needed!: boolean;

  @ValidateIf((o: InvoiceDto) => o.needed)
  @Transform(trim)
  @IsString()
  @Length(2, 200)
  companyName?: string;

  @ValidateIf((o: InvoiceDto) => o.needed)
  @Transform(trim)
  @IsString()
  @Length(2, 300)
  companyAddress?: string;

  @ValidateIf((o: InvoiceDto) => o.needed)
  @IsIn(COMPANY_COUNTRIES)
  companyCountry?: CompanyCountry;

  @ValidateIf((o: InvoiceDto) => o.needed)
  @Transform(trim)
  @IsString()
  @Length(2, 40)
  taxId?: string;

  /** Samo za firme iz Slovenije: da li je firma obveznik DDV-a. */
  @ValidateIf((o: InvoiceDto) => o.needed && o.companyCountry === 'SI')
  @IsBoolean()
  vatPayer?: boolean;
}

export class UtmDto {
  @IsOptional() @IsString() @MaxLength(100) source?: string;
  @IsOptional() @IsString() @MaxLength(100) medium?: string;
  @IsOptional() @IsString() @MaxLength(100) campaign?: string;
  @IsOptional() @IsString() @MaxLength(100) term?: string;
  @IsOptional() @IsString() @MaxLength(100) content?: string;
}

export class CreateReservationDto {
  /** Pravi ga browser jednom po rezervaciji; isti ID pri ponovnom slanju sprečava duplikat. */
  @IsUUID()
  requestId!: string;

  @Transform(trim)
  @IsString()
  @Length(2, 120)
  fullName!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(254)
  email!: string;

  /** Cifre, razmaci, + ( ) / . - i najmanje 6 cifara. */
  @Transform(trim)
  @IsString()
  @Matches(/^(?=(?:\D*\d){6})[+0-9 ()/.-]{6,30}$/)
  phone!: string;

  /** Karte glase na osobu koja rezerviše (fullName). */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(TICKET_TYPES.length)
  @ValidateNested({ each: true })
  @Type(() => TicketLineDto)
  tickets!: TicketLineDto[];

  @ValidateNested()
  @Type(() => InvoiceDto)
  invoice!: InvoiceDto;

  /** Posebna ishrana i alergije — posebna kolona u tabeli, zbog kuhinje. */
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  diet?: string;

  /**
   * Izričita saglasnost za podatke o ishrani i alergijama (podaci o zdravlju — posebna kategorija, član 9 GDPR).
   * Obavezna (true) kad je `diet` popunjen; proverava se u servisu i u Apps Scriptu.
   */
  @IsBoolean()
  dietConsent!: boolean;

  /** Verzija politike privatnosti koju je gost video pri slanju — dokaz o obaveštavanju i saglasnosti. */
  @IsString()
  @Matches(/^[0-9A-Za-z.-]{1,20}$/)
  privacyPolicyVersion!: string;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  note?: string;

  /** Imena ostalih gostiju (broj ulaznica − 1); upisuju se na početak napomene. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(99)
  @IsString({ each: true })
  @Length(2, 120, { each: true })
  guestNames?: string[];

  @IsIn(RESERVATION_SOURCES)
  source!: ReservationSource;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(200)
  sourceOther?: string;

  /** Aktivni jezik sajta u trenutku slanja. */
  @IsIn(LOCALES)
  locale!: Locale;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  pageUrl?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UtmDto)
  utm?: UtmDto;

  /** Skriveno polje — ljudi ga ne vide, botovi ga popune. */
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;

  /** Koliko je ms prošlo od prikaza forme do slanja. */
  @IsOptional()
  @IsInt()
  @Min(0)
  elapsedMs?: number;
}
