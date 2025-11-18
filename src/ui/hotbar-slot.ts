export enum HotbarSlotType {
  Empty = 0,
  Item = 1,
  Skill = 2,
}

export class HotbarSlot {
  type: HotbarSlotType;
  typeId: number;

  constructor(type: HotbarSlotType, typeId = 0) {
    this.type = type;
    this.typeId = typeId;
  }
}
