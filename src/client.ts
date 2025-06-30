import {
  AccountAgreeClientPacket,
  AccountRequestClientPacket,
  AdminLevel,
  AttackUseClientPacket,
  ByteCoords,
  ChairRequestClientPacket,
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
  type EifRecord,
  type Emf,
  type Enf,
  type EnfRecord,
  EquipmentPaperdoll,
  type Esf,
  FacePlayerClientPacket,
  FileType,
  type Gender,
  type Item,
  ItemDropClientPacket,
  ItemGetClientPacket,
  type ItemMapInfo,
  ItemType,
  ItemUseClientPacket,
  LoginRequestClientPacket,
  MapTileSpec,
  MessagePingClientPacket,
  NearbyInfo,
  type NpcMapInfo,
  NpcRangeRequestClientPacket,
  PlayerRangeRequestClientPacket,
  RangeRequestClientPacket,
  type ServerSettings,
  SitAction,
  SitRequestClientPacket,
  SitState,
  type Spell,
  TalkReportClientPacket,
  ThreeItem,
  Version,
  WalkAction,
  WalkAdminClientPacket,
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
import { ChatBubble } from './chat-bubble';
import { getDoorIntersecting } from './collision';
import {
  CLEAR_OUT_OF_RANGE_TICKS,
  HALF_TILE_HEIGHT,
  HOST,
  MAX_CHARACTER_NAME_LENGTH,
  MAX_CHAT_LENGTH,
  USAGE_TICKS,
} from './consts';
import { getEcf, getEif, getEmf, getEnf, getEsf } from './db';
import { Door } from './door';
import { HALF_GAME_HEIGHT, HALF_GAME_WIDTH } from './game-state';
import { GfxType, loadBitmapById } from './gfx';
import { registerAccountHandlers } from './handlers/account';
import { registerArenaHandlers } from './handlers/arena';
import { registerAttackHandlers } from './handlers/attack';
import { registerAvatarHandlers } from './handlers/avatar';
import { registerChairHandlers } from './handlers/chair';
import { registerCharacterHandlers } from './handlers/character';
import { registerConnectionHandlers } from './handlers/connection';
import { registerDoorHandlers } from './handlers/door';
import { registerEffectHandlers } from './handlers/effect';
import { registerFaceHandlers } from './handlers/face';
import { registerInitHandlers } from './handlers/init';
import { registerItemHandlers } from './handlers/item';
import { registerLoginHandlers } from './handlers/login';
import { registerMessageHandlers } from './handlers/message';
import { registerNpcHandlers } from './handlers/npc';
import { registerPlayersHandlers } from './handlers/players';
import { registerRangeHandlers } from './handlers/range';
import { registerRecoverHandlers } from './handlers/recover';
import { registerRefreshHandlers } from './handlers/refresh';
import { registerSitHandlers } from './handlers/sit';
import { registerTalkHandlers } from './handlers/talk';
import { registerWalkHandlers } from './handlers/walk';
import { registerWarpHandlers } from './handlers/warp';
import { registerWelcomeHandlers } from './handlers/welcome';
import { MapRenderer } from './map';
import { MovementController } from './movement-controller';
import type { CharacterAnimation } from './render/character-base-animation';
import { CharacterWalkAnimation } from './render/character-walk';
import type { HealthBar } from './render/health-bar';
import type { NpcAnimation } from './render/npc-base-animation';
import { NpcDeathAnimation } from './render/npc-death';
import { playSfxById, SfxId } from './sfx';
import { getNpcMetaData, NPCMetadata } from './utils/get-npc-metadata';
import { getWeaponMetaData, WeaponMetadata } from './utils/get-weapon-metadata';
import { isoToScreen } from './utils/iso-to-screen';
import { randomRange } from './utils/random-range';
import { inRange } from './utils/range';
import { screenToIso } from './utils/screen-to-iso';
import type { Vector2 } from './vector';

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
  serverChat: { message: string; sfxId?: SfxId | null };
  accountCreated: undefined;
  passwordChanged: undefined;
  inventoryChanged: undefined;
  statsUpdate: undefined;
  reconnect: undefined;
};

export enum GameState {
  Initial = 0,
  Connected = 1,
  Login = 2,
  LoggedIn = 3,
  InGame = 4,
}

export enum CharacterAction {
  None = 0,
  Walking = 1,
  MeleeAttack = 2,
  RangedAttack = 3,
  CastingSpell = 4,
}

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
  host = HOST;
  version: Version;
  challenge: number;
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
  nowall = false;
  level = 0;
  experience = 0;
  usage = 0;
  usageTicks = USAGE_TICKS;
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
  npcHealthBars: Map<number, HealthBar> = new Map();
  characterHealthBars: Map<number, HealthBar> = new Map();
  mousePosition: Vector2 | undefined;
  mouseCoords: Vector2 | undefined;
  movementController: MovementController;
  npcMetadata = getNpcMetaData();
  weaponMetadata = getWeaponMetaData();
  doors: Door[] = [];
  typing = false;
  clearOutofRangeTicks = 0;
  pingStart = 0;
  quakeTicks = 0;
  quakePower = 0;
  quakeOffset = 0;

  constructor() {
    this.emitter = mitt<ClientEvents>();
    this.version = new Version();
    this.version.major = 0;
    this.version.minor = 0;
    this.version.patch = 28;
    this.challenge = 0;
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

  getItemByIndex(index: number): ItemMapInfo | undefined {
    return this.nearby.items.find((i) => i.uid === index);
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

  getWeaponMetadata(graphicId: number): WeaponMetadata {
    const data = this.weaponMetadata.get(graphicId);
    if (data) {
      return data;
    }

    return new WeaponMetadata(0, [SfxId.MeleeWeaponAttack], false);
  }

  getEifRecordById(id: number): EifRecord | undefined {
    if (!this.eif) {
      return;
    }

    return this.eif.items[id - 1];
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

    if (this.state === GameState.InGame) {
      this.usageTicks = Math.max(this.usageTicks - 1, 0);
      if (!this.usageTicks) {
        this.usage += 1;
        this.usageTicks = USAGE_TICKS;
      }
    }

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
      if (this.npcAnimations.get(id) instanceof NpcDeathAnimation) {
        this.nearby.npcs = this.nearby.npcs.filter((n) => n.index !== id);
      }
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

    const endedNpcHealthBars: number[] = [];
    for (const [id, healthBar] of this.npcHealthBars) {
      if (
        !this.nearby.npcs.some((n) => n.index === id) ||
        healthBar.ticks <= 0
      ) {
        endedNpcHealthBars.push(id);
        continue;
      }
      healthBar.tick();
    }
    for (const id of endedNpcHealthBars) {
      this.npcHealthBars.delete(id);
    }

    const endedCharacterHealthBars: number[] = [];
    for (const [id, healthBar] of this.characterHealthBars) {
      if (
        !this.nearby.characters.some((c) => c.playerId === id) ||
        healthBar.ticks <= 0
      ) {
        endedCharacterHealthBars.push(id);
        continue;
      }
      healthBar.tick();
    }
    for (const id of endedCharacterHealthBars) {
      this.characterHealthBars.delete(id);
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

    if (this.quakeTicks) {
      this.quakeTicks = Math.max(this.quakeTicks - 1, 0);
      if (this.quakePower) {
        this.quakeOffset = randomRange(0, this.quakePower);
      } else {
        this.quakeOffset = 0;
      }

      if (randomRange(0, 1) >= 1) {
        this.quakeOffset = -this.quakeOffset;
      }

      if (!this.quakeTicks) {
        this.quakeOffset = 0;
      }
    }

    this.clearOutofRangeTicks = Math.max(this.clearOutofRangeTicks - 1, 0);
    if (!this.clearOutofRangeTicks) {
      const playerCoords = this.getPlayerCoords();
      this.nearby.characters = this.nearby.characters.filter((c) =>
        inRange(playerCoords, c.coords),
      );
      this.nearby.npcs = this.nearby.npcs.filter((n) =>
        inRange(playerCoords, n.coords),
      );
      this.nearby.items = this.nearby.items.filter((i) =>
        inRange(playerCoords, i.coords),
      );
      this.clearOutofRangeTicks = CLEAR_OUT_OF_RANGE_TICKS;
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    this.mapRenderer.render(ctx);
  }

  setMap(map: Emf) {
    this.map = map;
    this.characterChats.clear();
    this.npcChats.clear();
    this.npcHealthBars.clear();
    this.characterHealthBars.clear();
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

  isFacingChairAt(coords: Vector2): boolean {
    const spec = this.map.tileSpecRows
      .find((r) => r.y === coords.y)
      ?.tiles.find((t) => t.x === coords.x);

    if (!spec) {
      return false;
    }

    const playerAt = this.getPlayerCoords();

    switch (spec.tileSpec) {
      case MapTileSpec.ChairAll:
        return [
          { x: coords.x + 1, y: coords.y },
          { x: coords.x - 1, y: coords.y },
          { x: coords.x, y: coords.y + 1 },
          { x: coords.x, y: coords.y - 1 },
        ].includes(playerAt);
      case MapTileSpec.ChairDownRight:
        return [
          { x: coords.x + 1, y: coords.y },
          { x: coords.x, y: coords.y + 1 },
        ].includes(playerAt);
      case MapTileSpec.ChairDown:
        return playerAt.x === coords.x && playerAt.y === coords.y + 1;
      case MapTileSpec.ChairLeft:
        return playerAt.x === coords.x - 1 && playerAt.y === coords.y;
      case MapTileSpec.ChairRight:
        return playerAt.x === coords.x + 1 && playerAt.y === coords.y;
      case MapTileSpec.ChairUp:
        return playerAt.x === coords.x && playerAt.y === coords.y - 1;
      case MapTileSpec.ChairUpLeft:
        return [
          { x: coords.x + 1, y: coords.y },
          { x: coords.x, y: coords.y - 1 },
        ].includes(playerAt);
    }

    return false;
  }

  sitChair(coords: Coords) {
    const packet = new ChairRequestClientPacket();
    packet.sitAction = SitAction.Sit;
    packet.sitActionData = new ChairRequestClientPacket.SitActionDataSit();
    packet.sitActionData.coords = coords;
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
    registerRecoverHandlers(this);
    registerMessageHandlers(this);
    registerAvatarHandlers(this);
    registerFaceHandlers(this);
    registerWalkHandlers(this);
    registerSitHandlers(this);
    registerChairHandlers(this);
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
    registerEffectHandlers(this);
    registerItemHandlers(this);
  }

  occupied(coords: Vector2): boolean {
    if (
      this.nearby.characters.some(
        (c) => c.coords.x === coords.x && c.coords.y === coords.y,
      )
    ) {
      return true;
    }

    if (
      this.nearby.npcs.some(
        (n) => n.coords.x === coords.x && n.coords.y === coords.y,
      )
    ) {
      return true;
    }

    return false;
  }

  handleClick() {
    if (this.state !== GameState.InGame || this.typing) {
      return;
    }

    const itemsAtCoords = this.nearby.items.filter(
      (i) =>
        i.coords.x === this.mouseCoords.x && i.coords.y === this.mouseCoords.y,
    );
    itemsAtCoords.sort((a, b) => b.uid - a.uid);
    if (itemsAtCoords.length) {
      const packet = new ItemGetClientPacket();
      packet.itemIndex = itemsAtCoords[0].uid;
      this.bus.send(packet);
    }

    const doorAt = getDoorIntersecting(this.mousePosition);
    if (doorAt) {
      const door = this.getDoor(doorAt);
      if (door && !door.open) {
        this.openDoor(doorAt);
      }
      return;
    }

    if (
      this.isFacingChairAt(this.mouseCoords) &&
      !this.occupied(this.mouseCoords)
    ) {
      const coords = new Coords();
      coords.x = this.mouseCoords.x;
      coords.y = this.mouseCoords.y;
      this.sitChair(coords);
      return;
    }

    if (
      [SitState.Floor, SitState.Chair].includes(
        this.getPlayerCharacter()?.sitState,
      )
    ) {
      this.stand();
      return;
    }
  }

  canWalk(coords: Coords): boolean {
    if (this.nowall) {
      return true;
    }

    if (
      this.nearby.npcs.some(
        (n) => n.coords.x === coords.x && n.coords.y === coords.y,
      )
    ) {
      return false;
    }

    if (
      this.nearby.characters.some(
        (c) => c.coords.x === coords.x && c.coords.y === coords.y,
      )
    ) {
      // TODO: Ghost
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

    if (message.startsWith('#ping') && message.length === 5) {
      this.pingStart = Date.now();
      this.bus.send(new MessagePingClientPacket());
      return;
    }

    if (message.startsWith('#loc') && message.length === 4) {
      this.emit('serverChat', {
        message: `${this.mapId} x:${this.getPlayerCoords().x} y:${this.getPlayerCoords().y}`,
      });
      return;
    }

    const trimmed = message.substring(0, MAX_CHAT_LENGTH);

    if (trimmed.startsWith('#') && this.handleCommand(trimmed)) {
      return;
    }

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

  handleCommand(command: string): boolean {
    switch (command) {
      case '#ping': {
        this.pingStart = Date.now();
        this.bus.send(new MessagePingClientPacket());
        return true;
      }

      case '#loc': {
        const coords = this.getPlayerCoords();
        this.emit('serverChat', {
          message: `Your current location is at map ${this.mapId} x:${coords.x} y:${coords.y}`,
        });
        return true;
      }

      case '#engine': {
        this.emit('serverChat', {
          message: `eoweb client version: ${this.version.major}.${this.version.minor}.${this.version.patch}`,
        });
        this.emit('serverChat', {
          message: 'render engine: canvas',
        });
        return true;
      }

      case '#usage': {
        const hours = Math.floor(this.usage / 60);
        const minutes = this.usage - hours * 60;
        this.emit('serverChat', {
          message: hours
            ? `usage: ${hours}hrs. ${minutes}min.`
            : `usage: ${minutes}min.`,
        });
        return true;
      }

      case '#nowall': {
        if (this.admin === AdminLevel.Player) {
          return false;
        }

        this.nowall = !this.nowall;
        playSfxById(SfxId.TextBoxFocus);
      }
    }

    return false;
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
    const packet = this.nowall
      ? new WalkAdminClientPacket()
      : new WalkPlayerClientPacket();

    if (this.nowall) {
      playSfxById(SfxId.GhostPlayer);
    }

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

    const player = this.getPlayerCharacter();
    const metadata = this.getWeaponMetadata(player.equipment.weapon);
    const index = randomRange(0, metadata.sfx.length - 1);
    playSfxById(metadata.sfx[index]);
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
    if (this.bus) {
      this.bus.disconnect();
    }
  }

  cursorInDropRange(): boolean {
    if (!this.mouseCoords) {
      return false;
    }

    const spec = this.map.tileSpecRows
      .find((r) => r.y === this.mouseCoords.y)
      ?.tiles.find((t) => t.x === this.mouseCoords.x);
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

    const player = this.getPlayerCoords();
    const validCoords = [
      player,
      { x: player.x + 1, y: player.y }, // Right
      { x: player.x + 1, y: player.y + 1 }, // Down Right
      { x: player.x - 1, y: player.y }, // Left
      { x: player.x - 1, y: player.y - 1 }, // Up Left
      { x: player.x - 1, y: player.y + 1 }, // Down Left
      { x: player.x, y: player.y + 1 }, // Down
      { x: player.x + 1, y: player.y - 1 }, // Up Right
      { x: player.x, y: player.y - 1 }, // Up
      { x: player.x, y: player.y - 2 }, // Up + 1
      { x: player.x, y: player.y + 2 }, // Down + 1
      { x: player.x - 2, y: player.y }, // Left + 1
      { x: player.x + 2, y: player.y }, // Right + 1
    ];

    return validCoords.some(
      (c) => c.x === this.mouseCoords.x && c.y === this.mouseCoords.y,
    );
  }

  dropItem(id: number, amount: number, coords: Vector2) {
    const item = this.items.find((i) => i.id === id);
    if (!item) {
      return;
    }

    const actualAmount = Math.min(amount, item.amount);
    if (actualAmount) {
      const packet = new ItemDropClientPacket();
      packet.item = new ThreeItem();
      packet.item.id = item.id;
      packet.item.amount = actualAmount;
      packet.coords = new ByteCoords();
      packet.coords.x = coords.x + 1;
      packet.coords.y = coords.y + 1;
      this.bus.send(packet);
    }
  }

  useItem(id: number) {
    const item = this.items.find((i) => i.id === id);
    if (!item) {
      return;
    }

    const record = this.getEifRecordById(id);
    if (!record) {
      return;
    }

    if (
      ![
        ItemType.Heal,
        ItemType.Teleport,
        ItemType.Alcohol,
        ItemType.EffectPotion,
        ItemType.HairDye,
        ItemType.ExpReward,
        ItemType.CureCurse,
      ].includes(record.type)
    ) {
      return;
    }

    const packet = new ItemUseClientPacket();
    packet.itemId = id;
    this.bus.send(packet);
  }

  getEquipmentArray(): number[] {
    return [
      this.equipment.boots,
      this.equipment.accessory,
      this.equipment.gloves,
      this.equipment.belt,
      this.equipment.armor,
      this.equipment.necklace,
      this.equipment.hat,
      this.equipment.shield,
      this.equipment.weapon,
      this.equipment.ring[0],
      this.equipment.ring[1],
      this.equipment.armlet[0],
      this.equipment.armlet[1],
      this.equipment.bracer[0],
      this.equipment.bracer[1],
    ];
  }
}
