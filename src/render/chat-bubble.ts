import { COLORS } from '@/consts';
import type { Font } from '@/fonts';
import { Animation } from './animation';

const hardLimit = 150;
const padding = 6;
const lineHeight = 12;
const triangleHeight = 6;
export type ChatBubbleLayout = {
  lines: string[];
  width: number;
  height: number;
  foreground: string;
  background: string;
};

export class ChatBubble extends Animation {
  private message: string;
  private font: Font;

  private foreground: string;
  private background: string;
  private layout: ChatBubbleLayout | null = null;

  constructor(
    font: Font,
    message: string,
    foreground = COLORS.ChatBubble,
    background = COLORS.ChatBubbleBackground,
  ) {
    super();
    this.font = font;
    this.message = message;
    this.foreground = foreground;
    this.background = background;
    // https://discord.com/channels/723989119503696013/787685796055482368/1039092169937530890
    this.ticks = 24 + Math.floor(message.length / 3);
  }

  tick() {
    if (this.ticks === 0 || !this.renderedFirstFrame) {
      return;
    }

    this.ticks = Math.max(this.ticks - 1, 0);
  }

  render() {
    if (!this.renderedFirstFrame) {
      this.getLayout();
      this.renderedFirstFrame = true;
    }
  }

  getLayout(): ChatBubbleLayout {
    if (this.layout) {
      return this.layout;
    }
    const lines = this.wrapText(this.message);
    const width =
      Math.min(
        hardLimit,
        Math.max(...lines.map((line) => this.font.measureText(line).width)),
      ) +
      padding * 2;
    const height = lineHeight * lines.length + padding * 2 - 5;
    this.layout = {
      lines,
      width,
      height: height + triangleHeight,
      foreground: this.foreground,
      background: this.background,
    };
    return this.layout;
  }

  private wrapText(text: string) {
    const normalized = text.trim();
    if (!normalized) {
      return [''];
    }

    const words = normalized.split(/\s+/);
    const lines: string[] = [];
    let line = '';

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const { width } = this.font.measureText(testLine);

      if (width <= hardLimit) {
        line = testLine;
      } else {
        if (line) {
          lines.push(line);
          line = '';
        }

        if (this.font.measureText(word).width <= hardLimit) {
          line = word;
          continue;
        }

        const hyphenated = this.hyphenateWord(word);
        if (!hyphenated.length) {
          continue;
        }

        lines.push(...hyphenated.slice(0, -1));
        line = hyphenated[hyphenated.length - 1];
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
