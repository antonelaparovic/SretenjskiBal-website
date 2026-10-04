import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CreateContactDto } from './contact.dto.js';
import { ContactService } from './contact.service.js';

@Controller('contact')
export class ContactController {
  constructor(private readonly contact: ContactService) {}

  /** POST /api/contact — najviše 5 poruka po IP adresi u 10 minuta. */
  @Post()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 10 * 60_000 } })
  async create(@Body() dto: CreateContactDto): Promise<{ ok: true }> {
    await this.contact.handle(dto);
    return { ok: true };
  }
}
