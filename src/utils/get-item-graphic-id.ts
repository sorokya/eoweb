export function getItemGraphicId(
  itemId: number,
  graphicId: number,
  amount = 1,
): number {
  if (itemId === 1) {
    const offset =
      amount >= 100_000
        ? 4
        : amount >= 10_000
          ? 3
          : amount >= 100
            ? 2
            : amount >= 2
              ? 1
              : 0;
    return 269 + 2 * offset;
  }
  return graphicId * 2 - 1;
}

export function getItemGraphicPath(
  itemId: number,
  graphicId: number,
  amount = 1,
): string {
  const gfId = getItemGraphicId(itemId, graphicId, amount);
  return `/gfx/gfx023/${100 + gfId}.png`;
}
