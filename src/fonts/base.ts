import type { Atlas, TileAtlasEntry } from '../atlas';
import type { Vector2 } from '../vector';

export class FontCharacter {
  constructor(
    public id: number,
    public x: number,
    public y: number,
    public width: number,
    public height: number,
  ) {}
}

export enum TextAlign {
  CenterHorizontal = 0,
  CenterVertical = 1,
  Both = 2,
  None = 3,
}

export abstract class Font {
  protected atlas: Atlas;
  protected characters: FontCharacter[];
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor(atlas: Atlas) {
    this.atlas = atlas;
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d');
  }

  public getCharacter(charId: number): FontCharacter {
    const found = this.characters.find((c) => c.id === charId);
    if (found) {
      return found;
    }

    const defaultChar = this.characters.find((c) => c.id === 63);
    if (!defaultChar) {
      throw new Error('Font does not contain default character (?)');
    }

    return defaultChar;
  }

  private stringToCharacters(text: string): FontCharacter[] {
    return text.split('').map((c) => this.getCharacter(c.charCodeAt(0)));
  }

  public measureTextChars(chars: FontCharacter[]): {
    width: number;
    height: number;
  } {
    const width = chars.reduce((acc, c) => acc + c.width, 0);
    const height = Math.max(...chars.map((c) => c.height));

    return { width, height };
  }

  public measureText(text: string): { width: number; height: number } {
    const chars = this.stringToCharacters(text);
    return this.measureTextChars(chars);
  }

  abstract getFrame(): TileAtlasEntry;

  public render(
    ctx: CanvasRenderingContext2D,
    text: string,
    position: Vector2,
    color = '#fff',
    align: TextAlign = TextAlign.Both,
  ) {
    const frame = this.getFrame();
    if (!frame) {
      throw new Error('Font frame not found');
    }

    const img = this.atlas.getAtlas(frame.atlasIndex);
    if (!img) {
      throw new Error('Font atlas not found');
    }

    const chars = this.stringToCharacters(text);
    const { width, height } = this.measureTextChars(chars);

    let x = 0;

    this.canvas.width = width;
    this.canvas.height = height;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (const char of chars) {
      this.ctx.drawImage(
        img,
        frame.x + char.x,
        frame.y + char.y,
        char.width,
        char.height,
        x,
        0,
        char.width,
        char.height,
      );
      x += char.width;
    }

    if (color !== '#fff') {
      this.ctx.globalCompositeOperation = 'source-in';
      this.ctx.fillStyle = color;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.globalCompositeOperation = 'source-over';
    }

    let drawX = position.x;
    let drawY = position.y;

    switch (align) {
      case TextAlign.CenterHorizontal:
        drawX -= width >> 1;
        break;
      case TextAlign.CenterVertical:
        drawY -= height;
        break;
      case TextAlign.Both:
        drawX -= width >> 1;
        drawY -= height;
        break;
    }

    ctx.drawImage(
      this.canvas,
      0,
      0,
      this.canvas.width,
      this.canvas.height,
      Math.floor(drawX),
      Math.floor(drawY),
      this.canvas.width,
      this.canvas.height,
    );
  }
}
