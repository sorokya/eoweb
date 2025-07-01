function getRandomInt(max: number): number {
  return Math.floor(Math.random() * max);
}

// Shamelessly ripped from EndlessClient :^)
export function makeDrunk(input: string): string {
  let ret = input.split('');

  // Pass 1
  for (let i = 0; i < ret.length; i++) {
    const c = ret[i];
    const lower = c.toLowerCase();

    if (lower === 'e' || lower === 'a') {
      if (getRandomInt(100) < 70) {
        ret.splice(i + 1, 0, 'j');
        i++; // skip inserted char
      }
    } else if (lower === 'u' || lower === 'o') {
      if (getRandomInt(100) < 70) {
        ret.splice(i + 1, 0, 'w');
        i++;
      }
    } else if (c === 'i') {
      if (getRandomInt(100) < 40) {
        ret.splice(i + 1, 0, 'u');
        i++;
      }
    } else if (c !== ' ' && getRandomInt(100) < 40) {
      ret.splice(i + 1, 0, c);
      i++;
    }
  }

  // Pass 2
  for (let i = 0; i < ret.length; i++) {
    const c = ret[i].toLowerCase();
    if ('aeiou'.includes(c)) {
      if (getRandomInt(12) === 6) {
        ret[i] = '*';
      }
    }
  }

  // Pass 3
  for (let i = 0; i < ret.length; i++) {
    if (ret[i] === ' ' && getRandomInt(100) < 30) {
      ret.splice(i + 1, 0, '*', 'h', 'i', 'c', '*', ' ');
      i += 6;
    }
  }

  // Trim to 128 characters, add ".." if longer
  if (ret.length > 128) {
    ret = ret.slice(0, 126);
    ret.push('.', '.');
  }

  return ret.join('');
}
