import {
  BigCoords,
  CharacterMapInfo,
  Emf,
  EoReader,
  InitInitClientPacket,
  SitState,
  Version,
} from 'eolib';
import { MapRenderer } from './map';
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
import { MovementController } from './movement-controller';
import { CharacterRenderer } from './rendering/character';
import { CharactersModal } from './ui/characters';
import { ConnectModal } from './ui/connect';
import { ErrorModal } from './ui/error';
import { LoginModal } from './ui/login';
import { Menu } from './ui/menu';
import { PacketLogModal, PacketSource } from './ui/packet-log';
import { padWithZeros } from './utils/pad-with-zeros';
import { randomRange } from './utils/random-range';
import type { Vector2 } from './vector';
import { ChatModal, ChatTab } from './ui/chat';

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

const mapInfo = new CharacterMapInfo();
mapInfo.playerId = 1;
mapInfo.coords = new BigCoords();
mapInfo.coords.x = 35;
mapInfo.coords.y = 41;
mapInfo.gender = 1;
mapInfo.skin = 0;
mapInfo.sitState = SitState.Stand;

const character = new CharacterRenderer(mapInfo);

let movementController = new MovementController(character);

let map: MapRenderer | undefined;

fetch(`/maps/${padWithZeros(5, 5)}.emf`)
  .then((res) => res.arrayBuffer())
  .then((buf) => {
    const reader = new EoReader(new Uint8Array(buf));
    const emf = Emf.deserialize(reader);
    map = new MapRenderer(emf, 1);
    map.addCharacter(character);
    movementController.setMapDimensions(emf.width, emf.height);
  });

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

  switch (client.state) {
    // @ts-ignore: Error should go away when state can change
    case GameState.Initial:
    case GameState.Connected:
    case GameState.LoggedIn:
    case GameState.InGame:
      renderInitialState(now, ctx);
      break;
  }

  requestAnimationFrame(render);
};

const connectModal = new ConnectModal();
const errorModal = new ErrorModal();
const loginModal = new LoginModal();
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

client.on('login', (characters) => {
  loginModal.close();
  charactersModal.setCharacters(characters);
  charactersModal.open();
});

client.on('selectCharacter', () => {
  chatModal.addMessage(
    ChatTab.Local,
    `System: selected character: ${client.character.name}`,
  );
});

client.on('enterGame', ({ news }) => {
  charactersModal.close();
  map = new MapRenderer(client.map, client.playerId);
  for (const character of client.nearby.characters) {
    const renderer = new CharacterRenderer(character);
    map.addCharacter(renderer);
    if (character.playerId === client.playerId) {
      movementController = new MovementController(renderer);
      movementController.setMapDimensions(client.map.width, client.map.height);
    }
  }

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

  chatModal.addMessage(
    ChatTab.Local,
    `System: Nearby - Characters: ${client.nearby.characters.length}, NPCs: ${client.nearby.npcs.length}, Items: ${client.nearby.items.length}`,
  );
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
});

menu.on('login', () => {
  if (client.state !== GameState.Connected) {
    return;
  }
  loginModal.open();
});

loginModal.on('login', ({ username, password }) => {
  client.login(username, password);
});

charactersModal.on('select-character', (characterId) => {
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
  charactersModal.render();
  chatModal.render();

  ImGui.EndFrame();
  ImGui.Render();
  ImGui_Impl.RenderDrawData(ImGui.GetDrawData());
}

function renderInitialState(
  now: DOMHighResTimeStamp,
  ctx: CanvasRenderingContext2D,
) {
  if (map) {
    map.render(ctx);
  }

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 12px serif';
  ctx.fillText('WASD - Move, X - Sit/Stand', 10, 40);
}

let mousePosition: Vector2 | undefined;

// Tick loop
setInterval(() => {
  if (map) {
    map.tick();
    if (client.state === GameState.InGame && mousePosition) {
      map.setMousePosition(mousePosition);
    }
  }
  if (client.state === GameState.InGame) {
    movementController.tick();
  }
}, 120);

window.onmousemove = (e) => {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  mousePosition = {
    x: Math.min(
      Math.max(Math.floor((e.clientX - rect.left) * scaleX), 0),
      canvas.width,
    ),
    y: Math.min(
      Math.max(Math.floor((e.clientY - rect.top) * scaleY), 0),
      canvas.height,
    ),
  };
};

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
