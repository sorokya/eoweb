import { padWithZeros } from './utils/pad-with-zeros';

export enum SfxId {
  LayeredTechIntro = 1,
  ButtonClick = 2,
  DialogButtonClick = 3,
  TextBoxFocus = 4,
  ChestOpen = 4,
  SpellActivate = 4,
  ServerCommand = 4,
  TradeItemOfferChanged = 4,
  Login = 5,
  ServerMessage = 5,
  DeleteCharacter = 6,
  MapMutation = 6,
  LeaveGuild = 6,
  Banned = 7,
  Reboot = 7,
  ScreenCapture = 8,
  PrivateMessageReceived = 9,
  PunchAttack = 10,
  UnknownWarpSound = 11,
  PrivateMessageTargetNotFound = 12,
  HudStatusBarClick = 13,
  Sit = 13,
  AdminAnnounceReceived = 14,
  MeleeWeaponAttack = 15,
  MemberLeftParty = 16,
  TradeAccepted = 17,
  JoinParty = 17,
  GroupChatReceived = 18,
  JoinGuild = 18,
  PrivateMessageSent = 19,
  InventoryPickup = 20,
  InventoryPlace = 21,
  Earthquake = 22,
  DoorClose = 23,
  DoorOpen = 24,
  DoorOrChestLocked = 25,
  BuySell = 26,
  Craft = 27,
  PlayerFrozen = 28,
  AdminChatReceived = 29,
  AdminChatSent = 29,
  AlternateMeleeAttack = 30,
  PotionOfFlamesEffect = 31,
  AdminWarp = 32,
  NoWallWalk = 33,
  GhostPlayer = 33,
  ScrollTeleport = 33,
  PotionOfEvilTerrorEffect = 34,
  PotionOfFireworksEffect = 35,
  PotionOfSparklesEffect = 36,
  LearnNewSpell = 37,
  PotionOfLoveEffect = 37,
  InnSignUp = 37,
  AttackBow = 38,
  LevelUp = 39,
  Dead = 40,
  JumpStone = 41,
  Water = 42,
  Heal = 43,
  Harp1 = 44,
  Harp2 = 45,
  Harp3 = 46,
  Guitar1 = 47,
  Guitar2 = 48,
  Guitar3 = 49,
  Thunder = 50,
  MapEvacTimer = 51,
  ArenaTickSound = 51,
  ArenaWin = 52,
  Gun = 53,
  UltimaBlastSpell = 54,
  ShieldSpell = 55,
  RingOfFireSpell = 56,
  IceBlastSpell1 = 57,
  EnergyBallSpell = 58,
  WhirlSpell = 59,
  BouldersSpell = 60,
  AuraSpell = 61,
  HeavenSpell = 62,
  IceBlastSpell2 = 63,
  MapAmbientNoiseWater = 64,
  MapAmbientNoiseDrone1 = 65,
  AdminHide = 66,
  MapAmbientNoiseLavaBubbles1 = 67,
  AdminRequestSent = 68,
  MapAmbientNoiseFactory = 69,
  MapEffectHPDrain = 70,
  MapEffectTPDrain = 71,
  Spikes = 72,
  NoArrows = 73,
  EnterPkMap = 74,
  UnknownMapAmbientNoise5 = 75,
  DarkHandSpell = 76,
  TentaclesSpell = 77,
  MagicWhirlSpell = 78,
  PowerWindSpell = 79,
  FireBlastSpell = 80,
  MapAmbientNoiseLavaBubbles2 = 81,
}

const SFX: HTMLAudioElement[] = [];
const pool: HTMLAudioElement[] = [];

export function playSfxById(id: SfxId, volume = 1.0) {
  const sfx = SFX[id];
  if (!sfx) {
    loadSfxById(id, true, volume);
    return;
  }

  const dupe = sfx.cloneNode(true) as HTMLAudioElement;
  dupe.volume = volume;
  dupe.play();

  dupe.addEventListener('ended', () => {
    const i = pool.indexOf(dupe);
    if (i !== -1) pool.splice(i, 1);
    dupe.src = '';
  });

  pool.push(dupe);
}

function loadSfxById(id: SfxId, play = true, volume = 1.0) {
  if (SFX[id]) {
    return;
  }

  const sfx = new Audio();
  sfx.src = `/sfx/sfx${padWithZeros(id, 3)}.wav`;
  sfx.addEventListener('loadeddata', () => {
    if (play) {
      sfx.volume = volume;
      sfx.play();
    }
    SFX[id] = sfx;
  });
}
