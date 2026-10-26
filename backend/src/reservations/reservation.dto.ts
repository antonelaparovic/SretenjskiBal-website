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
  @Transform(trim)
  @IsString()
  @Length(2, 40)
  taxId?: string;
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

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(2000)
  note?: string;

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
