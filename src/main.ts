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
import { GAME_FPS, MAX_CHALLENGE } from './consts';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  ZOOM,
  setGameSize,
  setZoom,
} from './game-state';
import { randomRange } from './utils/random-range';
import { playSfxById, SfxId } from './sfx';
import { MainMenu } from './ui/main-menu';
import { LoginForm } from './ui/login';
import { CharacterSelect } from './ui/character-select';
import { SmallAlertLargeHeader } from './ui/small-alert-large-header';
import { ExitGame } from './ui/exit-game';
import { SmallConfirm } from './ui/small-confirm';

const canvas = document.getElementById('game') as HTMLCanvasElement;
if (!canvas) throw new Error('Canvas not found!');

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
  const rect = document.getElementById('container')?.getBoundingClientRect();

  if (!userOverride) setZoom(rect.width >= 1280 ? 2 : 1);

  const w = Math.floor(rect.width / ZOOM);
  const h = Math.floor(rect.height / ZOOM);

  canvas.width = w;
  canvas.height = h;

  canvas.style.width = `${w * ZOOM}px`;
  canvas.style.height = `${h * ZOOM}px`;

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

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  client.render(ctx);
  requestAnimationFrame(render);
};

const client = new Client();

client.on('error', ({ title, message }) => {
  smallAlertLargeHeader.setContent(message, title);
  smallAlertLargeHeader.show();
});

client.on('debug', (message) => {});

client.on('accountCreated', () => {});

client.on('login', (characters) => {
  playSfxById(SfxId.Login);
  loginForm.hide();
  characterSelect.setCharacters(characters);
  characterSelect.show();
});

client.on('characterCreated', (characters) => {});

client.on('selectCharacter', () => {});

client.on('chat', ({ name, tab, message }) => {});

client.on('enterGame', ({ news }) => {
  characterSelect.hide();
  exitGame.show();
});

const initializeSocket = (next: 'login' | 'create') => {
  const socket = new WebSocket('ws://localhost:8077');
  socket.addEventListener('open', () => {
    mainMenu.hide();
    if (next === 'create') {
      //createAccountModal.open();
    } else if (next === 'login') {
      loginForm.show();
    }

    const bus = new PacketBus(socket);
    bus.on('receive', (data) => {
      /*
      packetLogModal.addEntry({
        source: PacketSource.Server,
        ...data,
      });
      */
    });
    bus.on('send', (data) => {
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
const characterSelect = new CharacterSelect();
const smallAlertLargeHeader = new SmallAlertLargeHeader();
const exitGame = new ExitGame();
const smallConfirm = new SmallConfirm();

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
  }
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
  characterSelect.hide();
  mainMenu.show();
});

characterSelect.on('selectCharacter', (id) => {
  client.selectCharacter(id);
});

// Tick loop
setInterval(() => {
  client.tick();
}, 120);

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

window.addEventListener('click', (e) => {
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
