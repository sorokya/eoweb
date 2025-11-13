import { COLORS } from './consts';
import { type Font, TextAlign } from './fonts/base';
import type { Vector2 } from './vector';

const softLimit = 100;
const hardLimit = 150;
const padding = 6;
const lineHeight = 12;
const radius = 6;
const triangleHeight = 6;
const triangleWidth = 3;

export class ChatBubble {
  ticks: number;
  private message: string;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private rendered = false;
  private font: Font;
  private foreground: string;
  private background: string;

  constructor(
    font: Font,
    message: string,
    foreground = COLORS.ChatBubble,
    background = COLORS.ChatBubbleBackground,
  ) {
    this.font = font;
    this.message = message;
    this.foreground = foreground;
    this.background = background;
    // https://discord.com/channels/723989119503696013/787685796055482368/1039092169937530890
    this.ticks = 24 + Math.floor(message.length / 3);
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
  }

  tick() {
    this.ticks = Math.max(this.ticks - 1, 0);
  }

  render(position: Vector2, ctx: CanvasRenderingContext2D) {
    if (!this.rendered) {
      const lines = this.wrapText(this.message);
      const width =
        Math.min(
          hardLimit,
          Math.max(...lines.map((line) => this.font.measureText(line).width)),
        ) +
        padding * 2;
      const height = lineHeight * lines.length + padding * 2 - 5;

      this.canvas.width = width;
      this.canvas.height = height + triangleHeight;

      this.ctx.beginPath();
      this.ctx.moveTo(radius, 0);
      this.ctx.lineTo(width - radius, 0);
      this.ctx.quadraticCurveTo(width, 0, width, radius);
      this.ctx.lineTo(width, height - radius);
      this.ctx.quadraticCurveTo(width, height, width - radius, height);

      const halfWidth = Math.floor(width >> 1);
      const halfTriangleWidth = triangleWidth >> 1;
      this.ctx.lineTo(halfWidth + halfTriangleWidth, height);
      this.ctx.lineTo(halfWidth, height + triangleHeight);
      this.ctx.lineTo(halfWidth - halfTriangleWidth, height);

      this.ctx.lineTo(radius, height);
      this.ctx.quadraticCurveTo(0, height, 0, height - radius);
      this.ctx.lineTo(0, radius);
      this.ctx.quadraticCurveTo(0, 0, radius, 0);
      this.ctx.closePath();

      this.ctx.fillStyle = this.background;
      this.ctx.strokeStyle = this.foreground;
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
      this.ctx.globalAlpha = 0.65;
      this.ctx.fill();
      this.ctx.globalAlpha = 1.0;

      for (const [index, line] of lines.entries()) {
        this.font.render(
          this.ctx,
          line,
          { x: halfWidth, y: 3 + index * lineHeight },
          this.foreground,
          TextAlign.CenterHorizontal,
        );
      }

      this.rendered = true;
    }

    ctx.drawImage(
      this.canvas,
      Math.floor(position.x - (this.canvas.width >> 1)),
      Math.floor(position.y - this.canvas.height),
    );
  }

  private wrapText(text: string) {
    const words = text.split(' ');
    const lines = [];
    let line = '';

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const { width } = this.font.measureText(testLine);

      if (width <= softLimit) {
        line = testLine;
      } else if (this.font.measureText(word).width > hardLimit) {
        if (line) {
          lines.push(line);
          line = '';
        }

        const hyphenated = this.hyphenateWord(word);
        lines.push(...hyphenated);
      } else {
        if (line) lines.push(line);
        line = word;
      }
    }

    if (line) lines.push(line);
    return lines;
  }

  private hyphenateWord(word: string) {
    const parts = [];
    let piece = '';

    for (const char of word) {
      const testPiece = piece + char;
      if (
        this.font.measureText(`${testPiece}-`).width > hardLimit &&
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
}
