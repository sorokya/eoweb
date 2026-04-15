import {
  AdminLevel,
  CharacterBaseStats,
  type CharacterMapInfo,
  CharacterSecondaryStats,
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
  InitInitClientPacket,
  type Item,
  type ItemMapInfo,
  MapType,
  NearbyInfo,
  type NpcKilledData,
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
import { Application, Container } from 'pixi.js';
import { Atlas } from '@/atlas';
import { PacketBus } from '@/bus';
import { clearRectangles } from '@/collision';
import { getDefaultConfig, loadConfig } from '@/config';
import { HALF_TILE_HEIGHT, INITIAL_IDLE_TICKS, MAX_CHALLENGE } from '@/consts';
import {
  AlertController,
  AnimationController,
  AudioController,
  AuthenticationController,
  BankController,
  BoardController,
  ChatController,
  ChestController,
  CleanupController,
  CommandController,
  DrunkController,
  GuildController,
  InventoryController,
  ItemProtectionController,
  KeyboardController,
  LockerController,
  MapController,
  MouseController,
  MovementController,
  NpcController,
  QuakeController,
  QuestController,
  SessionController,
  ShopController,
  SocialController,
  SpellController,
  StatSkillController,
  ToastController,
  TradeController,
  UsageController,
  ViewportController,
} from '@/controllers';
import { getEcf, getEdf, getEif, getEmf, getEnf, getEsf } from '@/db';
import { DialogResourceID, type Edf, EOResourceID } from '@/edf';
import { Sans11Font } from '@/fonts';
import { GameState } from '@/game-state';
import { GfxLoader } from '@/gfx';
import { registerAllHandlers } from '@/handlers';
import { defaultLocale, formatLocaleString, locales } from '@/locale';
import { MapRenderer } from '@/map';
import { MinimapRenderer } from '@/minimap';
import { CharacterDeathAnimation, NpcDeathAnimation } from '@/render';
import { playSfxById, SfxId } from '@/sfx';
import type { ISlot } from '@/ui/enums';
import type {
  EffectMetadata,
  NPCMetadata,
  ShieldMetadata,
  WeaponMetadata,
} from '@/utils';
import {
  capitalize,
  EffectAnimationType,
  getEffectMetaData,
  getHatMetadata,
  getNpcMetaData,
  getShieldMetaData,
  getWeaponMetaData,
  HatMaskType,
  isoToScreen,
  randomRange,
  screenToIso,
} from '@/utils';
import type { Vector2 } from '@/vector';
import type { ClientEvents } from './events';

export class Client {
  private emitter: Emitter<ClientEvents>;
  container!: HTMLDivElement;
  app!: Application;
  worldContainer!: Container;
  uiContainer!: Container;
  minimapContainer!: Container;
  width = 800;
  height = 600;
  zoom = 1;
  tickCount = 0;
  bus = new PacketBus();
  config = getDefaultConfig();
  version: Version;
  challenge: number;
  hdid = String(Math.floor(Math.random() * 2147483647));
  playerId = 0;
  characterId = 0;
  name = '';
  title = '';
  home = '';
  partner = '';
  guildName = '';
  guildTag = '';
  guildRank = 0;
  guildRankName = '';
  classId = 0;
  admin = AdminLevel.Player;
  level = 0;
  experience = 0;
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
  postConnectState?: GameState;
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
  downloadQueue: { type: FileType; id: number }[] = [];
  mousePosition: Vector2 | undefined;
  mouseCoords: Vector2 | undefined;
  viewportController: ViewportController;
  animationController: AnimationController;
  movementController: MovementController;
  keyboardController: KeyboardController;
  audioController: AudioController;
  authenticationController: AuthenticationController;
  bankController: BankController;
  boardController: BoardController;
  chatController: ChatController;
  chestController: ChestController;
  cleanupController: CleanupController;
  drunkController: DrunkController;
  commandController: CommandController;
  inventoryController: InventoryController;
  lockerController: LockerController;
  mapController: MapController;
  mouseController: MouseController;
  npcController: NpcController;
  questController: QuestController;
  sessionController: SessionController;
  shopController: ShopController;
  socialController: SocialController;
  statSkillController: StatSkillController;
  itemProtectionController: ItemProtectionController;
  quakeController: QuakeController;
  spellController: SpellController;
  usageController: UsageController;
  tradeController: TradeController;
  guildController: GuildController;
  alertController: AlertController;
  toastController: ToastController;
  npcMetadata = getNpcMetaData();
  weaponMetadata: Map<number, WeaponMetadata> = new Map();
  shieldMetadata = getShieldMetaData();
  effectMetadata = getEffectMetaData();
  hatMetadata = getHatMetadata();
  typing = false;
  reconnecting = false;
  edfs: {
    game1: Edf | null;
    game2: Edf | null;
    jukebox: Edf | null;
  } = {
    game1: null,
    game2: null,
    jukebox: null,
  };
  atlas: Atlas;
  gfxLoader = new GfxLoader();
  hotbarSlots: ISlot[] = [];
  sans11: Sans11Font;
  menuPlayerId = 0;
  partyMembers: PartyMember[] = [];
  minimapEnabled = false;
  minimapRenderer: MinimapRenderer;
  onlinePlayers: OnlinePlayer[] = [];
  playerTriggeredDisconnect = false;
  locale = locales[defaultLocale];

  constructor() {
    registerAllHandlers(this);
    this.container = document.querySelector('#game-container')!;
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
    this.viewportController = new ViewportController(this);
    this.animationController = new AnimationController(this);
    this.movementController = new MovementController(this);
    this.keyboardController = new KeyboardController(this);
    this.audioController = new AudioController(this);
    this.authenticationController = new AuthenticationController(this);
    this.bankController = new BankController(this);
    this.boardController = new BoardController(this);
    this.chatController = new ChatController(this);
    this.chestController = new ChestController(this);
    this.cleanupController = new CleanupController(this);
    this.commandController = new CommandController(this);
    this.drunkController = new DrunkController(this);
    this.inventoryController = new InventoryController(this);
    this.itemProtectionController = new ItemProtectionController();
    this.alertController = new AlertController();
    this.lockerController = new LockerController(this);
    this.mapController = new MapController(this);
    this.mouseController = new MouseController(this);
    this.npcController = new NpcController(this);
    this.questController = new QuestController(this);
    this.quakeController = new QuakeController();
    this.sessionController = new SessionController(this);
    this.shopController = new ShopController(this);
    this.socialController = new SocialController(this);
    this.spellController = new SpellController(this);
    this.statSkillController = new StatSkillController(this);
    this.usageController = new UsageController(this);
    this.tradeController = new TradeController(this);
    this.guildController = new GuildController(this);
    this.toastController = new ToastController();
    loadConfig().then((config) => {
      this.config = config;
      const txtHost =
        document.querySelector<HTMLInputElement>('input[name="host"]')!;

      if (txtHost) {
        if (this.config.staticHost) {
          txtHost!.classList.add('hidden');
        }
        txtHost!.value = config.host;
      }

      document.title = config.title;

      const mainMenuLogo =
        document.querySelector<HTMLDivElement>('#main-menu-logo')!;
      if (mainMenuLogo) {
        mainMenuLogo!.setAttribute('data-slogan', config.slogan);
      }
    });
    this.atlas = new Atlas(this);
    this.sans11 = new Sans11Font(this.atlas);
  }

  async initPixi() {
    this.app = new Application();
    await this.app.init({
      width: this.viewportController.getGameWidth(),
      height: this.viewportController.getGameHeight(),
      background: '#000000',
      antialias: false,
    });

    this.app.renderer.canvas.id = 'game';
    this.app.renderer.canvas.style.imageRendering = 'pixelated';

    const gameEl = document.querySelector('#game');
    if (gameEl) {
      gameEl.replaceWith(this.app.renderer.canvas);
    } else {
      document
        .querySelector('#game-container')!
        .appendChild(this.app.renderer.canvas);
    }

    this.worldContainer = new Container();
    this.uiContainer = new Container();
    this.minimapContainer = new Container();

    this.app.stage.addChild(this.worldContainer);
    this.app.stage.addChild(this.uiContainer);
    this.app.stage.addChild(this.minimapContainer);

    // Sync CSS size now that the canvas is in the DOM
    this.viewportController.resizeCanvases();
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

    return {
      xOffset: 0,
      yOffset: 0,
      xOffsetAttack: 0,
      yOffsetAttack: 0,
      animatedStanding: false,
      nameLabelOffset: 0,
      transparent: false,
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

  getWeaponMetadata(graphicId: number): WeaponMetadata {
    // Check the live module-level map (populated by async load)
    // rather than only the snapshot, to avoid timing issues
    const live = getWeaponMetaData();
    const data = live.get(graphicId) || this.weaponMetadata.get(graphicId);
    if (data) {
      return data;
    }

    return { slash: 0, sfx: [SfxId.MeleeWeaponAttack], ranged: false };
  }

  getShieldMetadata(graphicId: number): ShieldMetadata {
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

  getEffectMetadata(graphicId: number): EffectMetadata {
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

    const mouseWorldX =
      position.x - this.viewportController.getHalfGameWidth() + playerScreen.x;
    const mouseWorldY =
      position.y -
      this.viewportController.getHalfGameHeight() +
      playerScreen.y +
      HALF_TILE_HEIGHT;

    this.mouseCoords = screenToIso({ x: mouseWorldX, y: mouseWorldY });

    if (this.mouseCoords.x < 0 || this.mouseCoords.y < 0) {
      this.mouseCoords = undefined;
    }
  }

  tick() {
    this.tickCount += 1;
    this.keyboardController.tick();
    this.mapRenderer.tick();

    if (this.state === GameState.InGame) {
      // Build lookup Sets once per tick — O(n) total instead of O(n) per .some() call
      const activeCharIds = new Set(
        this.nearby.characters.map((c) => c.playerId),
      );
      const activeNpcIds = new Set(this.nearby.npcs.map((n) => n.index));

      this.usageController.tick();
      this.itemProtectionController.tick();
      this.drunkController.tick();
      this.cleanupController.tick();
      this.spellController.tick();
      this.npcController.tick();

      const { playerWalking, playerDying } = this.animationController.tick(
        activeCharIds,
        activeNpcIds,
      );

      this.mapController.tick();

      if (this.warpQueued && !playerWalking && !playerDying) {
        this.sessionController.acceptWarp();
      }

      this.movementController.tick();
      this.quakeController.tick();
    }
  }

  render(interpolation: number) {
    this.mapRenderer.update(interpolation);
    this.minimapRenderer.update(interpolation);
  }

  setMap(map: Emf) {
    this.map = map;
    this.animationController.characterChats.clear();
    this.animationController.npcChats.clear();
    this.animationController.npcHealthBars.clear();
    this.animationController.characterHealthBars.clear();
    this.itemProtectionController.itemProtectionTimers.clear();
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

  off<Event extends keyof ClientEvents>(
    event: Event,
    handler: (data: ClientEvents[Event]) => void,
  ) {
    this.emitter.off(event, handler);
  }

  setState(state: GameState) {
    this.state = state;

    if (state === GameState.InGame && this.reconnecting) {
      this.reconnecting = false;
      this.emit('reconnected', undefined);
    }
    this.minimapEnabled = false;
    this.animationController.characterAnimations.clear();
    this.animationController.pendingCharacterAnimations.clear();
    this.animationController.npcAnimations.clear();
    this.animationController.pendingNpcAnimations.clear();
    this.animationController.characterChats.clear();
    this.animationController.npcChats.clear();
    this.npcController.queuedNpcChats.clear();
    this.animationController.npcHealthBars.clear();
    this.animationController.characterHealthBars.clear();
    this.animationController.characterEmotes.clear();
    this.animationController.effects = [];
    this.movementController.autoWalkPath = [];
    this.spellController.spellTarget = null;
    this.downloadQueue = [];
    this.usageController.idleTicks = INITIAL_IDLE_TICKS;
    this.drunkController.drunk = false;
    this.drunkController.drunkEmoteTicks = 0;
    this.spellController.selectedSpellId = 0;
    this.spellController.queuedSpellId = 0;
    this.spellController.spellCooldownTicks = 0;
    this.menuPlayerId = 0;
    this.onlinePlayers = [];
    this.inventoryController.equipmentSwap = null;
    this.itemProtectionController.itemProtectionTimers.clear();
    this.emit('stateChanged', this.state);
  }

  connect(nextState: GameState) {
    this.postConnectState = nextState;
    this.bus
      .connect(this.config.host, () => this.handleConnectionClose())
      .then(() => {
        this.beginHandshake();
      })
      .catch((err) => {
        console.warn('Failed to connect to server', err);
        const strings = this.getDialogStrings(
          DialogResourceID.CONNECTION_SERVER_NOT_FOUND,
        );
        this.alertController.show(strings[0], strings[1]);
        this.postConnectState = undefined;
      });
  }

  private handleConnectionClose() {
    if (this.playerTriggeredDisconnect) {
      this.playerTriggeredDisconnect = false;
      return;
    }

    const strings = this.getDialogStrings(
      DialogResourceID.CONNECTION_LOST_CONNECTION,
    );
    this.alertController.show(strings[0], strings[1]);
    this.setState(GameState.Initial);
  }

  private beginHandshake() {
    const packet = new InitInitClientPacket();
    packet.challenge = this.challenge = randomRange(1, MAX_CHALLENGE);
    packet.hdid = this.hdid;
    packet.version = this.version;
    this.bus.send(packet);
  }

  disconnect() {
    this.playerTriggeredDisconnect = true;
    this.setState(GameState.Initial);
    this.authenticationController.clearSession();
    if (this.bus) {
      this.bus.disconnect();
    }
  }

  refresh() {
    this.bus.send(new RefreshRequestClientPacket());
  }

  setNpcDeathAnimation(index: number) {
    const npc = this.nearby.npcs.find((n) => n.index === index);
    if (!npc) {
      return;
    }

    const current = this.animationController.npcAnimations.get(index);
    this.animationController.pendingNpcAnimations.set(
      index,
      new NpcDeathAnimation(current),
    );
  }

  setCharacterDeathAnimation(playerId: number) {
    const character = this.getCharacterById(playerId);
    if (!character) {
      return;
    }

    const current = this.animationController.characterAnimations.get(playerId);
    this.animationController.pendingCharacterAnimations.set(
      playerId,
      new CharacterDeathAnimation(current),
    );
  }

  toggleMinimap() {
    if (!this.map.mapAvailable) {
      this.toastController.showWarning(
        this.getResourceString(EOResourceID.STATUS_LABEL_NO_MAP_OF_AREA),
      );
      return;
    }

    this.minimapEnabled = !this.minimapEnabled;
  }

  addItemDrop(item: ItemMapInfo, protectedFor = 0, ownerId = 0) {
    this.nearby.items.push(item);
    if (protectedFor) {
      this.itemProtectionController.itemProtectionTimers.set(item.uid, {
        ticks: protectedFor,
        ownerId,
      });
    }
  }

  getNpcKilledMessage(data: NpcKilledData, exp = 0, levelUp = false): string {
    let killerName: string;
    if (data.killerId === this.playerId) {
      killerName = this.locale.wordYou;
    } else {
      const killer = this.nearby.characters.find(
        (c) => c.playerId === data.killerId,
      );
      killerName = killer ? capitalize(killer.name) : this.locale.wordUnknown;
    }

    const npc = this.nearby.npcs.find((n) => n.index === data.npcIndex);
    const record = npc ? this.getEnfRecordById(npc.id) : undefined;
    const npcName = record ? record.name : this.locale.wordUnknown;

    const messages = [
      formatLocaleString(this.locale.killedNpc, {
        killer: killerName,
        npc: npcName,
      }),
    ];

    if (data.killerId === this.playerId && exp > 0) {
      messages.push(
        formatLocaleString(this.locale.gainedExp, {
          exp: exp.toLocaleString(),
        }),
      );
    }

    if (levelUp) {
      messages.push(
        formatLocaleString(this.locale.levelUp, {
          level: this.level.toLocaleString(),
        }),
      );
    }

    if (data.dropId && data.dropAmount) {
      const itemRecord = this.getEifRecordById(data.dropId);
      const itemName = itemRecord ? itemRecord.name : this.locale.wordUnknown;
      const amountText =
        data.dropAmount > 1 ? `${data.dropAmount.toLocaleString()} ` : '';
      messages.push(
        formatLocaleString(this.locale.npcDrop, {
          item: `${amountText}${itemName}`,
        }),
      );
    }

    return messages.join(' ');
  }

  getExpShareMessage(exp: number, levelUp = false): string {
    const messages = [
      formatLocaleString(this.locale.expShare, {
        exp: exp.toLocaleString(),
      }),
    ];

    if (levelUp) {
      messages.push(
        formatLocaleString(this.locale.levelUp, {
          level: this.level.toLocaleString(),
        }),
      );
    }

    return messages.join(' ');
  }
}
