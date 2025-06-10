export function padWithZeros(value: string | number, length: number): string {
  return value.toString().padStart(length, '0');
}
