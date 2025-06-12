import {
  type EoReader,
  FileType,
  PacketAction,
  PacketFamily,
  WelcomeAgreeClientPacket,
  WelcomeCode,
  WelcomeMsgClientPacket,
  WelcomeReplyServerPacket,
} from 'eolib';
import { type Client, GameState } from '../client';

function handleWelcomeReply(client: Client, reader: EoReader) {
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
  client.mapId = data.mapId;
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
  client.emit('selectCharacter', undefined);

  if (
    !client.ecf ||
    client.ecf.rid[0] !== data.ecfRid[0] ||
    client.ecf.rid[1] !== data.ecfRid[1] ||
    client.ecf.totalClassesCount !== data.ecfLength
  ) {
    client.downloadQueue.push({ type: FileType.Ecf, id: 1 });
  }
  if (
    !client.eif ||
    client.eif.rid[0] !== data.eifRid[0] ||
    client.eif.rid[1] !== data.eifRid[1] ||
    client.eif.totalItemsCount !== data.eifLength
  ) {
    client.downloadQueue.push({ type: FileType.Eif, id: 1 });
  }
  if (
    !client.enf ||
    client.enf.rid[0] !== data.enfRid[0] ||
    client.enf.rid[1] !== data.enfRid[1] ||
    client.enf.totalNpcsCount !== data.enfLength
  ) {
    client.downloadQueue.push({ type: FileType.Enf, id: 1 });
  }
  if (
    !client.esf ||
    client.esf.rid[0] !== data.esfRid[0] ||
    client.esf.rid[1] !== data.esfRid[1] ||
    client.esf.totalSkillsCount !== data.esfLength
  ) {
    client.downloadQueue.push({ type: FileType.Esf, id: 1 });
  }

  client.loadMap(data.mapId).then(() => {
    if (
      !client.map ||
      client.map.rid[0] !== data.mapRid[0] ||
      client.map.rid[1] !== data.mapRid[1] ||
      client.map.byteSize !== data.mapFileSize
    ) {
      client.downloadQueue.push({ type: FileType.Emf, id: data.mapId });
    }

    if (client.downloadQueue.length > 0) {
      const download = client.downloadQueue.pop();
      client.requestFile(download.type, download.id);
    } else {
      client.enterGame();
    }
  });
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
  client.emit('enterGame', { news: data.news });
}

export function registerWelcomeHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Welcome,
    PacketAction.Reply,
    (reader) => handleWelcomeReply(client, reader),
  );
}