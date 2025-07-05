import { type EifRecord, ItemSpecial, ItemType } from 'eolib';

export function getItemMeta(item: EifRecord): string[] {
  const meta = [];

  let itemType = '';
  switch (item.type) {
    case ItemType.General: {
      itemType = 'general item';
      break;
    }
    case ItemType.Currency:
      itemType = 'currency';
      break;
    case ItemType.Heal:
      itemType = 'potion';
      if (item.hp) {
        itemType += ` + ${item.hp}hp`;
      }
      if (item.tp) {
        itemType += ` + ${item.tp}mp`;
      }
      break;
    case ItemType.Teleport:
      itemType = 'teleport';
      break;
    case ItemType.ExpReward:
      itemType = 'exp reward';
      break;
    case ItemType.Key:
      itemType = 'key';
      break;
    case ItemType.Alcohol:
      itemType = 'beverage';
      break;
    case ItemType.EffectPotion:
      itemType = 'effect';
      break;
    case ItemType.HairDye:
      itemType = 'hairdye';
      break;
    case ItemType.CureCurse:
      itemType = 'cure';
      break;
    default:
      if (item.special === ItemSpecial.Cursed) {
        itemType = 'cursed';
      } else if (item.special === ItemSpecial.Lore) {
        itemType = 'lore';
      } else {
        itemType = 'normal';
      }

      if (item.type === ItemType.Armor) {
        if (item.spec2 === 1) {
          itemType += ' male';
        } else {
          itemType += ' female';
        }
      }

      switch (item.type) {
        case ItemType.Weapon:
          itemType += ' weapon';
          break;
        case ItemType.Shield:
          itemType += ' shield';
          break;
        case ItemType.Armor:
          itemType += ' clothing';
          break;
        case ItemType.Hat:
          itemType += ' hat';
          break;
        case ItemType.Boots:
          itemType += ' boots';
          break;
        case ItemType.Gloves:
          itemType += ' gloves';
          break;
        case ItemType.Accessory:
          itemType += ' accessory';
          break;
        case ItemType.Belt:
          itemType += ' belt';
          break;
        case ItemType.Necklace:
          itemType += ' necklace';
          break;
        case ItemType.Ring:
          itemType += ' ring';
          break;
        case ItemType.Armlet:
          itemType += ' bracelet';
          break;
        case ItemType.Bracer:
          itemType += ' bracer';
          break;
      }
  }

  meta.push(itemType);

  if (item.type >= 10 && item.type <= 21) {
    if (item.minDamage || item.maxDamage) {
      meta.push(`damage: ${item.minDamage} - ${item.maxDamage}`);
    }

    if (item.hp || item.tp) {
      let add = 'add+';
      if (item.hp) {
        add += ` ${item.hp}hp`;
      }

      if (item.tp) {
        add += ` ${item.tp}tp`;
      }

      meta.push(add);
    }

    if (item.accuracy || item.evade || item.armor) {
      let def = 'def+';
      if (item.accuracy) {
        def += ` ${item.accuracy}acc`;
      }

      if (item.evade) {
        def += ` ${item.evade}eva`;
      }

      if (item.armor) {
        def += ` ${item.armor}arm`;
      }
      meta.push(def);
    }

    if (item.str || item.intl || item.wis || item.agi || item.cha || item.con) {
      let stat = 'stat+';

      if (item.str) {
        stat += ` ${item.str}str`;
      }

      if (item.intl) {
        stat += ` ${item.intl}int`;
      }

      if (item.wis) {
        stat += ` ${item.wis}wis`;
      }

      if (item.agi) {
        stat += ` ${item.agi}agi`;
      }

      if (item.cha) {
        stat += ` ${item.cha}cha`;
      }

      if (item.con) {
        stat += ` ${item.con}con`;
      }

      meta.push(stat);
    }
  }

  if (
    item.levelRequirement ||
    item.classRequirement ||
    item.strRequirement ||
    item.intRequirement ||
    item.wisRequirement ||
    item.agiRequirement ||
    item.chaRequirement ||
    item.conRequirement
  ) {
    let req = 'req:';

    if (item.levelRequirement) {
      req += ` ${item.levelRequirement}LVL`;
    }

    if (item.classRequirement) {
      // TODO: Load class name
      req += ` Class ${item.classRequirement}`;
    }

    if (item.strRequirement) {
      req += ` ${item.strRequirement}str`;
    }

    if (item.intRequirement) {
      req += ` ${item.intRequirement}int`;
    }

    if (item.wisRequirement) {
      req += ` ${item.wisRequirement}wis`;
    }

    if (item.agiRequirement) {
      req += ` ${item.agiRequirement}agi`;
    }

    if (item.chaRequirement) {
      req += ` ${item.chaRequirement}cha`;
    }

    if (item.conRequirement) {
      req += ` ${item.conRequirement}con`;
    }

    meta.push(req);
  }

  return meta;
}
