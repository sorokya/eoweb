import { StaticAtlasEntryType } from './atlas';
import type { Client } from './client';
import type { Font } from './fonts/base';
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

  constructor(message: string) {
    this.message = message;
    // https://discord.com/channels/723989119503696013/787685796055482368/1039092169937530890
    this.ticks = 24 + Math.floor(message.length / 3);

    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
  }

  tick() {
    this.ticks = Math.max(this.ticks - 1, 0);
  }

  render(client: Client, position: Vector2, ctx: CanvasRenderingContext2D) {
    const frame = client.atlas.getStaticEntry(StaticAtlasEntryType.Sans11);
    if (!frame) {
      return;
    }

    const atlas = client.atlas.getAtlas(frame.atlasIndex);
    if (!atlas) {
      return;
    }

    if (!this.rendered) {
      const lines = wrapText(client.sans11, this.message);
      const width =
        Math.min(
          hardLimit,
          Math.max(...lines.map((line) => measureText(client.sans11, line))),
        ) +
        padding * 2;
      const height = lineHeight * lines.length + padding * 2 - 5;

      this.canvas.width = width;
      this.canvas.height = height + triangleHeight;

      const x = 0; //position.x - (this.width >> 1);
      const y = 0; //position.y - this.height - triangleHeight;

      this.ctx.beginPath();
      this.ctx.moveTo(x + radius, y);
      this.ctx.lineTo(x + width - radius, y);
      this.ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
      this.ctx.lineTo(x + width, y + height - radius);
      this.ctx.quadraticCurveTo(
        x + width,
        y + height,
        x + width - radius,
        y + height,
      );

      const midX = x + width / 2;
      this.ctx.lineTo(midX + triangleWidth / 2, y + height);
      this.ctx.lineTo(midX, y + height + triangleWidth);
      this.ctx.lineTo(midX - triangleWidth / 2, y + height);

      this.ctx.lineTo(x + radius, y + height);
      this.ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
      this.ctx.lineTo(x, y + radius);
      this.ctx.quadraticCurveTo(x, y, x + radius, y);
      this.ctx.closePath();

      this.ctx.fillStyle = 'white';
      this.ctx.strokeStyle = 'black';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
      this.ctx.globalAlpha = 0.65;
      this.ctx.fill();
      this.ctx.globalAlpha = 1.0;

      const tmpCanvas = document.createElement('canvas');
      tmpCanvas.width = width;
      tmpCanvas.height = height;
      const tmpCtx = tmpCanvas.getContext('2d');

      let charY = 0;
      for (const line of lines) {
        const chars = line
          .split('')
          .map((c: string) => client.sans11.getCharacter(c.charCodeAt(0)));
        let charX = 0;

        for (const char of chars) {
          tmpCtx.drawImage(
            atlas,
            frame.x + char.x,
            frame.y + char.y,
            char.width,
            char.height,
            Math.floor(charX),
            Math.floor(charY),
            char.width,
            char.height,
          );
          charX += char.width;
        }
        charY += lineHeight;
      }

      tmpCtx.globalCompositeOperation = 'source-in';
      tmpCtx.fillStyle = '#000';
      tmpCtx.fillRect(0, 0, tmpCanvas.width, tmpCanvas.height);

      this.ctx.drawImage(tmpCanvas, padding, 4);
      this.rendered = true;
    }

    ctx.drawImage(
      this.canvas,
      Math.floor(position.x - this.canvas.width / 2),
      Math.floor(position.y - this.canvas.height),
    );
  }
}

function wrapText(font: Font, text: string) {
  const words = text.split(' ');
  const lines = [];
  let line = '';

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    const width = measureText(font, testLine);

    if (width <= softLimit) {
      line = testLine;
    } else if (measureText(font, word) > hardLimit) {
      if (line) {
        lines.push(line);
        line = '';
      }

      const hyphenated = hyphenateWord(font, word);
      lines.push(...hyphenated);
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }

  if (line) lines.push(line);
  return lines;
}

function hyphenateWord(font: Font, word: string) {
  const parts = [];
  let piece = '';

  for (const char of word) {
    const testPiece = piece + char;
    if (measureText(font, `${testPiece}-`) > hardLimit && piece.length > 0) {
      parts.push(`${piece}-`);
      piece = char;
    } else {
      piece += char;
    }
  }
  if (piece) parts.push(piece);
  return parts;
}

function measureText(font: Font, text: string): number {
  const chars = text.split('').map((c) => font.getCharacter(c.charCodeAt(0)));
  return chars.reduce((sum, c) => sum + (c ? c.width : 0), 0);
}
