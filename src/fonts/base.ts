import type { Texture } from 'pixi.js';
import type { Atlas, TileAtlasEntry } from '@/atlas';

export class FontCharacter {
  constructor(
    public id: number,
    public x: number,
    public y: number,
    public width: number,
    public height: number,
  ) {}
}

export abstract class Font {
  protected atlas: Atlas;
  protected characters!: FontCharacter[];

  constructor(atlas: Atlas) {
    this.atlas = atlas;
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

  public getCharacterTexture(charId: number): Texture | null {
    const frame = this.getFrame();
    if (!frame) return null;

    const char = this.getCharacter(charId);
    const texture = this.atlas.getFrameTexture({
      atlasIndex: frame.atlasIndex,
      x: frame.x + char.x,
      y: frame.y + char.y,
      w: char.width,
      h: char.height,
    });
    return texture ?? null;
  }

  abstract getFrame(): TileAtlasEntry | undefined;
}
