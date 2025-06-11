import {
  AdminLevel,
  CharacterBaseStats,
  CharacterSecondaryStats,
  EquipmentPaperdoll,
  type Item,
  type Spell,
  Weight,
} from 'eolib';

export class Character {
  id = 0;
  name = '';
  title = '';
  guildName = '';
  guildTag = '';
  guildRank = 0;
  guildRankName = '';
  classId = 0;
  admin = AdminLevel.Player;
  level = 0;
  experience = 0;
  usage = 0;
  hp = 0;
  maxHp = 0;
  tp = 0;
  maxTp = 0;
  maxSp = 0;
  statPoints = 0;
  skillPoints = 0;
  karma = 0;
  baseStats = new CharacterBaseStats();
  secondaryStats = new CharacterSecondaryStats();
  equipment = new EquipmentPaperdoll();
  items: Item[] = [];
  spells: Spell[] = [];
  weight = new Weight();
}
