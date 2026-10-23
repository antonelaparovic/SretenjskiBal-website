import { Body, Controller, Get, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { CreateReservationDto } from './reservation.dto.js';
import type { BookingStatus } from './reservation-store.js';
import { ReservationCreated, ReservationsService } from './reservations.service.js';

@Controller('reservations')
export class ReservationsController {
  constructor(private readonly reservations: ReservationsService) {}

  /** GET /api/reservations/status — da li su rezervacije otvorene. */
  @Get('status')
  status(): Promise<BookingStatus> {
    return this.reservations.status();
  }

  /** POST /api/reservations — najviše 10 pokušaja po IP adresi u 10 minuta. */
  @Post()
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 10 * 60_000 } })
  create(@Body() dto: CreateReservationDto): Promise<ReservationCreated> {
    return this.reservations.create(dto);
  }
}
