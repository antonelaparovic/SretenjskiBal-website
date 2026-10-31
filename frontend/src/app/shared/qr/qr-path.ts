import qrcode from 'qrcode-generator';

export interface QrPath {
  /** Broj modula po strani (bez tihe zone). */
  size: number;
  /** SVG putanja svih tamnih modula, u koordinatama modula. */
  d: string;
}

/** QR kod kao jedna SVG putanja — crta se bez innerHTML-a, u bilo kojoj boji i veličini. */
export function qrPath(text: string): QrPath {
  const qr = qrcode(0, 'M');
  qr.addData(text);
  qr.make();
  const size = qr.getModuleCount();
  let d = '';
  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      if (qr.isDark(r, c)) d += `M${c},${r}h1v1h-1z`;
    }
  }
  return { size, d };
}
