export function normalizeSwedishPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('46')) return '+' + digits
  if (digits.startsWith('0')) return '+46' + digits.slice(1)
  return '+46' + digits
}
