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
  protected characters: FontCharacter[];

  public getCharacter(charId: number): FontCharacter | null {
    return this.characters.find((c) => c.id === charId) || null;
  }
}
