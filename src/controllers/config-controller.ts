const CONFIG_CHANGED_EVENT = 'eoweb:config-changed';

// ── Types ─────────────────────────────────────────────────────────────────────

export type FpsLimit = 20 | 30 | 60 | 0; // 0 = unlimited
export type SocialFilter = 'all' | 'friends' | 'none';
export type HudWidgetId =
  | 'character'
  | 'hp'
  | 'tp'
  | 'tnl'
  | 'weight'
  | 'gold'
  | 'ping';
export type HudPosition = 'left' | 'center' | 'right';
export type Language = 'en' | 'nl' | 'sv' | 'pt';

export type HudWidget = {
  id: HudWidgetId;
  visible: boolean;
  position: HudPosition;
  order: number;
};

type GlobalConfig = {
  // Graphics
  fpsLimit: FpsLimit;
  interpolation: boolean;
  // Interface
  uiScaleIndex: number;
  theme: string;
  language: Language;
  backdropBlur: boolean;
  // Sound
  masterVolume: number;
  effectVolume: number;
  ambientVolume: number;
  musicVolume: number;
  forceMusicLoop: boolean;
  // Social
  whispers: SocialFilter;
  tradeRequests: SocialFilter;
  partyRequests: SocialFilter;
  profanityFilter: boolean;
  chatLog: boolean;
  // Debug
  layerVisibility: Record<number, boolean>;
};

const DEFAULT_HUD_WIDGETS: HudWidget[] = [
  { id: 'character', visible: true, position: 'left', order: 0 },
  { id: 'hp', visible: true, position: 'center', order: 0 },
  { id: 'tp', visible: true, position: 'center', order: 1 },
  { id: 'tnl', visible: true, position: 'center', order: 2 },
  { id: 'weight', visible: true, position: 'right', order: 0 },
  { id: 'gold', visible: true, position: 'right', order: 1 },
  { id: 'ping', visible: true, position: 'right', order: 2 },
];

const DEFAULT_LAYER_VISIBILITY: Record<number, boolean> = {
  0: true, // Ground
  1: true, // Objects
  2: true, // Overlay
  3: true, // Down Wall
  4: true, // Right Wall
  5: true, // Roof
  6: true, // Top
  7: true, // Shadow
  8: true, // Overlay 2
};

const DEFAULTS: GlobalConfig = {
  fpsLimit: 60,
  interpolation: true,
  uiScaleIndex: 2, // 1x
  theme: 'dim',
  language: 'en',
  backdropBlur: true,
  masterVolume: 1,
  effectVolume: 1,
  ambientVolume: 1,
  musicVolume: 1,
  forceMusicLoop: true,
  whispers: 'all',
  tradeRequests: 'all',
  partyRequests: 'all',
  profanityFilter: false,
  chatLog: true,
  layerVisibility: DEFAULT_LAYER_VISIBILITY,
};

const GLOBAL_KEY = 'eoweb:config';
const HUD_KEY_PREFIX = 'eoweb:hud:';

// ── ConfigController ──────────────────────────────────────────────────────────

export class ConfigController {
  private global: GlobalConfig;

  constructor() {
    this.global = this.loadGlobal();
  }

  // ── Persistence ─────────────────────────────────────────────────────────────

  private loadGlobal(): GlobalConfig {
    try {
      const raw = localStorage.getItem(GLOBAL_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          ...DEFAULTS,
          ...parsed,
          layerVisibility: {
            ...DEFAULT_LAYER_VISIBILITY,
            ...(parsed.layerVisibility ?? {}),
          },
        };
      }
    } catch {
      // ignore
    }

    // Migrate old standalone scale key
    try {
      const oldScale = localStorage.getItem('eoweb:ui-scale');
      if (oldScale !== null) {
        const idx = Number.parseInt(oldScale, 10);
        if (!Number.isNaN(idx)) {
          return { ...DEFAULTS, uiScaleIndex: idx };
        }
      }
    } catch {
      // ignore
    }

    return { ...DEFAULTS };
  }

  private saveGlobal(): void {
    try {
      localStorage.setItem(GLOBAL_KEY, JSON.stringify(this.global));
    } catch {
      // ignore storage errors
    }
  }

  private emit(key: string): void {
    window.dispatchEvent(
      new CustomEvent(CONFIG_CHANGED_EVENT, { detail: { key } }),
    );
  }

  subscribe(key: string, cb: () => void): () => void {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ key: string }>).detail;
      if (detail.key === key || key === '*') cb();
    };
    window.addEventListener(CONFIG_CHANGED_EVENT, handler);
    return () => window.removeEventListener(CONFIG_CHANGED_EVENT, handler);
  }

  // ── Graphics ────────────────────────────────────────────────────────────────

  get fpsLimit(): FpsLimit {
    return this.global.fpsLimit;
  }

  setFpsLimit(value: FpsLimit): void {
    this.global.fpsLimit = value;
    this.saveGlobal();
    this.emit('fpsLimit');
  }

  get interpolation(): boolean {
    return this.global.interpolation;
  }

  setInterpolation(value: boolean): void {
    this.global.interpolation = value;
    this.saveGlobal();
    this.emit('interpolation');
  }

  // ── Interface ───────────────────────────────────────────────────────────────

  get uiScaleIndex(): number {
    return this.global.uiScaleIndex;
  }

  setUiScaleIndex(value: number): void {
    this.global.uiScaleIndex = value;
    this.saveGlobal();
    this.emit('uiScaleIndex');
  }

  get theme(): string {
    return this.global.theme;
  }

  setTheme(value: string): void {
    this.global.theme = value;
    this.saveGlobal();
    this.emit('theme');
  }

  get language(): Language {
    return this.global.language;
  }

  setLanguage(value: Language): void {
    this.global.language = value;
    this.saveGlobal();
    this.emit('language');
  }

  get backdropBlur(): boolean {
    return this.global.backdropBlur;
  }

  setBackdropBlur(value: boolean): void {
    this.global.backdropBlur = value;
    this.saveGlobal();
    this.emit('backdropBlur');
  }

  // ── Sound ───────────────────────────────────────────────────────────────────

  get masterVolume(): number {
    return this.global.masterVolume;
  }

  setMasterVolume(value: number): void {
    this.global.masterVolume = value;
    this.saveGlobal();
    this.emit('masterVolume');
  }

  get effectVolume(): number {
    return this.global.effectVolume;
  }

  setEffectVolume(value: number): void {
    this.global.effectVolume = value;
    this.saveGlobal();
    this.emit('effectVolume');
  }

  get ambientVolume(): number {
    return this.global.ambientVolume;
  }

  setAmbientVolume(value: number): void {
    this.global.ambientVolume = value;
    this.saveGlobal();
    this.emit('ambientVolume');
  }

  get musicVolume(): number {
    return this.global.musicVolume;
  }

  setMusicVolume(value: number): void {
    this.global.musicVolume = value;
    this.saveGlobal();
    this.emit('musicVolume');
  }

  get forceMusicLoop(): boolean {
    return this.global.forceMusicLoop;
  }

  setForceMusicLoop(value: boolean): void {
    this.global.forceMusicLoop = value;
    this.saveGlobal();
    this.emit('forceMusicLoop');
  }

  // ── Social ──────────────────────────────────────────────────────────────────

  get whispers(): SocialFilter {
    return this.global.whispers;
  }

  setWhispers(value: SocialFilter): void {
    this.global.whispers = value;
    this.saveGlobal();
    this.emit('whispers');
  }

  get tradeRequests(): SocialFilter {
    return this.global.tradeRequests;
  }

  setTradeRequests(value: SocialFilter): void {
    this.global.tradeRequests = value;
    this.saveGlobal();
    this.emit('tradeRequests');
  }

  get partyRequests(): SocialFilter {
    return this.global.partyRequests;
  }

  setPartyRequests(value: SocialFilter): void {
    this.global.partyRequests = value;
    this.saveGlobal();
    this.emit('partyRequests');
  }

  get profanityFilter(): boolean {
    return this.global.profanityFilter;
  }

  setProfanityFilter(value: boolean): void {
    this.global.profanityFilter = value;
    this.saveGlobal();
    this.emit('profanityFilter');
  }

  get chatLog(): boolean {
    return this.global.chatLog;
  }

  setChatLog(value: boolean): void {
    this.global.chatLog = value;
    this.saveGlobal();
    this.emit('chatLog');
  }

  // ── Debug ───────────────────────────────────────────────────────────────────

  layerVisible(layer: number): boolean {
    return this.global.layerVisibility[layer] ?? true;
  }

  setLayerVisible(layer: number, visible: boolean): void {
    this.global.layerVisibility = {
      ...this.global.layerVisibility,
      [layer]: visible,
    };
    this.saveGlobal();
    this.emit('layerVisibility');
  }

  get layerVisibility(): Record<number, boolean> {
    return this.global.layerVisibility;
  }

  // ── HUD (per-character) ──────────────────────────────────────────────────────

  getHudWidgets(characterId: number): HudWidget[] {
    if (!characterId) return [...DEFAULT_HUD_WIDGETS];
    try {
      const raw = localStorage.getItem(`${HUD_KEY_PREFIX}${characterId}`);
      if (raw) {
        const parsed = JSON.parse(raw) as HudWidget[];
        // Ensure all default widgets are present (in case new ones were added)
        const ids = new Set(parsed.map((w) => w.id));
        const missing = DEFAULT_HUD_WIDGETS.filter((w) => !ids.has(w.id));
        return [...parsed, ...missing];
      }
    } catch {
      // ignore
    }
    return [...DEFAULT_HUD_WIDGETS];
  }

  setHudWidgets(characterId: number, widgets: HudWidget[]): void {
    if (!characterId) return;
    try {
      localStorage.setItem(
        `${HUD_KEY_PREFIX}${characterId}`,
        JSON.stringify(widgets),
      );
    } catch {
      // ignore
    }
    this.emit('hudWidgets');
  }
}
