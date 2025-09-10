import {
  AccountAgreeClientPacket,
  AccountRequestClientPacket,
  AdminLevel,
  AttackUseClientPacket,
  BankAddClientPacket,
  BankOpenClientPacket,
  BankTakeClientPacket,
  BarberOpenClientPacket,
  ByteCoords,
  ChairRequestClientPacket,
  CharacterBaseStats,
  type CharacterDetails,
  type CharacterIcon,
  type CharacterMapInfo,
  CharacterRequestClientPacket,
  CharacterSecondaryStats,
  type CharacterSelectionListEntry,
  ChestAddClientPacket,
  ChestOpenClientPacket,
  ChestTakeClientPacket,
  CitizenOpenClientPacket,
  Coords,
  type DialogEntry,
  type DialogQuestEntry,
  DialogReply,
  type Direction,
  DoorOpenClientPacket,
  type Ecf,
  type EcfRecord,
  type Eif,
  type EifRecord,
  type Emf,
  EmoteReportClientPacket,
  Emote as EmoteType,
  type Enf,
  type EnfRecord,
  EoWriter,
  EquipmentPaperdoll,
  type Esf,
  FacePlayerClientPacket,
  FileType,
  type Gender,
  GuildOpenClientPacket,
  Item,
  ItemDropClientPacket,
  ItemGetClientPacket,
  ItemJunkClientPacket,
  type ItemMapInfo,
  ItemSpecial,
  ItemType,
  ItemUseClientPacket,
  LockerBuyClientPacket,
  LoginRequestClientPacket,
  MapTileSpec,
  MarriageOpenClientPacket,
  MessagePingClientPacket,
  NearbyInfo,
  type NpcMapInfo,
  NpcRangeRequestClientPacket,
  NpcType,
  PaperdollAddClientPacket,
  PaperdollRemoveClientPacket,
  PaperdollRequestClientPacket,
  PlayerRangeRequestClientPacket,
  PriestOpenClientPacket,
  QuestAcceptClientPacket,
  QuestUseClientPacket,
  RangeRequestClientPacket,
  RefreshRequestClientPacket,
  type ServerSettings,
  ShopBuyClientPacket,
  type ShopCraftItem,
  ShopCreateClientPacket,
  ShopOpenClientPacket,
  ShopSellClientPacket,
  type ShopTradeItem,
  SitAction,
  SitRequestClientPacket,
  SitState,
  type Spell,
  StatSkillOpenClientPacket,
  TalkAnnounceClientPacket,
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
import { Notyf } from 'notyf';
import type { PacketBus } from './bus';
import { ChatBubble } from './chat-bubble';
import {
  clearRectangles,
  getDoorIntersecting,
  getNpcIntersecting,
  getSignIntersecting,
} from './collision';
import { getDefaultConfig, loadConfig } from './config';
import {
  CLEAR_OUT_OF_RANGE_TICKS,
  HALF_TILE_HEIGHT,
  IDLE_TICKS,
  INITIAL_IDLE_TICKS,
  MAX_CHARACTER_NAME_LENGTH,
  MAX_CHAT_LENGTH,
  USAGE_TICKS,
} from './consts';
import { getEcf, getEdf, getEif, getEmf, getEnf, getEsf } from './db';
import { Door } from './door';
import { type DialogResourceID, type Edf, EOResourceID } from './edf';
import { HALF_GAME_HEIGHT, HALF_GAME_WIDTH } from './game-state';
import { GfxType, loadBitmapById } from './gfx';
import { registerAccountHandlers } from './handlers/account';
import { registerAdminInteractHandlers } from './handlers/admin-interact';
import { registerArenaHandlers } from './handlers/arena';
import { registerAttackHandlers } from './handlers/attack';
import { registerAvatarHandlers } from './handlers/avatar';
import { registerBankHandlers } from './handlers/bank';
import { registerChairHandlers } from './handlers/chair';
import { registerCharacterHandlers } from './handlers/character';
import { registerChestHandlers } from './handlers/chest';
import { registerConnectionHandlers } from './handlers/connection';
import { registerDoorHandlers } from './handlers/door';
import { registerEffectHandlers } from './handlers/effect';
import { registerEmoteHandlers } from './handlers/emote';
import { registerFaceHandlers } from './handlers/face';
import { registerInitHandlers } from './handlers/init';
import { registerItemHandlers } from './handlers/item';
import { registerLockerHandlers } from './handlers/locker';
import { registerLoginHandlers } from './handlers/login';
import { registerMessageHandlers } from './handlers/message';
import { registerMusicHandlers } from './handlers/music';
import { registerNpcHandlers } from './handlers/npc';
import { registerPaperdollHandlers } from './handlers/paperdoll';
import { registerPlayersHandlers } from './handlers/players';
import { registerQuestHandlers } from './handlers/quest';
import { registerRangeHandlers } from './handlers/range';
import { registerRecoverHandlers } from './handlers/recover';
import { registerRefreshHandlers } from './handlers/refresh';
import { registerShopHandlers } from './handlers/shop';
import { registerSitHandlers } from './handlers/sit';
import { registerTalkHandlers } from './handlers/talk';
import { registerWalkHandlers } from './handlers/walk';
import { registerWarpHandlers } from './handlers/warp';
import { registerWelcomeHandlers } from './handlers/welcome';
import { MapRenderer } from './map';
import { MovementController } from './movement-controller';
import type { CharacterAnimation } from './render/character-base-animation';
import { CharacterWalkAnimation } from './render/character-walk';
import { EffectAnimation, EffectTargetCharacter } from './render/effect';
import { Emote } from './render/emote';
import type { HealthBar } from './render/health-bar';
import type { NpcAnimation } from './render/npc-base-animation';
import { NpcDeathAnimation } from './render/npc-death';
import { playSfxById, SfxId } from './sfx';
import { ChatIcon } from './ui/chat';
import { capitalize } from './utils/capitalize';
import {
  EffectAnimationType,
  EffectMetadata,
  getEffectMetaData,
} from './utils/get-effect-metadata';
import { getHatMetadata, HatMaskType } from './utils/get-hat-metadata';
import { getNpcMetaData, NPCMetadata } from './utils/get-npc-metadata';
import { getVolumeFromDistance } from './utils/get-volume-from-distance';
import { getWeaponMetaData, WeaponMetadata } from './utils/get-weapon-metadata';
import { isoToScreen } from './utils/iso-to-screen';
import { makeDrunk } from './utils/make-drunk';
import { padWithZeros } from './utils/pad-with-zeros';
import { randomRange } from './utils/random-range';
import { getDistance, inRange } from './utils/range';
import { screenToIso } from './utils/screen-to-iso';
import type { Vector2 } from './vector';

export enum ChatTab {
  Local = 0,
  Global = 1,
  Group = 2,
  System = 3,
}

type ClientEvents = {
  error: { title: string; message: string };
  smallAlert: { title: string; message: string };
  debug: string;
  login: CharacterSelectionListEntry[];
  characterCreated: CharacterSelectionListEntry[];
  selectCharacter: undefined;
  enterGame: { news: string[] };
  chat: { tab: ChatTab; message: string; icon?: ChatIcon | null };
  serverChat: { message: string; sfxId?: SfxId | null; icon?: ChatIcon | null };
  accountCreated: undefined;
  passwordChanged: undefined;
  inventoryChanged: undefined;
  equipmentChanged: undefined;
  statsUpdate: undefined;
  reconnect: undefined;
  openQuestDialog: {
    name: string;
    questId: number;
    quests: DialogQuestEntry[];
    dialog: DialogEntry[];
  };
  openPaperdoll: {
    icon: CharacterIcon;
    details: CharacterDetails;
    equipment: EquipmentPaperdoll;
  };
  chestOpened: {
    items: ThreeItem[];
  };
  chestChanged: {
    items: ThreeItem[];
  };
  shopOpened: {
    name: string;
    craftItems: ShopCraftItem[];
    tradeItems: ShopTradeItem[];
  };
  itemSold: undefined;
  itemBought: undefined;
  bankOpened: undefined;
  bankUpdated: undefined;
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
  eif: Eif | null = null;
  ecf: Ecf | null = null;
  enf: Enf | null = null;
  esf: Esf | null = null;
  map: Emf | null = null;
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
  npcMetadata = getNpcMetaData();
  weaponMetadata = getWeaponMetaData();
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
  rememberMe = Boolean(localStorage.getItem('remember-me')) || false;
  loginToken = localStorage.getItem('login-token');
  lastCharacterId =
    Number.parseInt(localStorage.getItem('last-character-id'), 10) || 0;
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
    this.movementController = new MovementController(this);
    this.preloadCharacterSprites();
    loadConfig().then((config) => {
      this.config = config;
      const txtHost =
        document.querySelector<HTMLInputElement>('input[name="host"]');
      if (this.config.staticHost) {
        txtHost.classList.add('hidden');
      }
      txtHost.value = config.host;
      document.title = config.title;

      const mainMenuLogo =
        document.querySelector<HTMLDivElement>('#main-menu-logo');
      mainMenuLogo.setAttribute('data-slogan', config.slogan);
    });
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

  getWeaponMetadata(graphicId: number): WeaponMetadata {
    const data = this.weaponMetadata.get(graphicId);
    if (data) {
      return data;
    }

    return new WeaponMetadata(0, [SfxId.MeleeWeaponAttack], false);
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

  getResourceString(id: EOResourceID): string | undefined {
    const edf = this.edfs.game2;
    if (!edf) {
      return undefined;
    }

    return edf.getLine(id);
  }

  getDialogStrings(id: DialogResourceID): string[] | undefined {
    const edf = this.edfs.game1;
    if (!edf) {
      return undefined;
    }

    return [edf.getLine(id), edf.getLine(id + 1)];
  }

  getEffectMetadata(graphicId: number): EffectMetadata {
    const data = this.effectMetadata.get(graphicId);
    if (data) {
      return data;
    }

    return new EffectMetadata(
      false,
      false,
      true,
      0,
      4,
      2,
      0,
      0,
      EffectAnimationType.Static,
      null,
      null,
      null,
    );
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

      this.idleTicks = Math.max(this.idleTicks - 1, 0);
      if (!this.idleTicks) {
        this.emote(EmoteType.Moon);
        this.idleTicks = IDLE_TICKS;
      }

      if (this.drunk) {
        this.drunkEmoteTicks = Math.max(this.drunkEmoteTicks - 1, 0);
        if (!this.drunkEmoteTicks) {
          this.emote(EmoteType.Drunk);
          this.drunkEmoteTicks = 10 + randomRange(0, 8) * 5;
        }

        this.drunkTicks = Math.max(this.drunkTicks - 1, 0);
        if (!this.drunkTicks) {
          this.drunk = false;
          this.drunkEmoteTicks = 0;
        }
      }
    }

    const emptyQueuedNpcChats: number[] = [];
    for (const [index, messages] of this.queuedNpcChats) {
      const existingChat = this.npcChats.get(index);
      if (existingChat) {
        continue;
      }

      const npc = this.getNpcByIndex(index);
      if (!npc) {
        emptyQueuedNpcChats.push(index);
        continue;
      }

      const record = this.getEnfRecordById(npc.id);
      if (!record) {
        emptyQueuedNpcChats.push(index);
        continue;
      }

      this.emit('chat', {
        message: `${capitalize(record.name)} ${messages[0]}`,
        tab: ChatTab.Local,
      });
      this.npcChats.set(index, new ChatBubble(messages[0]));

      if (messages.length > 1) {
        messages.splice(0, 1);
      } else {
        emptyQueuedNpcChats.push(index);
      }
    }
    for (const index of emptyQueuedNpcChats) {
      this.queuedNpcChats.delete(index);
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

    const endedCharacterEmotes: number[] = [];
    for (const [id, emote] of this.characterEmotes) {
      if (
        !emote.ticks ||
        !this.nearby.characters.some((c) => c.playerId === id)
      ) {
        endedCharacterEmotes.push(id);
        continue;
      }
      emote.tick();
    }
    for (const id of endedCharacterEmotes) {
      this.characterEmotes.delete(id);
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

    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];
      if (!effect.ticks && !effect.loops) {
        this.effects.splice(i, 1);
        continue;
      }
      effect.tick();
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
      clearRectangles();
      this.mapRenderer.buildCaches();
      this.loadDoors();

      if (this.ambientSound && this.ambientVolume) {
        this.ambientSound.disconnect();
        this.ambientSound = null;
        this.ambientVolume.disconnect();
        this.ambientVolume = null;
      }

      if (this.map.ambientSoundId) {
        const context = new AudioContext();
        fetch(`/sfx/sfx${padWithZeros(this.map.ambientSoundId, 3)}.wav`)
          .then((response) => response.arrayBuffer())
          .then((data) => context.decodeAudioData(data))
          .then((buffer) => {
            this.ambientSound = context.createBufferSource();
            this.ambientVolume = context.createGain();
            this.ambientSound.connect(this.ambientVolume);
            this.ambientSound.buffer = buffer;
            this.ambientSound.loop = true;
            this.ambientVolume.connect(context.destination);
            this.setAmbientVolume();
            this.ambientSound.start(0);
          });
      } else if (this.ambientSound && this.ambientVolume) {
        this.ambientSound.disconnect();
        this.ambientSound = null;
        this.ambientVolume.disconnect();
        this.ambientVolume = null;
      }
    }
  }

  setAmbientVolume() {
    if (!this.map || !this.ambientSound) {
      return;
    }

    const playerAt = this.getPlayerCoords();
    const sources: { coords: Vector2; distance: number }[] = [];
    for (const row of this.map.tileSpecRows) {
      for (const tile of row.tiles) {
        if (tile.tileSpec === MapTileSpec.AmbientSource) {
          const coords = { x: tile.x, y: row.y };
          const distance = getDistance(playerAt, coords);
          sources.push({ coords, distance });
        }
      }
    }

    sources.sort((a, b) => a.distance - b.distance);
    if (sources.length) {
      const distance = sources[0].distance;
      const volume = getVolumeFromDistance(distance);
      this.ambientVolume.gain.value = volume;
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
          this.doors.push(new Door(coords, warpTile.warp.door));
        }
      }
    }
  }

  getDoor(coords: Coords): Door | undefined {
    return this.doors.find(
      (d) => d.coords.x === coords.x && d.coords.y === coords.y,
    );
  }

  chestAt(coords: Coords): boolean {
    return this.map.tileSpecRows.some(
      (r) =>
        r.y === coords.y &&
        r.tiles.some(
          (t) => t.x === coords.x && t.tileSpec === MapTileSpec.Chest,
        ),
    );
  }

  openDoor(coords: Coords) {
    const door = this.getDoor(coords);
    if (!door || door.open) {
      return;
    }

    if (
      door.key > 1 &&
      !this.items.some((i) => {
        const record = this.getEifRecordById(i.id);
        if (!record) {
          return false;
        }

        return record.spec1 === door.key;
      })
    ) {
      const keyName =
        this.eif.items.find(
          (i) => i.type === ItemType.Key && i.spec1 === door.key,
        )?.name || 'Unknown';
      playSfxById(SfxId.DoorOrChestLocked);
      this.setStatusLabel(
        EOResourceID.STATUS_LABEL_TYPE_WARNING,
        `${this.getResourceString(EOResourceID.STATUS_LABEL_THE_DOOR_IS_LOCKED_EXCLAMATION)} - ${keyName}`,
      );
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
    registerAdminInteractHandlers(this);
    registerQuestHandlers(this);
    registerMusicHandlers(this);
    registerEmoteHandlers(this);
    registerPaperdollHandlers(this);
    registerChestHandlers(this);
    registerShopHandlers(this);
    registerBankHandlers(this);
    registerLockerHandlers(this);
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

    if (
      [SitState.Floor, SitState.Chair].includes(
        this.getPlayerCharacter()?.sitState,
      )
    ) {
      this.stand();
      return;
    }

    if (this.mouseCoords) {
      // Check for items first
      const itemsAtCoords = this.nearby.items.filter(
        (i) =>
          i.coords.x === this.mouseCoords.x &&
          i.coords.y === this.mouseCoords.y,
      );
      itemsAtCoords.sort((a, b) => b.uid - a.uid);
      if (itemsAtCoords.length) {
        const packet = new ItemGetClientPacket();
        packet.itemIndex = itemsAtCoords[0].uid;
        this.bus.send(packet);
        return;
      }

      // Check tile specs for chests and chairs
      const tileSpec = this.map.tileSpecRows
        .find((r) => r.y === this.mouseCoords.y)
        ?.tiles.find((t) => t.x === this.mouseCoords.x);

      if (tileSpec) {
        if (tileSpec.tileSpec === MapTileSpec.Chest) {
          this.openChest(this.mouseCoords);
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
      }
    }

    const npcAt = getNpcIntersecting(this.mousePosition);
    if (npcAt) {
      const npc = this.nearby.npcs.find((n) => n.index === npcAt.id);
      if (npc) {
        this.clickNpc(npc);
        return;
      }
    }

    const doorAt = getDoorIntersecting(this.mousePosition);
    if (doorAt) {
      const door = this.getDoor(doorAt);
      if (door && !door.open) {
        this.openDoor(doorAt);
      }
      return;
    }

    const signAt = getSignIntersecting(this.mousePosition);
    if (signAt) {
      const sign = this.mapRenderer.getSign(signAt.x, signAt.y);
      if (sign) {
        this.emit('smallAlert', sign);
      }
    }
  }

  clickNpc(npc: NpcMapInfo) {
    const record = this.getEnfRecordById(npc.id);
    if (!record) {
      return;
    }

    switch (record.type) {
      case NpcType.Quest: {
        const packet = new QuestUseClientPacket();
        packet.npcIndex = npc.index;
        packet.questId = 0;
        this.bus.send(packet);
        break;
      }
      case NpcType.Bank: {
        const packet = new BankOpenClientPacket();
        packet.npcIndex = npc.index;
        this.bus.send(packet);
        break;
      }
      case NpcType.Shop: {
        const packet = new ShopOpenClientPacket();
        packet.npcIndex = npc.index;
        this.bus.send(packet);
        break;
      }
      case NpcType.Barber: {
        const packet = new BarberOpenClientPacket();
        packet.npcIndex = npc.index;
        this.bus.send(packet);
        break;
      }
      case NpcType.Guild: {
        const packet = new GuildOpenClientPacket();
        packet.npcIndex = npc.index;
        this.bus.send(packet);
        break;
      }
      case NpcType.Inn: {
        const packet = new CitizenOpenClientPacket();
        packet.npcIndex = npc.index;
        this.bus.send(packet);
        break;
      }
      case NpcType.Lawyer: {
        const packet = new MarriageOpenClientPacket();
        packet.npcIndex = npc.index;
        this.bus.send(packet);
        break;
      }
      case NpcType.Priest: {
        const packet = new PriestOpenClientPacket();
        packet.npcIndex = npc.index;
        this.bus.send(packet);
        break;
      }
      case NpcType.Trainer: {
        const packet = new StatSkillOpenClientPacket();
        packet.npcIndex = npc.index;
        this.bus.send(packet);
        break;
      }
      default:
        return;
    }

    this.interactNpcIndex = npc.index;
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

    const warp = this.map.warpRows
      .find((r) => r.y === coords.y)
      ?.tiles.find((t) => t.x === coords.x);
    if (warp) {
      if (warp.warp.levelRequired > this.level) {
        this.setStatusLabel(
          EOResourceID.STATUS_LABEL_TYPE_INFORMATION,
          `${this.getResourceString(EOResourceID.STATUS_LABEL_NOT_READY_TO_USE_ENTRANCE)} - LVL ${warp.warp.levelRequired}`,
        );
        return false;
      }
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

    const trimmed = (this.drunk ? makeDrunk(message) : message).substring(
      0,
      MAX_CHAT_LENGTH,
    );

    if (trimmed.startsWith('#') && this.handleCommand(trimmed)) {
      return;
    }

    if (trimmed.startsWith('@') && this.admin !== AdminLevel.Player) {
      const packet = new TalkAnnounceClientPacket();
      packet.message = trimmed.substring(1);
      this.characterChats.set(this.playerId, new ChatBubble(packet.message));
      this.emit('chat', {
        icon: ChatIcon.GlobalAnnounce,
        tab: ChatTab.Local,
        message: `${capitalize(this.name)} ${packet.message}`,
      });
      this.emit('chat', {
        icon: ChatIcon.GlobalAnnounce,
        tab: ChatTab.Group,
        message: `${capitalize(this.name)} ${packet.message}`,
      });
      this.emit('chat', {
        icon: ChatIcon.GlobalAnnounce,
        tab: ChatTab.Global,
        message: `${capitalize(this.name)} ${packet.message}`,
      });
      playSfxById(SfxId.AdminAnnounceReceived);
      this.bus.send(packet);
      return;
    }

    const packet = new TalkReportClientPacket();
    packet.message = trimmed;
    this.bus.send(packet);

    this.characterChats.set(this.playerId, new ChatBubble(trimmed));

    this.emit('chat', {
      tab: ChatTab.Local,
      message: `${capitalize(this.name)} ${trimmed}`,
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

  login(username: string, password: string, rememberMe: boolean) {
    const writer = new EoWriter();
    const packet = new LoginRequestClientPacket();
    packet.username = username;
    packet.password = password;
    packet.serialize(writer);

    if (rememberMe) {
      writer.addChar(1);
    }

    this.bus.sendBuf(packet.family, packet.action, writer.toByteArray());
  }

  selectCharacter(characterId: number) {
    const packet = new WelcomeRequestClientPacket();
    packet.characterId = characterId;
    this.bus.send(packet);

    this.lastCharacterId = characterId;
    localStorage.setItem('last-character-id', `${characterId}`);
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
    this.idleTicks = INITIAL_IDLE_TICKS;
  }

  walk(direction: Direction, coords: Coords, timestamp: number) {
    const packet = this.nowall
      ? new WalkAdminClientPacket()
      : new WalkPlayerClientPacket();

    if (this.nowall) {
      playSfxById(SfxId.GhostPlayer);
    }

    const spec = this.map.tileSpecRows
      .find((r) => r.y === coords.y)
      ?.tiles.find((t) => t.x === coords.x);

    if (spec && spec.tileSpec === MapTileSpec.Water) {
      const metadata = this.getEffectMetadata(9);
      playSfxById(metadata.sfx);
      this.effects.push(
        new EffectAnimation(
          9,
          new EffectTargetCharacter(this.playerId),
          metadata,
        ),
      );
    }

    packet.walkAction = new WalkAction();
    packet.walkAction.direction = direction;
    packet.walkAction.coords = coords;
    packet.walkAction.timestamp = timestamp;
    this.bus.send(packet);
    this.idleTicks = INITIAL_IDLE_TICKS;
    this.setAmbientVolume();
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

    const spec = this.map.tileSpecRows
      .find((r) => r.y === player.coords.y)
      ?.tiles.find((t) => t.x === player.coords.x);

    if (spec && spec.tileSpec === MapTileSpec.Water) {
      const metadata = this.getEffectMetadata(9);
      playSfxById(metadata.sfx);
      this.effects.push(
        new EffectAnimation(
          9,
          new EffectTargetCharacter(this.playerId),
          metadata,
        ),
      );
    }
    this.idleTicks = INITIAL_IDLE_TICKS;
  }

  sit() {
    const packet = new SitRequestClientPacket();
    packet.sitAction = SitAction.Sit;
    packet.sitActionData = new SitRequestClientPacket.SitActionDataSit();
    packet.sitActionData.cursorCoords = new Coords();
    packet.sitActionData.cursorCoords.x = 0;
    packet.sitActionData.cursorCoords.y = 0;
    this.bus.send(packet);
    this.idleTicks = INITIAL_IDLE_TICKS;
  }

  stand() {
    const packet = new SitRequestClientPacket();
    packet.sitAction = SitAction.Stand;
    this.bus.send(packet);
    this.idleTicks = INITIAL_IDLE_TICKS;
  }

  disconnect() {
    this.state = GameState.Initial;
    this.clearSession();
    if (this.bus) {
      this.bus.disconnect();
    }
  }

  clearSession() {
    this.loginToken = '';
    this.lastCharacterId = undefined;
    localStorage.removeItem('login-token');
    localStorage.removeItem('last-character-id');
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

  junkItem(id: number, amount: number) {
    const packet = new ItemJunkClientPacket();
    packet.item = new Item();
    packet.item.id = id;
    packet.item.amount = amount;
    this.bus.send(packet);
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

    let slot = getEquipmentSlotForItemType(record.type);
    if (typeof slot === 'number') {
      const equipment = this.getEquipmentArray();
      if (
        equipment[slot] &&
        [
          EquipmentSlot.Ring1,
          EquipmentSlot.Armlet1,
          EquipmentSlot.Bracer1,
        ].includes(slot)
      ) {
        slot++;
      }

      this.equipItem(slot, item.id);
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

    if (record.type === ItemType.Teleport && !this.map.canScroll) {
      this.setStatusLabel(
        EOResourceID.STATUS_LABEL_TYPE_ACTION,
        this.getResourceString(EOResourceID.STATUS_LABEL_NOTHING_HAPPENED),
      );
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

  questReply(questId: number, dialogId: number, action: number | null) {
    const packet = new QuestAcceptClientPacket();
    packet.sessionId = this.sessionId;
    packet.questId = questId;
    packet.npcIndex = this.interactNpcIndex;
    packet.dialogId = dialogId;
    packet.replyType = action ? DialogReply.Link : DialogReply.Ok;
    if (action) {
      packet.replyTypeData = new QuestAcceptClientPacket.ReplyTypeDataLink();
      packet.replyTypeData.action = action;
    } else {
      packet.replyTypeData = new QuestAcceptClientPacket.ReplyTypeDataOk();
    }
    this.bus.send(packet);
  }

  emote(type: EmoteType) {
    const packet = new EmoteReportClientPacket();
    packet.emote = type;
    this.characterEmotes.set(this.playerId, new Emote(type));
    this.bus.send(packet);
  }

  requestPaperdoll(playerId: number) {
    const packet = new PaperdollRequestClientPacket();
    packet.playerId = playerId;
    this.bus.send(packet);
  }

  unequipItem(slot: EquipmentSlot) {
    const equipment = this.getEquipmentArray();
    if (!equipment[slot]) {
      return;
    }

    const itemId = equipment[slot];

    const record = this.getEifRecordById(itemId);
    if (record.special === ItemSpecial.Cursed) {
      return;
    }

    const packet = new PaperdollRemoveClientPacket();
    packet.itemId = itemId;
    packet.subLoc = 0;

    if (
      [
        EquipmentSlot.Ring2,
        EquipmentSlot.Armlet2,
        EquipmentSlot.Bracer2,
      ].includes(slot)
    ) {
      packet.subLoc = 1;
    }

    this.bus.send(packet);
  }

  equipItem(slot: EquipmentSlot, itemId: number) {
    const item = this.items.find((i) => i.id === itemId && i.amount > 0);
    if (!item) {
      return;
    }

    const equipment = this.getEquipmentArray();
    if (equipment[slot]) {
      this.setStatusLabel(
        EOResourceID.STATUS_LABEL_TYPE_INFORMATION,
        this.getResourceString(
          EOResourceID.STATUS_LABEL_ITEM_EQUIP_TYPE_ALREADY_EQUIPPED,
        ),
      );
      return;
    }

    const character = this.getPlayerCharacter();
    if (!character) {
      return;
    }

    const record = this.getEifRecordById(item.id);
    if (!record) {
      return;
    }

    if (record.type === ItemType.Armor && record.spec2 !== character.gender) {
      this.setStatusLabel(
        EOResourceID.STATUS_LABEL_TYPE_INFORMATION,
        this.getResourceString(
          EOResourceID.STATUS_LABEL_ITEM_EQUIP_DOES_NOT_FIT_GENDER,
        ),
      );
      return;
    }

    if (record.classRequirement && record.classRequirement !== this.classId) {
      const classRecord = this.getEcfRecordById(record.classRequirement);
      this.setStatusLabel(
        EOResourceID.STATUS_LABEL_TYPE_INFORMATION,
        `${this.getResourceString(EOResourceID.STATUS_LABEL_ITEM_EQUIP_CAN_ONLY_BE_USED_BY)} ${classRecord?.name || 'Unknown'}`,
      );
      return;
    }

    if (record.strRequirement > this.baseStats.str) {
      this.setStatusLabel(
        EOResourceID.STATUS_LABEL_TYPE_INFORMATION,
        `${this.getResourceString(EOResourceID.STATUS_LABEL_ITEM_EQUIP_THIS_ITEM_REQUIRES)} ${record.strRequirement} STR`,
      );
      return;
    }

    if (record.intRequirement > this.baseStats.intl) {
      this.setStatusLabel(
        EOResourceID.STATUS_LABEL_TYPE_INFORMATION,
        `${this.getResourceString(EOResourceID.STATUS_LABEL_ITEM_EQUIP_THIS_ITEM_REQUIRES)} ${record.intRequirement} INT`,
      );
      return;
    }

    if (record.wisRequirement > this.baseStats.wis) {
      this.setStatusLabel(
        EOResourceID.STATUS_LABEL_TYPE_INFORMATION,
        `${this.getResourceString(EOResourceID.STATUS_LABEL_ITEM_EQUIP_THIS_ITEM_REQUIRES)} ${record.wisRequirement} WIS`,
      );
      return;
    }

    if (record.agiRequirement > this.baseStats.agi) {
      this.setStatusLabel(
        EOResourceID.STATUS_LABEL_TYPE_INFORMATION,
        `${this.getResourceString(EOResourceID.STATUS_LABEL_ITEM_EQUIP_THIS_ITEM_REQUIRES)} ${record.agiRequirement} AGI`,
      );
      return;
    }

    if (record.chaRequirement > this.baseStats.cha) {
      this.setStatusLabel(
        EOResourceID.STATUS_LABEL_TYPE_INFORMATION,
        `${this.getResourceString(EOResourceID.STATUS_LABEL_ITEM_EQUIP_THIS_ITEM_REQUIRES)} ${record.chaRequirement} CHA`,
      );
      return;
    }

    if (record.conRequirement > this.baseStats.con) {
      this.setStatusLabel(
        EOResourceID.STATUS_LABEL_TYPE_INFORMATION,
        `${this.getResourceString(EOResourceID.STATUS_LABEL_ITEM_EQUIP_THIS_ITEM_REQUIRES)} ${record.conRequirement} CON`,
      );
      return;
    }

    if (record.levelRequirement > this.level) {
      this.setStatusLabel(
        EOResourceID.STATUS_LABEL_TYPE_INFORMATION,
        `${this.getResourceString(EOResourceID.STATUS_LABEL_ITEM_EQUIP_THIS_ITEM_REQUIRES)} LVL ${record.levelRequirement}`,
      );
      return;
    }

    const packet = new PaperdollAddClientPacket();
    packet.itemId = itemId;
    packet.subLoc = 0;

    if (
      [
        EquipmentSlot.Ring2,
        EquipmentSlot.Armlet2,
        EquipmentSlot.Bracer2,
      ].includes(slot)
    ) {
      packet.subLoc = 1;
    }

    this.bus.send(packet);
  }

  isVisisbleEquipmentChange(slot: EquipmentSlot): boolean {
    return [
      EquipmentSlot.Boots,
      EquipmentSlot.Armor,
      EquipmentSlot.Hat,
      EquipmentSlot.Shield,
      EquipmentSlot.Weapon,
    ].includes(slot);
  }

  setEquipmentSlot(slot: EquipmentSlot, itemId: number) {
    switch (slot) {
      case EquipmentSlot.Accessory:
        this.equipment.accessory = itemId;
        break;
      case EquipmentSlot.Armlet1:
        this.equipment.armlet[0] = itemId;
        break;
      case EquipmentSlot.Armlet2:
        this.equipment.armlet[1] = itemId;
        break;
      case EquipmentSlot.Armor:
        this.equipment.armor = itemId;
        break;
      case EquipmentSlot.Belt:
        this.equipment.belt = itemId;
        break;
      case EquipmentSlot.Boots:
        this.equipment.boots = itemId;
        break;
      case EquipmentSlot.Bracer1:
        this.equipment.bracer[0] = itemId;
        break;
      case EquipmentSlot.Bracer2:
        this.equipment.bracer[1] = itemId;
        break;
      case EquipmentSlot.Gloves:
        this.equipment.gloves = itemId;
        break;
      case EquipmentSlot.Hat:
        this.equipment.hat = itemId;
        break;
      case EquipmentSlot.Necklace:
        this.equipment.necklace = itemId;
        break;
      case EquipmentSlot.Ring1:
        this.equipment.ring[0] = itemId;
        break;
      case EquipmentSlot.Ring2:
        this.equipment.ring[1] = itemId;
        break;
      case EquipmentSlot.Shield:
        this.equipment.shield = itemId;
        break;
      case EquipmentSlot.Weapon:
        this.equipment.weapon = itemId;
        break;
    }
  }

  setNearbyCharacterEquipment(
    playerId: number,
    slot: EquipmentSlot,
    graphicId: number,
  ) {
    const character = this.getCharacterById(playerId);
    if (!character) {
      return;
    }

    switch (slot) {
      case EquipmentSlot.Boots:
        character.equipment.boots = graphicId;
        break;
      case EquipmentSlot.Armor:
        character.equipment.armor = graphicId;
        break;
      case EquipmentSlot.Hat:
        character.equipment.hat = graphicId;
        break;
      case EquipmentSlot.Shield:
        character.equipment.shield = graphicId;
        break;
      case EquipmentSlot.Weapon:
        character.equipment.weapon = graphicId;
        break;
    }
  }

  openChest(coords: Vector2) {
    const chestKeys: number[] = [];
    for (const item of this.map.items) {
      if (
        item.coords.x === coords.x &&
        item.coords.y === coords.y &&
        item.key &&
        !chestKeys.includes(item.key)
      ) {
        chestKeys.push(item.key);
      }
    }

    const keys: number[] = [];
    for (const item of this.items) {
      const record = this.getEifRecordById(item.id);
      if (!record) {
        continue;
      }

      if (
        record.type === ItemType.Key &&
        record.spec1 &&
        !keys.includes(record.spec1)
      ) {
        keys.push(record.spec1);
      }
    }

    let keyName = '';
    const haveKeys = chestKeys.every((k) => {
      if (!keys.includes(k)) {
        const record = this.eif.items.find(
          (i) => i.type === ItemType.Key && i.spec1 === k,
        );
        keyName = record.name;
        return false;
      }

      return true;
    });

    if (!haveKeys) {
      playSfxById(SfxId.DoorOrChestLocked);
      this.setStatusLabel(
        EOResourceID.STATUS_LABEL_TYPE_WARNING,
        `${this.getResourceString(EOResourceID.STATUS_LABEL_THE_CHEST_IS_LOCKED_EXCLAMATION)} - ${keyName}`,
      );
      return;
    }

    const packet = new ChestOpenClientPacket();
    packet.coords = new Coords();
    packet.coords.x = coords.x;
    packet.coords.y = coords.y;
    this.chestCoords = packet.coords;
    this.bus.send(packet);
  }

  takeChestItem(itemId: number) {
    const packet = new ChestTakeClientPacket();
    packet.coords = this.chestCoords;
    packet.takeItemId = itemId;
    this.bus.send(packet);
  }

  addChestItem(itemId: number, amount: number) {
    const packet = new ChestAddClientPacket();
    packet.addItem = new ThreeItem();
    packet.addItem.id = itemId;
    packet.addItem.amount = amount;
    packet.coords = this.chestCoords;
    this.bus.send(packet);
  }

  buyShopItem(itemId: number, amount: number) {
    const packet = new ShopBuyClientPacket();
    packet.sessionId = this.sessionId;
    packet.buyItem = new Item();
    packet.buyItem.id = itemId;
    packet.buyItem.amount = amount;
    this.bus.send(packet);
  }

  sellShopItem(itemId: number, amount: number) {
    const packet = new ShopSellClientPacket();
    packet.sessionId = this.sessionId;
    packet.sellItem = new Item();
    packet.sellItem.id = itemId;
    packet.sellItem.amount = amount;
    this.bus.send(packet);
  }

  craftShopItem(itemId: number) {
    const packet = new ShopCreateClientPacket();
    packet.sessionId = this.sessionId;
    packet.craftItemId = itemId;
    this.bus.send(packet);
  }

  setStatusLabel(type: EOResourceID, text: string) {
    this.notyf.open({
      message: `[ ${this.getResourceString(type)} ] ${text}`,
    });
  }

  refresh() {
    this.bus.send(new RefreshRequestClientPacket());
  }

  depositGold(amount: number) {
    const gold = this.items.find((i) => i.id === 1);
    if (!gold || gold.amount < amount) {
      return;
    }

    const packet = new BankAddClientPacket();
    packet.sessionId = this.sessionId;
    packet.amount = amount;
    this.bus.send(packet);
  }

  withdrawGold(amount: number) {
    if (this.goldBank < amount) {
      return;
    }

    const packet = new BankTakeClientPacket();
    packet.sessionId = this.sessionId;
    packet.amount = amount;
    this.bus.send(packet);
  }

  upgradeLocker() {
    this.bus.send(new LockerBuyClientPacket());
  }
}
