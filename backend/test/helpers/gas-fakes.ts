/**
 * Minimalne zamene za Google Apps Script servise — dovoljno da se google-apps-script/Code.gs
 * izvrši u Node-u (vm) i proveri bez pravog Google naloga i bez slanja mejlova.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

type Cell = unknown;

/** Ćelija sa formulom — u testovima ne sme da se pojavi iz korisničkog unosa. */
export class Formula {
  constructor(readonly text: string) {}
}

/** Kao Google Sheets: tekst sa apostrofom ostaje tekst, tekst sa „=" postaje formula. */
function store(v: Cell): Cell {
  if (typeof v !== 'string') return v;
  if (v.startsWith("'")) return v.slice(1);
  if (v.startsWith('=')) return new Formula(v);
  return v;
}

/**
 * Zamena za Googleove pozive koji samo formatiraju (boje, širine, validacije…): prihvata bilo koji poziv
 * i vraća sebe, pa lanci poput range.setFontWeight().setBackground() rade, a podaci se ne menjaju.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const chain: any = new Proxy(function () {}, {
  get: (_t, p) => (p === 'then' ? undefined : chain),
  apply: () => chain,
});

/** Pravi metodi rade sa podacima; sve ostalo (formatiranje) ide u `chain`. */
function withStubs<T extends object>(obj: T): T {
  return new Proxy(obj, { get: (t, p, r) => (p in t ? Reflect.get(t, p, r) : chain) });
}

export class FakeSheet {
  data: Cell[][] = [];
  constructor(private readonly name: string) {}

  getName() { return this.name; }
  getSheetId() { return 123; }
  getLastRow() { return this.data.length; }
  getLastColumn() { return this.data.reduce((m, r) => Math.max(m, r.length), 0); }
  getDataRange() { return this.getRange(1, 1, Math.max(this.getLastRow(), 1), Math.max(this.getLastColumn(), 1)); }
  appendRow(row: Cell[]) { this.data.push(row.map(store)); }
  getMaxRows() { return 1000; }
  getFilter() { return null; }
  getBandings() { return []; }
  getConditionalFormatRules() { return []; }
  getColumnGroupDepth() { return 0; }
  clear() { this.data = []; }

  /** Kao Sheet.moveColumns: destinationIndex je pozicija pre premeštanja; cela kolona (sa podacima) se seli. */
  moveColumns(range: { getColumn(): number; getNumColumns(): number }, destinationIndex: number) {
    const from = range.getColumn() - 1;
    const n = range.getNumColumns();
    const width = this.getLastColumn();
    const to = destinationIndex - 1 > from ? destinationIndex - 1 - n : destinationIndex - 1;
    for (const row of this.data) {
      while (row.length < width) row.push('');
      row.splice(to, 0, ...row.splice(from, n));
    }
  }

  getRange(row: number, col: number, numRows = 1, numCols = 1) {
    // Kao u Googleu, setValue/setValues vraćaju opseg, pa se pozivi mogu nadovezivati.
    const range = withStubs({
      getRow: () => row,
      getColumn: () => col,
      getNumColumns: () => numCols,
      getValues: () =>
        Array.from({ length: numRows }, (_, r) =>
          Array.from({ length: numCols }, (_, c) => this.data[row - 1 + r]?.[col - 1 + c] ?? ''),
        ),
      setValues: (values: Cell[][]) => {
        values.forEach((vr, r) => vr.forEach((v, c) => this.set(row + r, col + c, v)));
        return range;
      },
      setValue: (v: Cell) => {
        this.set(row, col, v);
        return range;
      },
    });
    return range;
  }

  private set(row: number, col: number, v: Cell) {
    while (this.data.length < row) this.data.push([]);
    const r = this.data[row - 1];
    while (r.length < col) r.push('');
    r[col - 1] = store(v);
  }
}

export interface SentMail {
  to: string;
  subject: string;
  body: string;
  htmlBody?: string;
  replyTo?: string;
  name?: string;
}

export interface GasEnv {
  ctx: vm.Context;
  sheets: Map<string, FakeSheet>;
  outbox: SentMail[];
  props: Map<string, string>;
  /** Vrati true da sendEmail baci grešku (npr. za proveru ponašanja kad mejl ne prođe). */
  failMail: (m: SentMail) => boolean;
  get<T = unknown>(expr: string): T;
}

function formatDate(date: Date, tz: string, fmt: string): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const p = (t: string) => parts.find((x) => x.type === t)?.value ?? '';
  return fmt.replace('yyyy', p('year')).replace('MM', p('month')).replace('dd', p('day')).replace('HH', p('hour')).replace('mm', p('minute'));
}

export function loadAppsScript(): GasEnv {
  const code = readFileSync(join(import.meta.dirname, '../../../google-apps-script/Code.gs'), 'utf8');
  const sheets = new Map<string, FakeSheet>();
  const props = new Map<string, string>();
  const env = { sheets, outbox: [] as SentMail[], props, failMail: (_m: SentMail) => false } as GasEnv;

  const spreadsheet = {
    getSheetByName: (n: string) => (sheets.has(n) ? withStubs(sheets.get(n)!) : null),
    insertSheet: (n: string) => {
      sheets.set(n, new FakeSheet(n));
      return withStubs(sheets.get(n)!);
    },
    getUrl: () => 'https://docs.google.com/spreadsheets/d/test',
    getSpreadsheetTimeZone: () => 'Europe/Ljubljana',
  };
  const globals = {
    // Isti Date kao u testovima, da `instanceof Date` u skripti radi i za datume iz testa.
    Date,
    console: { log: () => {}, warn: () => {}, error: () => {} },
    SpreadsheetApp: withStubs({ getActiveSpreadsheet: () => spreadsheet, openById: () => spreadsheet, flush: () => {} }),
    LockService: { getScriptLock: () => ({ tryLock: () => true, waitLock: () => {}, releaseLock: () => {} }) },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (k: string) => props.get(k) ?? null,
        setProperty: (k: string, v: string) => props.set(k, v),
      }),
    },
    MailApp: {
      sendEmail: (m: SentMail) => {
        if (env.failMail(m)) throw new Error('Service invoked too many times');
        env.outbox.push(m);
      },
    },
    ContentService: {
      MimeType: { JSON: 'JSON' },
      createTextOutput: (content: string) => ({ content, setMimeType() { return this; } }),
    },
    Utilities: { formatDate, getUuid: () => crypto.randomUUID() },
  };
  env.ctx = vm.createContext(globals);
  vm.runInContext(code, env.ctx, { filename: 'Code.gs' });
  env.get = <T>(expr: string) => vm.runInContext(expr, env.ctx) as T;
  return env;
}
