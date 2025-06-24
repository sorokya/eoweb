import {
  type EoReader,
  FileType,
  PacketAction,
  PacketFamily,
  WelcomeCode,
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
  client.characterId = data.characterId;
  client.name = data.name;
  client.title = data.title;
  client.guildName = data.guildName;
  client.guildTag = data.guildTag;
  client.guildRank = data.guildRank;
  client.guildRankName = data.guildRankName;
  client.classId = data.classId;
  client.admin = data.admin;
  client.level = data.level;
  client.experience = data.experience;
  client.usage = data.usage;
  client.baseStats.str = data.stats.base.str;
  client.baseStats.intl = data.stats.base.intl;
  client.baseStats.wis = data.stats.base.wis;
  client.baseStats.agi = data.stats.base.agi;
  client.baseStats.cha = data.stats.base.cha;
  client.baseStats.con = data.stats.base.con;
  client.secondaryStats = data.stats.secondary;
  client.hp = data.stats.hp;
  client.maxHp = data.stats.maxHp;
  client.tp = data.stats.tp;
  client.maxTp = data.stats.maxTp;
  client.maxSp = data.stats.maxSp;
  client.statPoints = data.stats.statPoints;
  client.skillPoints = data.stats.skillPoints;
  client.karma = data.stats.karma;
  client.equipment.boots = data.equipment.boots;
  client.equipment.gloves = data.equipment.gloves;
  client.equipment.accessory = data.equipment.accessory;
  client.equipment.armor = data.equipment.armor;
  client.equipment.belt = data.equipment.belt;
  client.equipment.necklace = data.equipment.necklace;
  client.equipment.hat = data.equipment.hat;
  client.equipment.shield = data.equipment.shield;
  client.equipment.weapon = data.equipment.weapon;
  client.equipment.ring = data.equipment.ring;
  client.equipment.armlet = data.equipment.armlet;
  client.equipment.bracer = data.equipment.bracer;
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
  client.items = data.items;
  client.spells = data.spells;
  client.weight = data.weight;
  client.nearby = data.nearby;
  client.state = GameState.InGame;
  client.emit('enterGame', { news: data.news });

  const loaded = [];
  for (const npc of client.nearby.npcs) {
    if (loaded.includes(npc.id)) {
      continue;
    }

    client.preloadNpcSprites(npc.id);

    loaded.push(npc.id);
  }
}

export function registerWelcomeHandlers(client: Client) {
  client.bus.registerPacketHandler(
    PacketFamily.Welcome,
    PacketAction.Reply,
    (reader) => handleWelcomeReply(client, reader),
  );
}
