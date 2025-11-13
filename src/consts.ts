export const GAME_FPS = 1000 / 20;
//export const HOST = 'ws://localhost:8077';
export const HOST = 'wss://ws.reoserv.net';
export const TILE_WIDTH = 64;
export const TILE_HEIGHT = 32;
export const HALF_TILE_WIDTH = TILE_WIDTH >> 1;
export const HALF_TILE_HEIGHT = TILE_HEIGHT >> 1;
export const HALF_HALF_TILE_HEIGHT = HALF_TILE_HEIGHT >> 1;

export const CHARACTER_WIDTH = 18;
export const CHARACTER_WALKING_WIDTH = 26;
export const HALF_CHARACTER_WALKING_WIDTH = CHARACTER_WALKING_WIDTH >> 1;
export const CHARACTER_MELEE_ATTACK_WIDTH = 24;
export const CHARACTER_SIT_GROUND_WIDTH = 24;
export const CHARACTER_SIT_CHAIR_WIDTH = 24;
export const CHARACTER_RANGE_ATTACK_WIDTH = 25;

export const CHARACTER_HEIGHT = 58;
export const CHARACTER_WALKING_HEIGHT = 61;
export const CHARACTER_RAISED_HAND_HEIGHT = 62;
export const CHARACTER_SIT_GROUND_HEIGHT = 43;
export const CHARACTER_SIT_CHAIR_HEIGHT = 52;

export const WALK_WIDTH_FACTOR = HALF_TILE_WIDTH / 4;
export const WALK_HEIGHT_FACTOR = HALF_TILE_HEIGHT / 4;
export const WALK_TICKS = 4;
export const WALK_ANIMATION_FRAMES = 4;
export const FACE_TICKS = 1;
export const SIT_TICKS = 4;
export const ATTACK_TICKS = 5;
export const RANGED_ATTACK_TICKS = 4;
export const DEATH_TICKS = 6;
export const ANIMATION_TICKS = 6;
export const MAX_CHALLENGE = 11_092_110;
export const MAX_USERNAME_LENGTH = 16;
export const MAX_PASSWORD_LENGTH = 12;
export const MAX_CHARACTER_NAME_LENGTH = 12;
export const NPC_IDLE_ANIMATION_TICKS = 2;
export const DOOR_OPEN_TICKS = 25;
export const DOOR_HEIGHT = 110;
export const MAX_CHAT_LENGTH = 128;
export const CLEAR_OUT_OF_RANGE_TICKS = 8;
export const USAGE_TICKS = 500;
export const ATLAS_EXPIRY_TICKS = 500;
export const NUMBER_OF_EMOTES = 15;
export const EMOTE_ANIMATION_FRAMES = 4;
export const EMOTE_ANIMATION_TICKS = 8;
export const INITIAL_IDLE_TICKS = 2500;
export const IDLE_TICKS = 250;
export const MAX_LOCKER_UPGRADES = 7;
export const LOCKER_UPGRADE_BASE_COST = 1000;
export const LOCKER_UPGRADE_COST_STEP = 1000;
export const LOCKER_BASE_SIZE = 25;
export const LOCKER_SIZE_STEP = 5;
export const LOCKER_MAX_ITEM_AMOUNT = 200;

export const HOTBAR_SLOTS = 5;
export const HOTBAR_COOLDOWN_TICKS = 2;
export const TICKS_PER_CAST_TIME = 4;
export const SPELL_COOLDOWN_TICKS = 5;

export const PLAYER_MENU_WIDTH = 96;
export const PLAYER_MENU_HEIGHT = 137;
export const PLAYER_MENU_ITEM_HEIGHT = 15;
export const PLAYER_MENU_OFFSET_Y = 10;

export const NUMBER_OF_EFFECTS = 34;
export const NUMBER_OF_SLASHES = 9;

export const COLORS = {
  Nameplate: '#fff',
  NameplateIgnored: '#b9b9b9',
  NameplateFriend: '#fafad2',
  NameplateRare: '#f5c89c',
  NameplateLegendary: '#fff0a5',
  NameplateUnique: '#fff0a5',
  NameplateLore: '#fafad3',
  ChatBubbleBackground: '#fff',
  ChatBubble: '#101010',
  ChatBubbleBackgroundParty: '#dcc8aa',
};
