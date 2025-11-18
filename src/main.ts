import {
  BigCoords,
  CharacterMapInfo,
  Direction,
  Emf,
  EoReader,
  EquipmentMapInfo,
  Gender,
  SitState,
} from 'eolib';
import './css/style.css';
import 'notyf/notyf.min.css';
import { Client, GameState } from './client';
import { GAME_FPS } from './consts';
import {
  GAME_HEIGHT,
  GAME_WIDTH,
  setGameSize,
  setZoom,
  ZOOM,
} from './game-state';

const canvas = document.getElementById('game') as HTMLCanvasElement;
if (!canvas) throw new Error('Canvas not found!');

const ctx = canvas.getContext('2d', { alpha: false });
if (!ctx) {
  throw new Error('Failed to get canvas context!');
}
ctx.imageSmoothingEnabled = false;

const client = new Client();

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
  setGameSize(w, h);
  if (client.state === GameState.InGame && viewportWidth < 940) {
  } else {
  }
}

resizeCanvases();
window.addEventListener('resize', resizeCanvases);

let lastTime: DOMHighResTimeStamp | undefined;
let accumulator = 0;
const TICK = 120;
const render = (now: DOMHighResTimeStamp) => {
  if (!lastTime) {
    lastTime = now;
  }

  const ellapsed = now - lastTime;
  if (ellapsed < GAME_FPS) {
    requestAnimationFrame(render);
    return;
  }

  const dt = now - lastTime;
  accumulator += dt;

  while (accumulator >= TICK) {
    client.tick();
    accumulator -= TICK;
  }

  lastTime = now;

  const interpolation = accumulator / TICK;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  client.render(ctx, interpolation);
  requestAnimationFrame(render);
};

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

window.addEventListener('click', (e) => {
  client.handleClick(e);
});

window.addEventListener('contextmenu', (e) => {
  client.handleRightClick(e);
  e.preventDefault();
});

/*
function loadInventoryGrid() {
  const img = new Image();
  img.src = '/gfx/gfx002/144.png';
  img.onload = () => {
    const canvas: HTMLCanvasElement = document.createElement('canvas');
    canvas.width = 23;
    canvas.height = 23;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, 23, 23);
    ctx.drawImage(img, 12, 10, 23, 23, 0, 0, 23, 23);

    const dataUrl = canvas.toDataURL();
    const grid = document.querySelector<HTMLDivElement>('#inventory .grid');
    grid.style.background = `url(${dataUrl})`;
  };
}
  */

window.addEventListener('DOMContentLoaded', async () => {
  const response = await fetch('/maps/00005.emf');
  const map = await response.arrayBuffer();
  const reader = new EoReader(new Uint8Array(map));
  const emf = Emf.deserialize(reader);
  client.setMap(emf);

  client.playerId = 0;
  const character = new CharacterMapInfo();
  character.playerId = 0;
  character.coords = new BigCoords();
  character.coords.x = 35;
  character.coords.y = 38;
  character.gender = Gender.Female;
  character.sitState = SitState.Floor;
  character.skin = 0;
  character.hairStyle = 1;
  character.hairColor = 0;
  character.name = 'debug';
  character.guildTag = '   ';
  character.direction = Direction.Down;
  character.equipment = new EquipmentMapInfo();
  character.equipment.armor = 0;
  character.equipment.weapon = 0;
  character.equipment.boots = 0;
  character.equipment.shield = 0;
  character.equipment.hat = 0;
  client.nearby.characters = [character];
  client.atlas.refresh();

  //loadInventoryGrid();
  requestAnimationFrame(render);
});
