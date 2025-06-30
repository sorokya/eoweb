import {
  BigCoords,
  CharacterMapInfo,
  Emf,
  EoReader,
  Gender,
  InitInitClientPacket,
  ItemSpecial,
  SitState,
} from 'eolib';
import './style.css';
import { PacketBus } from './bus';
import { ChatTab, Client, GameState } from './client';
import { GAME_FPS, MAX_CHALLENGE } from './consts';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  setGameSize,
  setZoom,
  ZOOM,
} from './game-state';
import { getLatestDirectionHeld } from './input';
import { inputToDirection } from './movement-controller';
import { playSfxById, SfxId } from './sfx';
import { ChangePasswordForm } from './ui/change-password';
import { CharacterSelect } from './ui/character-select';
import { Chat } from './ui/chat';
import { ChestUI } from './ui/chest-ui';
import { CreateAccountForm } from './ui/create-account';
import { CreateCharacterForm } from './ui/create-character';
import { ExitGame } from './ui/exit-game';
import { HUD } from './ui/hud';
import { InGameMenu } from './ui/in-game-menu';
import { Inventory } from './ui/inventory';
import { ItemAmountDialog } from './ui/item-amount-dialog';
import { LoginForm } from './ui/login';
import { MainMenu } from './ui/main-menu';
import { MobileControls } from './ui/mobile-controls';
import { OffsetTweaker } from './ui/offset-tweaker';
import { QuestDialog } from './ui/quest-dialog';
import { SmallAlertLargeHeader } from './ui/small-alert-large-header';
import { SmallConfirm } from './ui/small-confirm';
import { capitalize } from './utils/capitalize';
import { randomRange } from './utils/random-range';

const canvas = document.getElementById('game') as HTMLCanvasElement;
if (!canvas) throw new Error('Canvas not found!');

// Declare ctx early so resizeCanvases can use it
// willReadFrequently: true because apparently we getImageData() every time someone breathes near the zoom
const ctx = canvas.getContext('2d', { willReadFrequently: true });
if (!ctx) {
  throw new Error('Failed to get canvas context!');
}
ctx.imageSmoothingEnabled = false;

const client = new Client();
const mobileControls = new MobileControls();

let userOverride = false;

export function zoomIn() {
  userOverride = true;
  setZoom(Math.min(4, ZOOM + 1));
  resizeCanvases();
}

export function zoomOut() {
  userOverride = true;
  setZoom(Math.max(1, ZOOM - 1));
  resizeCanvases();
}

export function zoomReset() {
  userOverride = false;
  resizeCanvases();
}

function resizeCanvases() {
  const container = document.getElementById('container');
  if (!container) return;
  const viewportWidth =
    window.visualViewport?.width ?? container.getBoundingClientRect().width;
  const viewportHeight =
    window.visualViewport?.height ?? container.getBoundingClientRect().height;
  if (!userOverride) setZoom(viewportWidth >= 1280 ? 2 : 1);
  const w = Math.floor(viewportWidth / ZOOM);
  const h = Math.floor(viewportHeight / ZOOM);
  // OK so basically canvas.width = newValue clears the entire canvas
  // which means we see the background for like 1 frame = flicker
  // solution: screenshot the canvas before resize, then draw it back
  const snapshot =
    canvas.width > 0
      ? ctx.getImageData(0, 0, canvas.width, canvas.height)
      : null;
  const prevW = canvas.width;
  const prevH = canvas.height;
  canvas.width = w;
  canvas.height = h;
  canvas.style.width = `${w * ZOOM}px`;
  canvas.style.height = `${h * ZOOM}px`;
  ctx.imageSmoothingEnabled = false;
  if (snapshot && prevW > 0) {
    // restore the screenshot but scaled to new size
    const temp = document.createElement('canvas');
    temp.width = prevW;
    temp.height = prevH;
    const tempCtx = temp.getContext('2d');
    if (tempCtx) {
      tempCtx.putImageData(snapshot, 0, 0);
      ctx.drawImage(temp, 0, 0, w, h);
    }
  } else {
    // no previous content, just fill black
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
  }
  client.mapRenderer.resizeCanvas(w, h);
  setGameSize(w, h);
  if (client.state === GameState.InGame && viewportWidth < 940) {
    mobileControls.show();
  } else {
    mobileControls.hide();
  }
}

resizeCanvases();
window.addEventListener('resize', resizeCanvases);

let lastTime: DOMHighResTimeStamp | undefined;
const render = (now: DOMHighResTimeStamp) => {
  if (!lastTime) {
    lastTime = now;
  }

  const ellapsed = now - lastTime;
  if (ellapsed < GAME_FPS) {
    requestAnimationFrame(render);
    return;
  }

  lastTime = now;

  if (client.movementController.attackTicks < 0) {
    const latestInput = getLatestDirectionHeld();
    const directionHeld =
      latestInput !== null ? inputToDirection(latestInput) : null;

    if (directionHeld !== null) {
      client.movementController.lastDirectionHeld = directionHeld;
      client.movementController.directionExpireTicks = 2;
    }
  }

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  client.render(ctx);
  requestAnimationFrame(render);
};

client.on('error', ({ title, message }) => {
  smallAlertLargeHeader.setContent(message, title || 'Error');
  smallAlertLargeHeader.show();
});

client.on('debug', (_message) => {});

client.on('accountCreated', () => {
  smallAlertLargeHeader.setContent(
    'Use your new account name and password to login to the game',
    'Welcome',
  );
  smallAlertLargeHeader.show();
  createAccountForm.hide();
  mainMenu.show();
});

client.on('login', (characters) => {
  playSfxById(SfxId.Login);
  loginForm.hide();
  characterSelect.setCharacters(characters);
  characterSelect.show();
});

client.on('serverChat', ({ message, sfxId }) => {
  client.emit('chat', {
    name: 'Server',
    tab: ChatTab.Local,
    message: message,
  });
  playSfxById(sfxId || SfxId.ServerMessage);
});

client.on('characterCreated', (characters) => {
  createCharacterForm.hide();
  smallAlertLargeHeader.setContent(
    'Your character has been created',
    'Success',
  );
  smallAlertLargeHeader.show();
  characterSelect.setCharacters(characters);
});

client.on('selectCharacter', () => {});

client.on('chat', ({ name, tab: _, message }) => {
  chat.addMessage(`${capitalize(name)}: ${message}`);
});

client.on('enterGame', ({ news }) => {
  for (const line of news) {
    chat.addMessage(line);
  }

  characterSelect.hide();
  exitGame.show();
  chat.show();
  hud.setStats(client);
  hud.show();
  //offsetTweaker.show();
  inGameMenu.show();
  resizeCanvases();
  inventory.loadPositions();
  inventory.show();
});

client.on('passwordChanged', () => {
  changePasswordForm.hide();
  smallAlertLargeHeader.setContent(
    'Your password has been changed, please use your new password next time you login.',
    'Password changed',
  );
  smallAlertLargeHeader.show();
});

client.on('statsUpdate', () => {
  hud.setStats(client);
});

client.on('reconnect', () => {
  initializeSocket('login');
});

client.on('openQuestDialog', (data) => {
  client.typing = true;
  questDialog.setData(data.questId, data.name, data.quests, data.dialog);
  questDialog.show();
});

client.on('chestOpened', ({ coords, items }) => {
  chestUI.openChest(coords, items);
});

const initializeSocket = (next: 'login' | 'create') => {
  const socket = new WebSocket(client.host);
  socket.addEventListener('open', () => {
    mainMenu.hide();
    if (next === 'create') {
      createAccountForm.show();
    } else if (next === 'login') {
      loginForm.show();
    }

    const bus = new PacketBus(socket);
    bus.on('receive', (_data) => {
      /*
      packetLogModal.addEntry({
        source: PacketSource.Server,
        ...data,
      });
      */
    });
    bus.on('send', (_data) => {
      /*
      packetLogModal.addEntry({
        source: PacketSource.Client,
        ...data,
      });
      */
    });

    client.setBus(bus);
    client.challenge = randomRange(1, MAX_CHALLENGE);

    const init = new InitInitClientPacket();
    init.challenge = client.challenge;
    init.hdid = '111111111';
    init.version = client.version;
    client.bus.send(init);
  });

  socket.addEventListener('close', () => {
    hideAllUi();
    mainMenu.show();
    if (client.state !== GameState.Initial) {
      client.state = GameState.Initial;
      smallAlertLargeHeader.setContent(
        'The connection to the game server was lost, please try again a later time',
        'Lost connection',
      );
      smallAlertLargeHeader.show();
    }
    client.bus = null;
  });

  socket.addEventListener('error', (e) => {
    console.error('Websocket Error', e);
  });
};

const mainMenu = new MainMenu();
const loginForm = new LoginForm();
const createAccountForm = new CreateAccountForm();
const characterSelect = new CharacterSelect();
const createCharacterForm = new CreateCharacterForm();
const changePasswordForm = new ChangePasswordForm();
const smallAlertLargeHeader = new SmallAlertLargeHeader();
const exitGame = new ExitGame();
const smallConfirm = new SmallConfirm();
const chat = new Chat();
// biome-ignore lint/correctness/noUnusedVariables: Only used sometimes
const offsetTweaker = new OffsetTweaker();
const inGameMenu = new InGameMenu();
const inventory = new Inventory(client);
const hud = new HUD();
const itemAmountDialog = new ItemAmountDialog();
const questDialog = new QuestDialog();
const chestUI = new ChestUI(client);

const hideAllUi = () => {
  const uiElements = document.querySelectorAll('#ui>div');
  for (const el of uiElements) {
    el.classList.add('hidden');
  }
};

exitGame.on('click', () => {
  smallConfirm.setContent(
    'Are you sure you want to exit the game?',
    'Exit game',
  );
  smallConfirm.setCallback(() => {
    client.disconnect();
    chat.clear();
    hideAllUi();
    mainMenu.show();
  });
  smallConfirm.show();
});

mainMenu.on('play-game', () => {
  if (client.state === GameState.Initial) {
    initializeSocket('login');
  } else {
    mainMenu.hide();
    loginForm.show();
  }
});

mainMenu.on('create-account', () => {
  if (client.state === GameState.Initial) {
    initializeSocket('create');
  } else {
    mainMenu.hide();
    createAccountForm.show();
  }
});

mainMenu.on('view-credits', () => {
  window.open('https://github.com/sorokya/eoweb', '_blank');
});

mainMenu.on('host-change', (host) => {
  client.host = host;
  client.disconnect();
});

createAccountForm.on('cancel', () => {
  createAccountForm.hide();
  mainMenu.show();
});

createAccountForm.on('error', ({ title, message }) => {
  smallAlertLargeHeader.setContent(message, title);
  smallAlertLargeHeader.show();
});

createAccountForm.on('create', (data) => {
  client.requestAccountCreation(data);
});

loginForm.on('login', ({ username, password }) => {
  client.login(username, password);
});

loginForm.on('cancel', () => {
  loginForm.hide();
  mainMenu.show();
});

characterSelect.on('cancel', () => {
  client.disconnect();
  chat.clear();
  characterSelect.hide();
  mainMenu.show();
});

characterSelect.on('changePassword', () => {
  changePasswordForm.show();
});

characterSelect.on('selectCharacter', (id) => {
  client.selectCharacter(id);
});

characterSelect.on('error', ({ title, message }) => {
  smallAlertLargeHeader.setContent(message, title);
  smallAlertLargeHeader.show();
});

characterSelect.on('create', () => {
  createCharacterForm.show();
});

createCharacterForm.on('create', (data) => {
  client.requestCharacterCreation(data);
});

changePasswordForm.on('error', ({ title, message }) => {
  smallAlertLargeHeader.setContent(message, title);
  smallAlertLargeHeader.show();
});

changePasswordForm.on(
  'changePassword',
  ({ username, oldPassword, newPassword }) => {
    client.changePassword(username, oldPassword, newPassword);
  },
);

chat.on('chat', (message) => {
  client.chat(message);
});

chat.on('focus', () => {
  client.typing = true;
});

chat.on('blur', () => {
  client.typing = false;
});

inGameMenu.on('toggle-inventory', () => {
  inventory.toggle();
});

inventory.on('dropItem', (itemId) => {
  const item = client.items.find((i) => i.id === itemId);
  if (!item) {
    return;
  }

  if (!client.cursorInDropRange()) {
    return;
  }

  // Prevent dropping same item on stack
  const coords = client.mouseCoords;
  if (
    client.nearby.items.some(
      (i) =>
        i.coords.x === coords.x && i.coords.y === coords.y && i.id === itemId,
    )
  ) {
    return;
  }

  const record = client.getEifRecordById(itemId);
  if (!record) {
    return;
  }

  if (record.special === ItemSpecial.Lore) {
    // TODO: alert
    return;
  }

  if (item.amount > 1) {
    client.typing = true;
    itemAmountDialog.setMaxAmount(item.amount);
    itemAmountDialog.setLabel(
      `How much ${record.name}\nwould you like to drop?`,
    );
    itemAmountDialog.setCallback(
      (amount) => {
        client.dropItem(itemId, amount, coords);
        client.typing = false;
      },
      () => {
        client.typing = false;
      },
    );
    itemAmountDialog.show();
  } else {
    client.dropItem(itemId, 1, client.mouseCoords);
  }
});

inventory.on('useItem', (itemId) => {
  client.useItem(itemId);
});

questDialog.on('reply', ({ questId, dialogId, action }) => {
  client.questReply(questId, dialogId, action);
  client.typing = false;
});

questDialog.on('cancel', () => {
  client.typing = false;
});

// Tick loop
setInterval(() => {
  client.tick();
}, 120);

window.addEventListener('keyup', (e) => {
  if (client.state === GameState.InGame && e.key === 'Enter') {
    chat.focus();
  }

  if (
    client.state === GameState.LoggedIn &&
    !changePasswordForm.isOpen() &&
    !createCharacterForm.isOpen() &&
    ['1', '2', '3'].includes(e.key)
  ) {
    characterSelect.selectCharacter(Number.parseInt(e.key, 10));
  }
});

window.addEventListener(
  'touchmove',
  (e) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    client.setMousePosition({
      x: Math.min(
        Math.max(Math.floor((e.touches[0].clientX - rect.left) * scaleX), 0),
        canvas.width,
      ),
      y: Math.min(
        Math.max(Math.floor((e.touches[0].clientY - rect.top) * scaleY), 0),
        canvas.height,
      ),
    });
    e.preventDefault();
  },
  { passive: false },
);

window.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  client.setMousePosition({
    x: Math.min(
      Math.max(Math.floor((e.clientX - rect.left) * scaleX), 0),
      canvas.width,
    ),
    y: Math.min(
      Math.max(Math.floor((e.clientY - rect.top) * scaleY), 0),
      canvas.height,
    ),
  });
});

window.addEventListener('click', (_e) => {
  client.handleClick();
});

window.addEventListener('DOMContentLoaded', async () => {
  const response = await fetch('/maps/00005.emf');
  const map = await response.arrayBuffer();
  const reader = new EoReader(new Uint8Array(map));
  const emf = Emf.deserialize(reader);
  client.setMap(emf);

  client.playerId = 1;
  const character = new CharacterMapInfo();
  character.playerId = 1;
  character.coords = new BigCoords();
  character.coords.x = 35;
  character.coords.y = 38;
  character.gender = Gender.Male;
  character.sitState = SitState.Floor;
  character.skin = 0;
  client.nearby.characters = [character];

  requestAnimationFrame(render);
});
