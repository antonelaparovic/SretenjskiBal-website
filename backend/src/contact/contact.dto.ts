import { Transform } from 'class-transformer';
import { Equals, IsBoolean, IsEmail, IsIn, IsInt, IsOptional, IsString, Length, MaxLength, Min } from 'class-validator';

export const CONTACT_TOPICS = {
  OPSTE: 'Opšti upit',
  PARTNERSTVO: 'Partnerstvo i sponzorstvo',
  KARTE: 'Karte',
  MEDIJI: 'Mediji',
  SARADNJA: 'Saradnja i nastup',
} as const;

export type ContactTopic = keyof typeof CONTACT_TOPICS;

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

export class CreateContactDto {
  @Transform(trim)
  @IsString()
  @Length(1, 80)
  firstName!: string;

  @Transform(trim)
  @IsString()
  @Length(1, 80)
  lastName!: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @IsIn(Object.keys(CONTACT_TOPICS))
  topic!: ContactTopic;

  @Transform(trim)
  @IsString()
  @Length(10, 4000)
  message!: string;

  @IsBoolean()
  @Equals(true, { message: 'Potrebna je saglasnost sa politikom privatnosti.' })
  consent!: boolean;

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
