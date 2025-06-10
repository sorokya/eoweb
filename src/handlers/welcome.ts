import {
  type EoReader,
  WelcomeCode,
  WelcomeMsgClientPacket,
  WelcomeReplyServerPacket,
} from 'eolib';
import { type Client, GameState } from '../client';

export function handleWelcomeReply(client: Client, reader: EoReader) {
  const packet = WelcomeReplyServerPacket.deserialize(reader);
  if (packet.welcomeCode === WelcomeCode.ServerBusy) {
    client.showError('Server is busy', 'Login failed');
    return;
  }

  if (packet.welcomeCode === WelcomeCode.SelectCharacter) {
    handleSelectCharacter(
      client,
      packet.welcomeCodeData as WelcomeReplyServerPacket.WelcomeCodeDataSelectCharacter,
    );
  } else {
    handleEnterGame(
      client,
      packet.welcomeCodeData as WelcomeReplyServerPacket.WelcomeCodeDataEnterGame,
    );
  }
}

function handleSelectCharacter(
  client: Client,
  data: WelcomeReplyServerPacket.WelcomeCodeDataSelectCharacter,
) {
  client.sessionId = data.sessionId;
  client.character.id = data.characterId;
  client.character.name = data.name;
  client.character.title = data.title;
  client.character.guildName = data.guildName;
  client.character.guildTag = data.guildTag;
  client.character.guildRank = data.guildRank;
  client.character.guildRankName = data.guildRankName;
  client.character.classId = data.classId;
  client.character.admin = data.admin;
  client.character.level = data.level;
  client.character.experience = data.experience;
  client.character.usage = data.usage;
  client.character.baseStats.str = data.stats.base.str;
  client.character.baseStats.intl = data.stats.base.intl;
  client.character.baseStats.wis = data.stats.base.wis;
  client.character.baseStats.agi = data.stats.base.agi;
  client.character.baseStats.cha = data.stats.base.cha;
  client.character.baseStats.con = data.stats.base.con;
  client.character.secondaryStats = data.stats.secondary;
  client.character.hp = data.stats.hp;
  client.character.maxHp = data.stats.maxHp;
  client.character.tp = data.stats.tp;
  client.character.maxTp = data.stats.maxTp;
  client.character.maxSp = data.stats.maxSp;
  client.character.statPoints = data.stats.statPoints;
  client.character.skillPoints = data.stats.skillPoints;
  client.character.karma = data.stats.karma;
  client.character.equipment.boots = data.equipment.boots;
  client.character.equipment.gloves = data.equipment.gloves;
  client.character.equipment.accessory = data.equipment.accessory;
  client.character.equipment.armor = data.equipment.armor;
  client.character.equipment.belt = data.equipment.belt;
  client.character.equipment.necklace = data.equipment.necklace;
  client.character.equipment.hat = data.equipment.hat;
  client.character.equipment.shield = data.equipment.shield;
  client.character.equipment.weapon = data.equipment.weapon;
  client.character.equipment.ring = data.equipment.ring;
  client.character.equipment.armlet = data.equipment.armlet;
  client.character.equipment.bracer = data.equipment.bracer;

  const packet = new WelcomeMsgClientPacket();
  packet.characterId = client.character.id;
  packet.sessionId = client.sessionId;
  client.bus.send(packet);
}

function handleEnterGame(
  client: Client,
  data: WelcomeReplyServerPacket.WelcomeCodeDataEnterGame,
) {
  client.motd = data.news[0];
  client.character.items = data.items;
  client.character.spells = data.spells;
  client.character.weight = data.weight;
  client.nearby = data.nearby;
  client.state = GameState.InGame;
}
