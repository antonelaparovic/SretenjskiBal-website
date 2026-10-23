import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { validateEnv } from '../src/config/env.validation.js';

describe('validateEnv', () => {
  it('brojeve iz .env (tekst) pretvara u brojeve', () => {
    const env = validateEnv({ PORT: '3000', SMTP_PORT: '587', APPS_SCRIPT_TIMEOUT_MS: '40000' });
    expect(env.PORT).toBe(3000);
    expect(env.SMTP_PORT).toBe(587);
    expect(env.APPS_SCRIPT_TIMEOUT_MS).toBe(40000);
  });

  it('prazni redovi iz .env.example znače „nije podešeno"', () => {
    const env = validateEnv({ PORT: '3000', MAIL_TO: '', SMTP_HOST: '', SMTP_PORT: '587', APPS_SCRIPT_URL: '', APPS_SCRIPT_SECRET: '' });
    expect(env.MAIL_TO).toBeUndefined();
    expect(env.APPS_SCRIPT_URL).toBeUndefined();
  });

  it('uz APPS_SCRIPT_URL traži i ključ', () => {
    expect(() => validateEnv({ APPS_SCRIPT_URL: 'https://script.google.com/macros/s/x/exec' })).toThrow(/APPS_SCRIPT_SECRET/);
    expect(validateEnv({ APPS_SCRIPT_URL: 'https://script.google.com/macros/s/x/exec', APPS_SCRIPT_SECRET: 'k'.repeat(64) }).APPS_SCRIPT_SECRET).toHaveLength(64);
  });
});
