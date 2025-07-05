export function capitalize(word: string): string {
  if (!word) {
    return '';
  }
  return `${word[0].toUpperCase()}${word.substring(1)}`;
}
