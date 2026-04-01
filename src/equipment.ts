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

export function getEquipmentSlotFromString(
  slot: string,
): EquipmentSlot | undefined {
  switch (slot) {
    case 'boots':
      return EquipmentSlot.Boots;
    case 'accessory':
      return EquipmentSlot.Accessory;
    case 'gloves':
      return EquipmentSlot.Gloves;
    case 'belt':
      return EquipmentSlot.Belt;
    case 'armor':
      return EquipmentSlot.Armor;
    case 'necklace':
      return EquipmentSlot.Necklace;
    case 'hat':
      return EquipmentSlot.Hat;
    case 'shield':
      return EquipmentSlot.Shield;
    case 'weapon':
      return EquipmentSlot.Weapon;
    case 'ring-1':
      return EquipmentSlot.Ring1;
    case 'ring-2':
      return EquipmentSlot.Ring2;
    case 'armlet-1':
      return EquipmentSlot.Armlet1;
    case 'armlet-2':
      return EquipmentSlot.Armlet2;
    case 'bracer-1':
      return EquipmentSlot.Bracer1;
    case 'bracer-2':
      return EquipmentSlot.Bracer2;
    default:
      return undefined;
  }
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
