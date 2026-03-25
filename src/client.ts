import {
  AdminLevel,
  type BoardPostListing,
  CharacterBaseStats,
  type CharacterMapInfo,
  CharacterSecondaryStats,
  Coords,
  type Ecf,
  type EcfRecord,
  type Eif,
  type EifRecord,
  type Emf,
  type Enf,
  type EnfRecord,
  EquipmentPaperdoll,
  type Esf,
  type EsfRecord,
  type FileType,
  type Item,
  type ItemMapInfo,
  MapType,
  NearbyInfo,
  type NpcMapInfo,
  type NpcType,
  type OnlinePlayer,
  type PartyMember,
  RefreshRequestClientPacket,
  type ServerSettings,
  type Spell,
  Version,
  Weight,
} from 'eolib';
import mitt, { type Emitter } from 'mitt';
import { Notyf } from 'notyf';
import { Atlas } from './atlas';
import type { PacketBus } from './bus';
import type { ChatBubble } from './chat-bubble';
import { clearRectangles } from './collision';
import { getDefaultConfig, loadConfig } from './config';
import { HALF_TILE_HEIGHT, INITIAL_IDLE_TICKS, USAGE_TICKS } from './consts';
import {
  AudioController,
  AuthController,
  BankController,
  BoardController,
  ChatController,
  ChestController,
  CombatController,
  CommandController,
  InventoryController,
  LockerController,
  MapController,
  MouseController,
  NpcController,
  ShopController,
  SocialController,
  TickController,
} from './controllers';
import { getEcf, getEdf, getEif, getEmf, getEnf, getEsf } from './db';
import type { Door } from './door';
import { type DialogResourceID, type Edf, EOResourceID } from './edf';
import { Sans11Font } from './fonts/sans-11';
import { HALF_GAME_HEIGHT, HALF_GAME_WIDTH } from './game-state';
import { registerAllHandlers } from './handlers';
import { MapRenderer } from './map';
import { MinimapRenderer } from './minimap';
import { MovementController } from './movement-controller';
import {
  type CharacterAnimation,
  CharacterDeathAnimation,
  type CursorClickAnimation,
  type EffectAnimation,
  type Emote,
  type HealthBar,
  type NpcAnimation,
  NpcDeathAnimation,
} from './render';
import { playSfxById } from './sfx';
import type {
  AccountCreateData,
  CharacterCreateData,
  ClientEvents,
  IEffectMetadata,
  INPCMetadata,
  IShieldMetadata,
  ISlot,
  IWeaponMetadata,
} from './types';
import {
  EffectAnimationType,
  type EquipmentSlot,
  GameState,
  HatMaskType,
  SfxId,
  type SpellTarget,
} from './types';
import {
  getEffectMetaData,
  getHatMetadata,
  getNpcMetaData,
  getShieldMetaData,
  getWeaponMetaData,
  isoToScreen,
  screenToIso,
} from './utils';
import type { Vector2 } from './vector';

export type { ClientEvents } from './types';
// Re-export types that other files import from './client'
export {
  ChatTab,
  EquipmentSlot,
  GameState,
  getEquipmentSlotForItemType,
  getEquipmentSlotFromString,
} from './types';

export class Client {
  private emitter: Emitter<ClientEvents>;
  tickCount = 0;
  bus!: PacketBus;
  config = getDefaultConfig();
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
  eif!: Eif;
  ecf!: Ecf;
  enf!: Enf;
  esf!: Esf;
  map!: Emf;
  mapRenderer: MapRenderer;
  ambientSound: AudioBufferSourceNode | null = null;
  ambientVolume: GainNode | null = null;
  downloadQueue: { type: FileType; id: number }[] = [];
  characterAnimations: Map<number, CharacterAnimation> = new Map();
  npcAnimations: Map<number, NpcAnimation> = new Map();
  characterChats: Map<number, ChatBubble> = new Map();
  npcChats: Map<number, ChatBubble> = new Map();
  queuedNpcChats: Map<number, string[]> = new Map();
  npcHealthBars: Map<number, HealthBar> = new Map();
  characterHealthBars: Map<number, HealthBar> = new Map();
  characterEmotes: Map<number, Emote> = new Map();
  effects: EffectAnimation[] = [];
  mousePosition: Vector2 | undefined;
  mouseCoords: Vector2 | undefined;
  movementController: MovementController;
  audioController: AudioController;
  authController: AuthController;
  bankController: BankController;
  boardController: BoardController;
  chatController: ChatController;
  chestController: ChestController;
  combatController: CombatController;
  commandController: CommandController;
  inventoryController: InventoryController;
  lockerController: LockerController;
  mapController: MapController;
  mouseController: MouseController;
  npcController: NpcController;
  shopController: ShopController;
  socialController: SocialController;
  tickController: TickController;
  npcMetadata = getNpcMetaData();
  weaponMetadata: Map<number, IWeaponMetadata> = new Map();
  shieldMetadata = getShieldMetaData();
  effectMetadata = getEffectMetaData();
  hatMetadata = getHatMetadata();
  doors: Door[] = [];
  typing = false;
  clearOutofRangeTicks = 0;
  pingStart = 0;
  quakeTicks = 0;
  quakePower = 0;
  quakeOffset = 0;
  interactNpcIndex = 0;
  idleTicks = INITIAL_IDLE_TICKS;
  drunk = false;
  drunkEmoteTicks = 0;
  drunkTicks = 0;
  reconnecting = false;
  rememberMe = Boolean(localStorage.getItem('remember-me')) || false;
  loginToken = localStorage.getItem('login-token');
  lastCharacterId =
    Number.parseInt(localStorage.getItem('last-character-id') ?? '', 10) || 0;
  edfs: {
    game1: Edf | null;
    game2: Edf | null;
    jukebox: Edf | null;
  } = {
    game1: null,
    game2: null,
    jukebox: null,
  };
  chestCoords = new Coords();
  notyf = new Notyf({
    position: {
      x: 'right',
      y: 'top',
    },
  });
  goldBank = 0;
  lockerUpgrades = 0;
  boardId = 0;
  boardPosts: BoardPostListing[] = [];
  lockerCoords = new Coords();
  atlas: Atlas;
  hotbarSlots: ISlot[] = [];
  selectedSpellId = 0;
  queuedSpellId = 0;
  spellCastTimestamp = 0;
  spellTarget: SpellTarget | null = null;
  spellTargetId = 0;
  spellCooldownTicks = 0;
  menuPlayerId = 0;
  partyMembers: PartyMember[] = [];
  minimapEnabled = false;
  minimapRenderer: MinimapRenderer;
  cursorClickAnimation: CursorClickAnimation | undefined;
  autoWalkPath: Vector2[] = [];
  onlinePlayers: OnlinePlayer[] = [];
  equipmentSwap: {
    slot: EquipmentSlot;
    itemId: number;
  } | null = null;
  sans11: Sans11Font;
  debug = false;
  itemProtectionTimers: Map<
    number,
    {
      ticks: number;
      ownerId: number;
    }
  > = new Map();

  constructor() {
    this.emitter = mitt<ClientEvents>();
    this.version = new Version();
    this.version.major = 0;
    this.version.minor = 0;
    this.version.patch = 28;
    this.challenge = 0;
    getEif().then(async (eif) => {
      this.eif = eif!;
      if (eif) {
        this.weaponMetadata = getWeaponMetaData();
      }
    });
    getEcf().then((ecf) => {
      this.ecf = ecf!;
    });
    getEnf().then((enf) => {
      this.enf = enf!;
    });
    getEsf().then((esf) => {
      this.esf = esf!;
    });
    getEdf(4).then((edf) => {
      this.edfs.jukebox = edf;
    });
    getEdf(5).then((edf) => {
      this.edfs.game1 = edf;
    });
    getEdf(6).then((edf) => {
      this.edfs.game2 = edf;
    });
    this.nearby = new NearbyInfo();
    this.nearby.characters = [];
    this.nearby.npcs = [];
    this.nearby.items = [];
    this.mapRenderer = new MapRenderer(this);
    this.minimapRenderer = new MinimapRenderer(this);
    this.movementController = new MovementController(this);
    this.audioController = new AudioController(this);
    this.authController = new AuthController(this);
    this.bankController = new BankController(this);
    this.boardController = new BoardController(this);
    this.chatController = new ChatController(this);
    this.chestController = new ChestController(this);
    this.combatController = new CombatController(this);
    this.commandController = new CommandController(this);
    this.inventoryController = new InventoryController(this);
    this.lockerController = new LockerController(this);
    this.mapController = new MapController(this);
    this.mouseController = new MouseController(this);
    this.npcController = new NpcController(this);
    this.shopController = new ShopController(this);
    this.socialController = new SocialController(this);
    this.tickController = new TickController(this);
    loadConfig().then((config) => {
      this.config = config;
      const txtHost =
        document.querySelector<HTMLInputElement>('input[name="host"]')!;
      if (this.config.staticHost) {
        txtHost!.classList.add('hidden');
      }
      txtHost!.value = config.host;
      document.title = config.title;

      const mainMenuLogo =
        document.querySelector<HTMLDivElement>('#main-menu-logo')!;
      mainMenuLogo!.setAttribute('data-slogan', config.slogan);
    });
    this.atlas = new Atlas(this);
    this.sans11 = new Sans11Font(this.atlas);
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

  getNpcMetadata(graphicId: number): INPCMetadata {
    const data = this.npcMetadata.get(graphicId);
    if (data) {
      return data;
    }

    return {
      xOffset: 0,
      yOffset: 0,
      xOffsetAttack: 0,
      yOffsetAttack: 0,
      animatedStanding: false,
      nameLabelOffset: 0,
    };
  }

  getEnfRecordById(id: number): EnfRecord | undefined {
    if (!this.enf) {
      return;
    }

    return this.enf.npcs[id - 1];
  }

  getEnfRecordByBehaviorId(
    type: NpcType,
    behaviorId: number,
  ): EnfRecord | undefined {
    if (!this.enf) {
      return;
    }

    return this.enf.npcs.find(
      (n) => n.type === type && n.behaviorId === behaviorId,
    );
  }

  getWeaponMetadata(graphicId: number): IWeaponMetadata {
    // Check the live module-level map (populated by async load)
    // rather than only the snapshot, to avoid timing issues
    const live = getWeaponMetaData();
    const data = live.get(graphicId) || this.weaponMetadata.get(graphicId);
    if (data) {
      return data;
    }

    return { slash: 0, sfx: [SfxId.MeleeWeaponAttack], ranged: false };
  }

  getShieldMetadata(graphicId: number): IShieldMetadata {
    const data = this.shieldMetadata.get(graphicId);
    if (data) {
      return data;
    }

    return { back: false };
  }

  getHatMetadata(graphicId: number): HatMaskType {
    const data = this.hatMetadata.get(graphicId);
    if (data) {
      return data;
    }

    return HatMaskType.Standard;
  }

  getEifRecordById(id: number): EifRecord | undefined {
    if (!this.eif) {
      return;
    }

    return this.eif.items[id - 1];
  }

  getEcfRecordById(id: number): EcfRecord | undefined {
    if (!this.ecf) {
      return;
    }

    return this.ecf.classes[id - 1];
  }

  getEsfRecordById(id: number): EsfRecord | undefined {
    if (!this.esf) {
      return;
    }

    return this.esf.skills[id - 1];
  }

  getResourceString(id: EOResourceID): string {
    const edf = this.edfs.game2;
    if (!edf) {
      return '';
    }

    const line = edf.getLine(id);
    if (!line) {
      return '';
    }

    if (line.startsWith('*')) {
      return line.substring(1);
    }

    return line;
  }

  getDialogStrings(id: DialogResourceID): string[] {
    const edf = this.edfs.game1;
    if (!edf) {
      return ['', ''];
    }

    return [edf.getLine(id) ?? '', edf.getLine(id + 1) ?? ''];
  }

  getEffectMetadata(graphicId: number): IEffectMetadata {
    const data = this.effectMetadata.get(graphicId);
    if (data) {
      return data;
    }

    return {
      hasBehindLayer: false,
      hasTransparentLayer: false,
      hasInFrontLayer: true,
      sfx: 0,
      frames: 4,
      loops: 2,
      offsetX: 0,
      offsetY: 0,
      animationType: EffectAnimationType.Static,
      verticalMetadata: null,
      positionOffsetMetadata: null,
      randomFlickeringMetadata: null,
    };
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
    this.tickCount += 1;
    this.movementController.tick();
    this.mapRenderer.tick();

    if (this.state === GameState.InGame) {
      // Build lookup Sets once per tick — O(n) total instead of O(n) per .some() call
      const activeCharIds = new Set(
        this.nearby.characters.map((c) => c.playerId),
      );
      const activeNpcIds = new Set(this.nearby.npcs.map((n) => n.index));

      this.tickController.tickUsage();
      this.tickController.tickIdle();
      this.tickController.tickItemProtection();
      this.tickController.tickDrunk();
      this.tickController.tickOutOfRange();
      this.tickController.tickSpellQueue();
      this.tickController.tickQueuedNpcChats();

      const { playerWalking, playerDying } =
        this.tickController.tickCharacterAnimations(activeCharIds);

      this.tickController.tickCharacterEmotes(activeCharIds);
      this.tickController.tickNpcAnimations(activeNpcIds);
      this.tickController.tickCursorClick();
      this.tickController.tickCharacterChatBubbles(activeCharIds);
      this.tickController.tickHealthBars(activeCharIds, activeNpcIds);
      this.tickController.tickNpcChatBubbles(activeNpcIds);
      this.tickController.tickEffects();
      this.tickController.tickDoors();

      if (this.warpQueued && !playerWalking && !playerDying) {
        this.authController.acceptWarp();
      }

      this.tickController.tickAutoWalk();
      this.tickController.tickQuake();
    }
  }

  render(ctx: CanvasRenderingContext2D, interpolation: number) {
    this.mapRenderer.render(ctx, interpolation);
    this.minimapRenderer.render(ctx, interpolation);
  }

  setMap(map: Emf) {
    this.map = map;
    this.characterChats.clear();
    this.npcChats.clear();
    this.npcHealthBars.clear();
    this.characterHealthBars.clear();
    this.itemProtectionTimers.clear();
    if (this.map) {
      clearRectangles();
      this.mapRenderer.buildCaches();
      this.mapController.loadDoors();

      if (this.map.type === MapType.Pk) {
        playSfxById(SfxId.EnterPkMap);
      }

      this.audioController.stopAmbientSound();

      if (this.map.ambientSoundId) {
        this.audioController.startAmbientSound();
      }

      if (!this.map.mapAvailable) {
        this.minimapEnabled = false;
      }
    }
  }

  async loadMap(id: number): Promise<void> {
    const map = await getEmf(id);
    if (map) {
      this.setMap(map);
    }
  }

  showError(message: string, title = '') {
    this.emitter.emit('error', { title, message });
  }

  showConfirmation(message: string, title: string, onConfirm: () => void) {
    this.emitter.emit('confirmation', { title, message, onConfirm });
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
    registerAllHandlers(this);
  }

  clearBus() {
    this.bus = null!;
  }

  setState(state: GameState) {
    this.state = state;

    if (state === GameState.InGame && this.reconnecting) {
      this.reconnecting = false;
      this.emit('reconnected', undefined);
    }
    this.minimapEnabled = false;
    this.characterAnimations.clear();
    this.npcAnimations.clear();
    this.characterChats.clear();
    this.npcChats.clear();
    this.queuedNpcChats.clear();
    this.npcHealthBars.clear();
    this.characterHealthBars.clear();
    this.characterEmotes.clear();
    this.effects = [];
    this.autoWalkPath = [];
    this.spellTarget = null;
    this.downloadQueue = [];
    this.idleTicks = INITIAL_IDLE_TICKS;
    this.drunk = false;
    this.drunkEmoteTicks = 0;
    this.selectedSpellId = 0;
    this.queuedSpellId = 0;
    this.spellCooldownTicks = 0;
    this.menuPlayerId = 0;
    this.onlinePlayers = [];
    this.equipmentSwap = null;
    this.itemProtectionTimers.clear();
  }

  disconnect() {
    this.setState(GameState.Initial);
    this.clearSession();
    if (this.bus) {
      this.bus.disconnect();
    }
  }

  clearSession() {
    this.loginToken = '';
    this.lastCharacterId = 0;
    localStorage.removeItem('login-token');
    localStorage.removeItem('last-character-id');
  }

  setStatusLabel(type: EOResourceID, text: string) {
    this.notyf.open({
      message: `[ ${this.getResourceString(type)} ] ${text}`,
    });
  }

  refresh() {
    this.bus.send(new RefreshRequestClientPacket());
  }

  setNpcDeathAnimation(index: number) {
    const npc = this.nearby.npcs.find((n) => n.index === index);
    if (!npc) {
      return;
    }

    const current = this.npcAnimations.get(index);
    this.npcAnimations.set(index, new NpcDeathAnimation(current));
  }

  setCharacterDeathAnimation(playerId: number) {
    const character = this.getCharacterById(playerId);
    if (!character) {
      return;
    }

    const current = this.characterAnimations.get(playerId);
    this.characterAnimations.set(
      playerId,
      new CharacterDeathAnimation(current),
    );
  }

  toggleMinimap() {
    if (!this.map.mapAvailable) {
      this.setStatusLabel(
        EOResourceID.STATUS_LABEL_TYPE_WARNING,
        this.getResourceString(EOResourceID.STATUS_LABEL_NO_MAP_OF_AREA),
      );
      return;
    }

    this.minimapEnabled = !this.minimapEnabled;
  }

  addItemDrop(item: ItemMapInfo, protectedFor = 0, ownerId = 0) {
    this.nearby.items.push(item);
    if (protectedFor) {
      this.itemProtectionTimers.set(item.uid, {
        ticks: protectedFor,
        ownerId,
      });
    }
  }
}
