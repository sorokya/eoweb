const EXP_TABLE: number[] = [];

export function getExpForLevel(level: number): number {
  if (!EXP_TABLE.length) {
    fillExpTable();
  }

  return EXP_TABLE[level];
}

function fillExpTable() {
  for (let i = 0; i < 254; ++i) {
    EXP_TABLE.push(Math.round(i ** 3 * 133.1));
  }
}
