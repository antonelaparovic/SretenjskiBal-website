import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

@SkipThrottle()
@Controller('health')
export class HealthController {
  /** GET /api/health — za proveru da li API radi. */
  @Get()
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}
