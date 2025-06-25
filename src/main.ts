import {
  BigCoords,
  CharacterMapInfo,
  Emf,
  EoReader,
  Gender,
  InitInitClientPacket,
  SitState,
  Version,
} from 'eolib';
import './style.css';
import { PacketBus } from './bus';
import { Client, GameState } from './client';
import { GAME_FPS, HOST, MAX_CHALLENGE } from './consts';
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
import { CreateAccountForm } from './ui/create-account';
import { CreateCharacterForm } from './ui/create-character';
import { ExitGame } from './ui/exit-game';
import { LoginForm } from './ui/login';
import { MainMenu } from './ui/main-menu';
import { MobileControls } from './ui/mobile-controls';
import { OffsetTweaker } from './ui/offset-tweaker';
import { SmallAlertLargeHeader } from './ui/small-alert-large-header';
import { SmallConfirm } from './ui/small-confirm';
import { capitalize } from './utils/capitalize';
import { randomRange } from './utils/random-range';

const canvas = document.getElementById('game') as HTMLCanvasElement;
if (!canvas) throw new Error('Canvas not found!');

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

  // Prefer visualViewport for accurate mobile height
  const viewportWidth =
    window.visualViewport?.width ?? container.getBoundingClientRect().width;
  const viewportHeight =
    window.visualViewport?.height ?? container.getBoundingClientRect().height;

  if (!userOverride) setZoom(viewportWidth >= 1280 ? 2 : 1);

  const w = Math.floor(viewportWidth / ZOOM);
  const h = Math.floor(viewportHeight / ZOOM);

  canvas.width = w;
  canvas.height = h;

  canvas.style.width = `${w * ZOOM}px`;
  canvas.style.height = `${h * ZOOM}px`;

  client.mapRenderer.resizeCanvas(w, h);

  if (client.state === GameState.InGame && viewportWidth < 940) {
    mobileControls.show();
  } else {
    mobileControls.hide();
  }

  setGameSize(w, h);
}
resizeCanvases();
window.addEventListener('resize', resizeCanvases);

const ctx = canvas.getContext('2d');
if (!ctx) {
  throw new Error('Failed to get canvas context!');
}

ctx.imageSmoothingEnabled = false;

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
  //offsetTweaker.show();
  resizeCanvases();
});

client.on('passwordChanged', () => {
  changePasswordForm.hide();
  smallAlertLargeHeader.setContent(
    'Your password has been changed, please use your new password next time you login.',
    'Password changed',
  );
  smallAlertLargeHeader.show();
});

const initializeSocket = (next: 'login' | 'create') => {
  const socket = new WebSocket(HOST);
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

    const init = new InitInitClientPacket();
    init.challenge = randomRange(1, MAX_CHALLENGE);
    init.hdid = '111111111';
    init.version = new Version();
    init.version.major = 0;
    init.version.minor = 0;
    init.version.patch = 28;
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

// Tick loop
setInterval(() => {
  client.tick();
}, 120);

window.addEventListener('keyup', (e) => {
  if (client.state === GameState.InGame && e.key === 'Enter') {
    chat.focus();
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
