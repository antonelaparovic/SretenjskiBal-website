/**
 * Čisti tekst iz forme: uklanja HTML oznake i kontrolne znakove, sređuje razmake.
 * Poruke se šalju i čuvaju isključivo kao običan tekst.
 */
export function cleanText(input: string, { multiline = false } = {}): string {
  let s = input.normalize('NFC').replace(/<[^>]*>/g, '');
  s = multiline
    ? s
        .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
        .replace(/\r\n?/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
    : s.replace(/[\u0000-\u001F\u007F]/g, ' ').replace(/\s+/g, ' ');
  return s.trim();
}
