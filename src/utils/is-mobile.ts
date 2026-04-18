export function isMobile(): boolean {
  return window.matchMedia('(pointer: coarse)').matches;
}
