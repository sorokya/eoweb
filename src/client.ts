import {
  AccountAgreeClientPacket,
  AccountRequestClientPacket,
  AdminLevel,
  AttackUseClientPacket,
  CharacterBaseStats,
  type CharacterMapInfo,
  CharacterRequestClientPacket,
  CharacterSecondaryStats,
  type CharacterSelectionListEntry,
  Coords,
  type Direction,
  DoorOpenClientPacket,
  type Ecf,
  type Eif,
  type Emf,
  type Enf,
  type EnfRecord,
  EquipmentPaperdoll,
  type Esf,
  FacePlayerClientPacket,
  FileType,
  type Gender,
  type Item,
  LoginRequestClientPacket,
  MapTileSpec,
  NearbyInfo,
  type NpcMapInfo,
  NpcRangeRequestClientPacket,
  PlayerRangeRequestClientPacket,
  RangeRequestClientPacket,
  type ServerSettings,
  SitAction,
  SitRequestClientPacket,
  type Spell,
  TalkReportClientPacket,
  WalkAction,
  WalkPlayerClientPacket,
  WarpAcceptClientPacket,
  WarpTakeClientPacket,
  Weight,
  WelcomeAgreeClientPacket,
  WelcomeMsgClientPacket,
  WelcomeRequestClientPacket,
} from 'eolib';
import mitt, { type Emitter } from 'mitt';
import type { PacketBus } from './bus';
import { getEcf, getEif, getEmf, getEnf, getEsf } from './db';
import { registerAvatarHandlers } from './handlers/avatar';
import { registerInitHandlers } from './handlers/init';
import { registerConnectionHandlers } from './handlers/connection';
import { registerLoginHandlers } from './handlers/login';
import { registerFaceHandlers } from './handlers/face';
import { registerWelcomeHandlers } from './handlers/welcome';
import { registerPlayersHandlers } from './handlers/players';
import { registerMessageHandlers } from './handlers/message';
import { registerWalkHandlers } from './handlers/walk';
import { registerSitHandlers } from './handlers/sit';
import { registerWarpHandlers } from './handlers/warp';
import { registerRefreshHandlers } from './handlers/refresh';
import { registerNpcHandlers } from './handlers/npc';
import { registerRangeHandlers } from './handlers/range';
import { MapRenderer } from './map';
import {
  HALF_TILE_HEIGHT,
  MAX_CHARACTER_NAME_LENGTH,
  MAX_CHAT_LENGTH,
} from './consts';
import type { Vector2 } from './vector';
import { isoToScreen } from './utils/iso-to-screen';
import { HALF_GAME_HEIGHT, HALF_GAME_WIDTH } from './game-state';
import { screenToIso } from './utils/screen-to-iso';
import { MovementController } from './movement-controller';
import type { NpcAnimation } from './render/npc-base-animation';
import { getNpcMetaData, NPCMetadata } from './utils/get-npc-metadata';
import { GfxType, loadBitmapById } from './gfx';
import { registerTalkHandlers } from './handlers/talk';
import { registerAttackHandlers } from './handlers/attack';
import { registerArenaHandlers } from './handlers/arena';
import { playSfxById, SfxId } from './sfx';
import { registerAccountHandlers } from './handlers/account';
import { registerCharacterHandlers } from './handlers/character';
import { ChatBubble } from './chat-bubble';
import { Door } from './door';
import { registerDoorHandlers } from './handlers/door';
import { getDoorIntersecting } from './collision';
import type { CharacterAnimation } from './render/character-base-animation';
import { CharacterWalkAnimation } from './render/character-walk';

export enum ChatTab {
  Local = 0,
}

type ClientEvents = {
  error: { title: string; message: string };
  debug: string;
  login: CharacterSelectionListEntry[];
  characterCreated: CharacterSelectionListEntry[];
  selectCharacter: undefined;
  enterGame: { news: string[] };
  chat: { name: string; tab: ChatTab; message: string };
  accountCreated: undefined;
  passwordChanged: undefined;
};

export enum GameState {
  Initial = 0,
  Connected = 1,
  Login = 2,
  LoggedIn = 3,
  InGame = 4,
}

type AccountCreateData = {
  username: string;
  password: string;
  name: string;
  location: string;
  email: string;
};

type CharacterCreateData = {
  name: string;
  gender: Gender;
  hairStyle: number;
  hairColor: number;
  skin: number;
};

export class Client {
  private emitter: Emitter<ClientEvents>;
  bus: PacketBus | null = null;
  accountCreateData: AccountCreateData | null = null;
  characterCreateData: CharacterCreateData | null = null;
  playerId = 0;
  characterId = 0;
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
  mapId = 5;
  warpMapId = 0;
  warpQueued = false;
  state = GameState.Initial;
  sessionId = 0;
  serverSettings: ServerSettings | null = null;
  motd = '';
  nearby: NearbyInfo;
  eif: Eif | null = null;
  ecf: Ecf | null = null;
  enf: Enf | null = null;
  esf: Esf | null = null;
  map: Emf | null = null;
  mapRenderer: MapRenderer;
  downloadQueue: { type: FileType; id: number }[] = [];
  characterAnimations: Map<number, CharacterAnimation> = new Map();
  npcAnimations: Map<number, NpcAnimation> = new Map();
  characterChats: Map<number, ChatBubble> = new Map();
  npcChats: Map<number, ChatBubble> = new Map();
  mousePosition: Vector2 | undefined;
  mouseCoords: Vector2 | undefined;
  movementController: MovementController;
  npcMetadata = getNpcMetaData();
  doors: Door[] = [];
  typing = false;

  constructor() {
    this.emitter = mitt<ClientEvents>();
    getEif().then((eif) => {
      this.eif = eif;
    });
    getEcf().then((ecf) => {
      this.ecf = ecf;
    });
    getEnf().then((enf) => {
      this.enf = enf;
    });
    getEsf().then((esf) => {
      this.esf = esf;
    });
    this.nearby = new NearbyInfo();
    this.nearby.characters = [];
    this.nearby.npcs = [];
    this.nearby.items = [];
    this.mapRenderer = new MapRenderer(this);
    this.movementController = new MovementController(this);
    this.preloadCharacterSprites();
  }

  private preloadCharacterSprites() {
    loadBitmapById(GfxType.SkinSprites, 1); // standing
    loadBitmapById(GfxType.SkinSprites, 2); // walking
    loadBitmapById(GfxType.SkinSprites, 3); // attacking
    loadBitmapById(GfxType.SkinSprites, 6); // sitting on ground
  }

  preloadNpcSprites(id: number) {
    const record = this.getEnfRecordById(id);
    if (!record) {
      return;
    }

    for (let i = 1; i <= 18; ++i) {
      loadBitmapById(GfxType.NPC, (record.graphicId - 1) * 40 + i);
    }
  }

  getCharacterById(id: number): CharacterMapInfo | undefined {
    return this.nearby.characters.find((c) => c.playerId === id);
  }

  getPlayerCharacter(): CharacterMapInfo | undefined {
    return this.nearby.characters.find((c) => c.playerId === this.playerId);
  }

  getNpcByIndex(index: number): NpcMapInfo | undefined {
    return this.nearby.npcs.find((n) => n.index === index);
  }

  getNpcMetadata(graphicId: number): NPCMetadata {
    const data = this.npcMetadata.get(graphicId);
    if (data) {
      return data;
    }

    return new NPCMetadata(0, 0, 0, 0, false, 0);
  }

  getEnfRecordById(id: number): EnfRecord | undefined {
    if (!this.enf) {
      return;
    }

    return this.enf.npcs[id - 1];
  }

  getPlayerCoords() {
    const playerCharacter = this.getPlayerCharacter();
    if (playerCharacter) {
      return { x: playerCharacter.coords.x, y: playerCharacter.coords.y };
    }

    return { x: 0, y: 0 };
  }

  setMousePosition(position: Vector2) {
    this.mousePosition = position;

    const player = this.getPlayerCoords();
    const playerScreen = isoToScreen(player);

    const mouseWorldX = position.x - HALF_GAME_WIDTH + playerScreen.x;
    const mouseWorldY =
      position.y - HALF_GAME_HEIGHT + playerScreen.y + HALF_TILE_HEIGHT;

    this.mouseCoords = screenToIso({ x: mouseWorldX, y: mouseWorldY });

    if (this.mouseCoords.x < 0 || this.mouseCoords.y < 0) {
      this.mouseCoords = undefined;
    }
  }

  tick() {
    this.movementController.tick();
    this.mapRenderer.tick();
    const endedCharacterAnimations: number[] = [];
    let playerWalking = false;
    for (const [id, animation] of this.characterAnimations) {
      if (
        !animation.ticks ||
        !this.nearby.characters.some((c) => c.playerId === id)
      ) {
        endedCharacterAnimations.push(id);
        continue;
      }
      if (id === this.playerId && animation instanceof CharacterWalkAnimation) {
        playerWalking = true;
      }
      animation.tick();
    }
    for (const id of endedCharacterAnimations) {
      this.characterAnimations.delete(id);
    }

    const endedNpcAnimations: number[] = [];
    for (const [id, animation] of this.npcAnimations) {
      if (!animation.ticks || !this.nearby.npcs.some((n) => n.index === id)) {
        endedNpcAnimations.push(id);
        continue;
      }
      animation.tick();
    }
    for (const id of endedNpcAnimations) {
      this.npcAnimations.delete(id);
    }

    const endedCharacterChatBubbles: number[] = [];
    for (const [id, bubble] of this.characterChats) {
      if (
        !bubble.ticks ||
        !this.nearby.characters.some((c) => c.playerId === id)
      ) {
        endedCharacterChatBubbles.push(id);
        continue;
      }
      bubble.tick();
    }
    for (const id of endedCharacterChatBubbles) {
      this.characterChats.delete(id);
    }

    const endedNpcChatBubbles: number[] = [];
    for (const [id, bubble] of this.npcChats) {
      if (!bubble.ticks || !this.nearby.npcs.some((n) => n.index === id)) {
        endedNpcChatBubbles.push(id);
        continue;
      }
      bubble.tick();
    }
    for (const id of endedNpcChatBubbles) {
      this.npcChats.delete(id);
    }

    for (const door of this.doors) {
      if (!door.open) {
        continue;
      }

      door.openTicks = Math.max(door.openTicks - 1, 0);
      if (!door.openTicks) {
        door.open = false;
        playSfxById(SfxId.DoorClose);
      }
    }

    if (this.warpQueued && !playerWalking) {
      this.acceptWarp();
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    this.mapRenderer.render(ctx);
  }

  setMap(map: Emf) {
    this.map = map;
    this.characterChats.clear();
    this.npcChats.clear();
    if (this.map) {
      this.mapRenderer.buildCaches();
      this.loadDoors();
    }
  }

  loadDoors() {
    this.doors = [];
    for (const warpRow of this.map.warpRows) {
      for (const warpTile of warpRow.tiles) {
        if (warpTile.warp.door) {
          const coords = new Coords();
          coords.x = warpTile.x;
          coords.y = warpRow.y;
          this.doors.push(new Door(coords));
        }
      }
    }
  }

  getDoor(coords: Coords): Door | undefined {
    return this.doors.find(
      (d) => d.coords.x === coords.x && d.coords.y === coords.y,
    );
  }

  openDoor(coords: Coords) {
    const door = this.getDoor(coords);
    if (!door || door.open) {
      return;
    }

    const packet = new DoorOpenClientPacket();
    packet.coords = coords;
    this.bus.send(packet);
  }

  async loadMap(id: number): Promise<void> {
    this.setMap(await getEmf(id));
  }

  showError(message: string, title = '') {
    this.emitter.emit('error', { title, message });
  }

  emit<Event extends keyof ClientEvents>(
    event: Event,
    data: ClientEvents[Event],
  ) {
    this.emitter.emit(event, data);
  }

  on<Event extends keyof ClientEvents>(
    event: Event,
    handler: (data: ClientEvents[Event]) => void,
  ) {
    this.emitter.on(event, handler);
  }

  setBus(bus: PacketBus) {
    this.bus = bus;
    registerInitHandlers(this);
    registerConnectionHandlers(this);
    registerLoginHandlers(this);
    registerWelcomeHandlers(this);
    registerPlayersHandlers(this);
    registerMessageHandlers(this);
    registerAvatarHandlers(this);
    registerFaceHandlers(this);
    registerWalkHandlers(this);
    registerSitHandlers(this);
    registerWarpHandlers(this);
    registerRefreshHandlers(this);
    registerNpcHandlers(this);
    registerRangeHandlers(this);
    registerTalkHandlers(this);
    registerAttackHandlers(this);
    registerArenaHandlers(this);
    registerAccountHandlers(this);
    registerCharacterHandlers(this);
    registerDoorHandlers(this);
  }

  handleClick() {
    const doorAt = getDoorIntersecting(this.mousePosition);
    if (doorAt) {
      const door = this.getDoor(doorAt);
      if (door && !door.open) {
        this.openDoor(doorAt);
      }
    }
  }

  canWalk(coords: Coords): boolean {
    if (
      this.nearby.npcs.some(
        (n) => n.coords.x === coords.x && n.coords.y === coords.y,
      )
    ) {
      return false;
    }

    // TODO: Ghost
    if (
      this.nearby.characters.some(
        (c) => c.coords.x === coords.x && c.coords.y === coords.y,
      )
    ) {
      return false;
    }

    const spec = this.map.tileSpecRows
      .find((r) => r.y === coords.y)
      ?.tiles.find((t) => t.x === coords.x);
    if (
      spec &&
      [
        MapTileSpec.Wall,
        MapTileSpec.ChairDown,
        MapTileSpec.ChairLeft,
        MapTileSpec.ChairRight,
        MapTileSpec.ChairUp,
        MapTileSpec.ChairDownRight,
        MapTileSpec.ChairUpLeft,
        MapTileSpec.ChairAll,
        MapTileSpec.Chest,
        MapTileSpec.BankVault,
        MapTileSpec.Edge,
        MapTileSpec.Board1,
        MapTileSpec.Board2,
        MapTileSpec.Board3,
        MapTileSpec.Board4,
        MapTileSpec.Board5,
        MapTileSpec.Board6,
        MapTileSpec.Board7,
        MapTileSpec.Board8,
        MapTileSpec.Jukebox,
      ].includes(spec.tileSpec)
    ) {
      return false;
    }

    return true;
  }

  requestAccountCreation(data: AccountCreateData) {
    this.accountCreateData = data;
    const packet = new AccountRequestClientPacket();
    packet.username = data.username;
    this.bus.send(packet);
  }

  requestCharacterCreation(data: CharacterCreateData) {
    if (
      data.name.trim().length < 4 ||
      data.name.trim().length > MAX_CHARACTER_NAME_LENGTH
    ) {
      this.showError('Invalid character name');
      return;
    }

    this.characterCreateData = data;
    this.bus.send(new CharacterRequestClientPacket());
  }

  changePassword(username: string, oldPassword: string, newPassword: string) {
    const packet = new AccountAgreeClientPacket();
    packet.username = username;
    packet.oldPassword = oldPassword;
    packet.newPassword = newPassword;
    this.bus.send(packet);
  }

  chat(message: string) {
    if (!message) {
      return;
    }

    const trimmed = message.substring(0, MAX_CHAT_LENGTH);

    const packet = new TalkReportClientPacket();
    packet.message = trimmed;
    this.bus.send(packet);

    this.characterChats.set(this.playerId, new ChatBubble(trimmed));

    this.emit('chat', {
      name: this.name,
      tab: ChatTab.Local,
      message: trimmed,
    });
  }

  login(username: string, password: string) {
    const packet = new LoginRequestClientPacket();
    packet.username = username;
    packet.password = password;
    this.bus.send(packet);
  }

  selectCharacter(characterId: number) {
    const packet = new WelcomeRequestClientPacket();
    packet.characterId = characterId;
    this.bus.send(packet);
  }

  requestWarpMap(id: number) {
    const packet = new WarpTakeClientPacket();
    packet.sessionId = this.sessionId;
    packet.mapId = id;
    this.bus.send(packet);
  }

  acceptWarp() {
    const packet = new WarpAcceptClientPacket();
    packet.sessionId = this.sessionId;
    packet.mapId = this.warpMapId;
    this.bus.send(packet);
    this.warpQueued = false;
    this.movementController.freeze = true;
  }

  requestFile(fileType: FileType, id: number) {
    const packet = new WelcomeAgreeClientPacket();
    packet.sessionId = this.sessionId;
    packet.fileType = fileType;

    switch (fileType) {
      case FileType.Ecf:
        packet.fileTypeData = new WelcomeAgreeClientPacket.FileTypeDataEcf();
        packet.fileTypeData.fileId = id;
        this.emit('debug', 'Loading classes..');
        break;
      case FileType.Eif:
        packet.fileTypeData = new WelcomeAgreeClientPacket.FileTypeDataEif();
        packet.fileTypeData.fileId = id;
        this.emit('debug', 'Loading items..');
        break;
      case FileType.Enf:
        packet.fileTypeData = new WelcomeAgreeClientPacket.FileTypeDataEnf();
        packet.fileTypeData.fileId = id;
        this.emit('debug', 'Loading NPCs..');
        break;
      case FileType.Esf:
        packet.fileTypeData = new WelcomeAgreeClientPacket.FileTypeDataEsf();
        packet.fileTypeData.fileId = id;
        this.emit('debug', 'Loading spells..');
        break;
      case FileType.Emf:
        packet.fileTypeData = new WelcomeAgreeClientPacket.FileTypeDataEmf();
        packet.fileTypeData.fileId = id;
        this.emit('debug', 'Loading map..');
        break;
    }

    this.bus.send(packet);
  }

  enterGame() {
    const packet = new WelcomeMsgClientPacket();
    packet.characterId = this.characterId;
    packet.sessionId = this.sessionId;
    this.bus.send(packet);
  }

  rangeRequest(playerIds: number[], npcIndexes: number[]) {
    const packet = new RangeRequestClientPacket();
    packet.playerIds = playerIds;
    packet.npcIndexes = npcIndexes;
    this.bus.send(packet);
  }

  requestCharacterRange(playerIds: number[]) {
    const packet = new PlayerRangeRequestClientPacket();
    packet.playerIds = playerIds;
    this.bus.send(packet);
  }

  requestNpcRange(npcIndexes: number[]) {
    const packet = new NpcRangeRequestClientPacket();
    packet.npcIndexes = npcIndexes;
    this.bus.send(packet);
  }

  face(direction: Direction) {
    const packet = new FacePlayerClientPacket();
    packet.direction = direction;
    this.bus.send(packet);
  }

  walk(direction: Direction, coords: Coords, timestamp: number) {
    const packet = new WalkPlayerClientPacket();
    packet.walkAction = new WalkAction();
    packet.walkAction.direction = direction;
    packet.walkAction.coords = coords;
    packet.walkAction.timestamp = timestamp;
    this.bus.send(packet);
  }

  attack(direction: Direction, timestamp: number) {
    const packet = new AttackUseClientPacket();
    packet.direction = direction;
    packet.timestamp = timestamp;
    this.bus.send(packet);
    playSfxById(SfxId.PunchAttack);
  }

  sit() {
    const packet = new SitRequestClientPacket();
    packet.sitAction = SitAction.Sit;
    packet.sitActionData = new SitRequestClientPacket.SitActionDataSit();
    packet.sitActionData.cursorCoords = new Coords();
    packet.sitActionData.cursorCoords.x = 0;
    packet.sitActionData.cursorCoords.y = 0;
    this.bus.send(packet);
  }

  stand() {
    const packet = new SitRequestClientPacket();
    packet.sitAction = SitAction.Stand;
    this.bus.send(packet);
  }

  disconnect() {
    this.state = GameState.Initial;
    this.bus.disconnect();
  }
}
