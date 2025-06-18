import {
  AccountCreateClientPacket,
  InitInitClientPacket,
  Version,
} from 'eolib';
import './style.css';
import { ImGui, ImGui_Impl } from '@zhobo63/imgui-ts';
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
import { CharactersModal } from './ui/characters';
import { ConnectModal } from './ui/connect';
import { ErrorModal } from './ui/error';
import { LoginModal } from './ui/login';
import { Menu } from './ui/menu';
import { PacketLogModal, PacketSource } from './ui/packet-log';
import { randomRange } from './utils/random-range';
import { ChatModal, ChatTab } from './ui/chat';
import { playSfxById, SfxId } from './sfx';
import { CreateAccountModal } from './ui/create-account';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const uiCanvas = document.getElementById('ui') as HTMLCanvasElement;
if (!canvas) throw new Error('Canvas not found!');
if (!uiCanvas) throw new Error('Canvas ui not found!');

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

  const w = Math.round(rect.width / ZOOM);
  const h = Math.round(rect.height / ZOOM);

  canvas.width = w;
  canvas.height = h;
  uiCanvas.width = w;
  uiCanvas.height = h;

  canvas.style.width = `${w * ZOOM}px`;
  canvas.style.height = `${h * ZOOM}px`;

  uiCanvas.width = rect.width;
  uiCanvas.height = rect.height;
  uiCanvas.style.width = `${rect.width}px`;
  uiCanvas.style.height = `${rect.height}px`;

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
  renderUI(now);
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

const connectModal = new ConnectModal();
const errorModal = new ErrorModal();
const loginModal = new LoginModal();
const createAccountModal = new CreateAccountModal();
const charactersModal = new CharactersModal();
const chatModal = new ChatModal();
const client = new Client();

client.on('error', ({ title, message }) => {
  chatModal.addMessage(ChatTab.Local, `${title} - ${message}`);
  errorModal.open(message, title);
});

client.on('debug', (message) => {
  chatModal.addMessage(ChatTab.Local, `System: ${message}`);
});

client.on('accountCreated', () => {
  errorModal.open('Your account has been created', 'Success');
  createAccountModal.close();
});

client.on('login', (characters) => {
  playSfxById(SfxId.Login);
  loginModal.close();
  charactersModal.setCharacters(characters);
  charactersModal.open();
});

client.on('selectCharacter', () => {
  chatModal.addMessage(
    ChatTab.Local,
    `System: selected character: ${client.name}`,
  );
});

client.on('chat', ({ name, tab, message }) => {
  chatModal.addMessage(tab, `${name}: ${message}`);
});

client.on('enterGame', ({ news }) => {
  charactersModal.close();
  news.forEach((entry, index) => {
    if (!entry) {
      return;
    }

    if (index === 0) {
      chatModal.addMessage(ChatTab.Local, entry);
    } else {
      chatModal.addMessage(ChatTab.Local, `News: ${entry}`);
    }
  });
});

const initializeSocket = () => {
  if (client.bus) {
    const init = new InitInitClientPacket();
    init.challenge = randomRange(1, MAX_CHALLENGE);
    init.hdid = '161726351';
    init.version = new Version();
    init.version.major = 0;
    init.version.minor = 0;
    init.version.patch = 28;
    client.bus.send(init);
  }
};

const menu = new Menu();
connectModal.on('connect', (host) => {
  playSfxById(SfxId.ButtonClick);
  const socket = new WebSocket(host);
  socket.addEventListener('open', () => {
	chatModal.addMessage(ChatTab.Local, 'System: web socket connection opened');
    const bus = new PacketBus(socket);
    bus.on('receive', (data) => {
      packetLogModal.addEntry({
        source: PacketSource.Server,
        ...data,
      });
    });
    bus.on('send', (data) => {
      packetLogModal.addEntry({
        source: PacketSource.Client,
        ...data,
      });
    });

    client.setBus(bus);
    initializeSocket();
    connectModal.close();
  });

  socket.addEventListener('close', () => {
    errorModal.open(
      'The connection to the game server was lost, please try again a later time',
      'Lost connection',
    );
    client.bus = null;
	chatModal.addMessage(ChatTab.Local, 'System: web socket connection closed');
  });

  socket.addEventListener('error', (e) => {
    console.error('Websocket Error', e);
  });
});

menu.on('connect', () => {
  connectModal.open();
  playSfxById(SfxId.ButtonClick);
});

menu.on('create-account', () => {
  playSfxById(SfxId.ButtonClick);
  if (client.state !== GameState.Connected) {
    connectModal.open();
    return;
  }

  createAccountModal.open();
});

menu.on('login', () => {
  playSfxById(SfxId.ButtonClick);
  if (client.state !== GameState.Connected) {
    connectModal.open();
    return;
  }
  loginModal.open();
});

loginModal.on('login', ({ username, password }) => {
  playSfxById(SfxId.ButtonClick);
  client.login(username, password);
});

createAccountModal.on('createAccount', (data) => {
  playSfxById(SfxId.ButtonClick);
  client.requestAccountCreation(data);
});

charactersModal.on('select-character', (characterId) => {
  playSfxById(SfxId.ButtonClick);
  client.selectCharacter(characterId);
});

const packetLogModal = new PacketLogModal();
menu.on('packet-log', () => {
  packetLogModal.open();
});

function renderUI(now: number) {
  ImGui_Impl.NewFrame(now);
  ImGui.NewFrame();

  menu.render();
  connectModal.render();
  packetLogModal.render();
  errorModal.render();
  loginModal.render();
  createAccountModal.render();
  charactersModal.render();
  chatModal.render();

  ImGui.EndFrame();
  ImGui.Render();
  ImGui_Impl.RenderDrawData(ImGui.GetDrawData());
}

// Tick loop
setInterval(() => {
  client.tick();
  /*if (map) {
    map.tick();
    if (client.state === GameState.InGame && mousePosition) {
      map.setMousePosition(mousePosition);
    }
  }
  if (client.state === GameState.InGame) {
    movementController.tick();

    if (client.warpQueued) {
      movementController.freeze = true;
      if (movementController.character.state !== CharacterState.Walking) {
        client.acceptWarp();
        movementController.freeze = false;
      }
    }
  }
    */
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

window.addEventListener('DOMContentLoaded', async () => {
  await ImGui.default();

  ImGui.CHECKVERSION();
  ImGui.CreateContext();
  const io: ImGui.IO = ImGui.GetIO();
  ImGui.StyleColorsDark();
  io.Fonts.AddFontDefault();

  const uiCtx = uiCanvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: false,
  });

  if (!uiCtx) {
    throw new Error('Failed to get webgl2 context');
  }

  ImGui_Impl.Init(uiCtx);

  requestAnimationFrame(render);
});
