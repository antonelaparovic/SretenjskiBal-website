import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvVars } from '../config/env.validation.js';
import { AppsScriptStore } from './apps-script.store.js';
import { LocalReservationStore } from './local.store.js';
import { RESERVATION_STORE, ReservationStore, UnconfiguredStore } from './reservation-store.js';
import { ReservationsController } from './reservations.controller.js';
import { ReservationsService } from './reservations.service.js';

function createStore(config: ConfigService<EnvVars, true>): ReservationStore {
  const logger = new Logger('Rezervacije');
  const url = config.get('APPS_SCRIPT_URL', { infer: true });
  if (url) {
    return new AppsScriptStore(url, config.get('APPS_SCRIPT_SECRET', { infer: true }) ?? '', config.get('APPS_SCRIPT_TIMEOUT_MS', { infer: true }));
  }
  if (config.get('NODE_ENV', { infer: true }) === 'production') {
    logger.error('APPS_SCRIPT_URL nije podešen — rezervacije su zatvorene dok se ne poveže Google tabela.');
    return new UnconfiguredStore();
  }
  const file = config.get('RESERVATIONS_DEV_FILE', { infer: true });
  logger.warn(`APPS_SCRIPT_URL nije podešen — rezervacije se lokalno upisuju u ${file} (samo za razvoj).`);
  return new LocalReservationStore(file);
}

@Module({
  controllers: [ReservationsController],
  providers: [
    ReservationsService,
    { provide: RESERVATION_STORE, inject: [ConfigService], useFactory: createStore },
  ],
})
export class ReservationsModule {}
