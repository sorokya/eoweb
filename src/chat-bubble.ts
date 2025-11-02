import type { Vector2 } from './vector';

const softLimit = 100;
const hardLimit = 150;
const padding = 6;
const lineHeight = 12;
const radius = 6;
const triangleHeight = 15;
const triangleWidth = 10;

export class ChatBubble {
  message: string;
  lines: string[] = [];
  width: number;
  height: number;
  ticks: number;

  constructor(message: string) {
    this.message = message;
    // https://discord.com/channels/723989119503696013/787685796055482368/1039092169937530890
    this.ticks = 24 + Math.floor(message.length / 3);
  }

  tick() {
    this.ticks = Math.max(this.ticks - 1, 0);
  }

  render(position: Vector2, ctx: CanvasRenderingContext2D) {
    ctx.font = '10pt w95fa';
    ctx.globalAlpha = 0.5;

    if (!this.lines.length) {
      this.lines = wrapText(ctx, this.message);
      this.width =
        Math.min(
          hardLimit,
          Math.max(...this.lines.map((line) => ctx.measureText(line).width)),
        ) +
        padding * 2;
      this.height = lineHeight * this.lines.length + padding * 2 - 5;
    }

    const x = position.x - (this.width >> 1);
    const y = position.y - this.height - triangleHeight;

    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + this.width - radius, y);
    ctx.quadraticCurveTo(x + this.width, y, x + this.width, y + radius);
    ctx.lineTo(x + this.width, y + this.height - radius);
    ctx.quadraticCurveTo(
      x + this.width,
      y + this.height,
      x + this.width - radius,
      y + this.height,
    );

    const midX = x + this.width / 2;
    ctx.lineTo(midX + triangleWidth / 2, y + this.height);
    ctx.lineTo(midX, y + this.height + triangleWidth);
    ctx.lineTo(midX - triangleWidth / 2, y + this.height);

    ctx.lineTo(x + radius, y + this.height);
    ctx.quadraticCurveTo(x, y + this.height, x, y + this.height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();

    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'black';
    ctx.globalAlpha = 1.0;
    this.lines.forEach((line, i) => {
      ctx.fillText(
        line,
        Math.floor(x + padding),
        Math.floor(y + padding + 2 + (i + 0.8) * lineHeight - 4),
      );
    });
  }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string) {
  const words = text.split(' ');
  const lines = [];
  let line = '';

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    const width = ctx.measureText(testLine).width;

    if (width <= softLimit) {
      line = testLine;
    } else if (ctx.measureText(word).width > hardLimit) {
      if (line) {
        lines.push(line);
        line = '';
      }

      const hyphenated = hyphenateWord(ctx, word);
      lines.push(...hyphenated);
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }

  if (line) lines.push(line);
  return lines;
}

function hyphenateWord(ctx: CanvasRenderingContext2D, word: string) {
  const parts = [];
  let piece = '';

  for (const char of word) {
    const testPiece = piece + char;
    if (
      ctx.measureText(`${testPiece}-`).width > hardLimit &&
      piece.length > 0
    ) {
      parts.push(`${piece}-`);
      piece = char;
    } else {
      piece += char;
    }
  }
  if (piece) parts.push(piece);
  return parts;
}
