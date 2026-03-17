const BANGLA_TO_ROMAN: Record<string, string> = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4',
  '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
};

export function normalizeBanglaDigits(text: string): string {
  return text.split('').map((ch) => BANGLA_TO_ROMAN[ch] ?? ch).join('');
}

export function extractBondNumbers(rawText: string): string[] {
  const normalized = normalizeBanglaDigits(rawText);
  // Use negative lookaround instead of \b — works even when digits are adjacent to Bangla chars
  // Bangladesh prize bonds are 7 digits; accept 6–8 to handle OCR noise
  const matches = normalized.match(/(?<!\d)\d{6,8}(?!\d)/g) ?? [];
  // Normalise to 7 digits: pad short ones, trim long ones only if first/last digit looks like noise
  const result = matches
    .map((n) => n.padStart(7, '0').slice(-7))
    .filter((n) => n.length === 7);
  return [...new Set(result)];
}
