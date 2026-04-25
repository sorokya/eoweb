import { ItemType } from 'eolib';

export enum EquipmentSlot {
  Boots = 0,
  Accessory = 1,
  Gloves = 2,
  Belt = 3,
  Armor = 4,
  Necklace = 5,
  Hat = 6,
  Shield = 7,
  Weapon = 8,
  Ring1 = 9,
  Ring2 = 10,
  Armlet1 = 11,
  Armlet2 = 12,
  Bracer1 = 13,
  Bracer2 = 14,
}

export function getEquipmentSlotForItemType(
  type: ItemType,
  subLoc = 0,
): EquipmentSlot | undefined {
  switch (type) {
    case ItemType.Boots:
      return EquipmentSlot.Boots;
    case ItemType.Accessory:
      return EquipmentSlot.Accessory;
    case ItemType.Gloves:
      return EquipmentSlot.Gloves;
    case ItemType.Belt:
      return EquipmentSlot.Belt;
    case ItemType.Armor:
      return EquipmentSlot.Armor;
    case ItemType.Necklace:
      return EquipmentSlot.Necklace;
    case ItemType.Hat:
      return EquipmentSlot.Hat;
    case ItemType.Shield:
      return EquipmentSlot.Shield;
    case ItemType.Weapon:
      return EquipmentSlot.Weapon;
    case ItemType.Ring:
      return subLoc ? EquipmentSlot.Ring2 : EquipmentSlot.Ring1;
    case ItemType.Armlet:
      return subLoc ? EquipmentSlot.Armlet2 : EquipmentSlot.Armlet1;
    case ItemType.Bracer:
      return subLoc ? EquipmentSlot.Bracer2 : EquipmentSlot.Bracer1;
    default:
      return undefined;
  }
}
