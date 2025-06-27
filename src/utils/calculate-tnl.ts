const EXP_TABLE: number[] = [];

export function getExpForLevel(level: number): number {
  if (!EXP_TABLE.length) {
    fillExpTable();
  }

  return EXP_TABLE[level];
}

export function calculateTnl(experience: number): number {
  if (!EXP_TABLE.length) {
    fillExpTable();
  }

  const experienceRequired = EXP_TABLE.find((exp) => exp > experience);
  return experienceRequired - experience;
}

function fillExpTable() {
  for (let i = 0; i < 254; ++i) {
    EXP_TABLE.push(Math.round(i ** 3 * 133.1));
  }
}
