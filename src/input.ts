import { zoomIn, zoomOut } from './main';

export enum Input {
  Up = 0,
  Down = 1,
  Left = 2,
  Right = 3,
  SitStand = 4,
  Attack = 5,
  Unknown = -1,
}

const held: boolean[] = [];
const lastDirectionHeld: Input[] = [];

let touchStartX: number | null = null;
let touchStartY: number | null = null;
let touchId: number | null = null;
let activeTouchDir: Input | null = null;

const DRAG_THRESHOLD = 30;

export function isInputHeld(input: Input): boolean {
  return held[input] || false;
}

export function getLatestDirectionHeld(): Input | null {
  if (lastDirectionHeld.length === 0) return null;
  return lastDirectionHeld[lastDirectionHeld.length - 1];
}

function updateDirectionHeld(input: Input, down: boolean) {
  held[input] = down;
  const index = lastDirectionHeld.indexOf(input);
  if (down) {
    if (index === -1) lastDirectionHeld.push(input); // track most recent
  } else {
    if (index !== -1) lastDirectionHeld.splice(index, 1);
  }
}

function updateInputHeld(input: Input, down: boolean) {
  held[input] = down;
}

function swipedDir(dx: number, dy: number): Input {
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx < 0 ? Input.Left : Input.Right;
  }
  return dy < 0 ? Input.Up : Input.Down;
}

window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && ['=', '+', '-', '_'].includes(e.key)) {
    e.preventDefault();
    if (e.key === '=' || e.key === '+') zoomIn();
    else zoomOut();
  }
  switch (e.key) {
    case 'w':
    case 'W':
    case 'ArrowUp':
      updateDirectionHeld(Input.Up, true);
      break;
    case 'a':
    case 'A':
    case 'ArrowLeft':
      updateDirectionHeld(Input.Left, true);
      break;
    case 's':
    case 'S':
    case 'ArrowDown':
      updateDirectionHeld(Input.Down, true);
      break;
    case 'd':
    case 'D':
    case 'ArrowRight':
      updateDirectionHeld(Input.Right, true);
      break;
    case 'x':
    case 'X':
      updateInputHeld(Input.SitStand, true);
      break;
    case ' ':
    case 'Control':
      updateInputHeld(Input.Attack, true);
      break;
  }
});

window.addEventListener('keyup', (e) => {
  switch (e.key) {
    case 'w':
    case 'W':
    case 'ArrowUp':
      updateDirectionHeld(Input.Up, false);
      break;
    case 'a':
    case 'A':
    case 'ArrowLeft':
      updateDirectionHeld(Input.Left, false);
      break;
    case 's':
    case 'S':
    case 'ArrowDown':
      updateDirectionHeld(Input.Down, false);
      break;
    case 'd':
    case 'D':
    case 'ArrowRight':
      updateDirectionHeld(Input.Right, false);
      break;
    case 'x':
    case 'X':
      updateInputHeld(Input.SitStand, false);
      break;
    case ' ':
    case 'Control':
      updateInputHeld(Input.Attack, false);
      break;
  }
});

const joystickContainer = document.getElementById('joystick-container');
const thumb = document.getElementById('joystick-thumb');

let inputVector = { x: 0, y: 0 };
const maxRadius = 40;

joystickContainer.addEventListener('touchstart', (e) => {
  const t = e.changedTouches[0];
  touchStartX = t.clientX;
  touchStartY = t.clientY;
  touchId = t.identifier;
  activeTouchDir = null;
  handleTouchMove(e);
});

joystickContainer.addEventListener('touchmove', (e) => {
  handleTouchMove(e);
  e.preventDefault();
});

joystickContainer.addEventListener('touchend', () => {
  inputVector = { x: 0, y: 0 };
  thumb.style.transform = 'translate(0px, 0px)';
  if (activeTouchDir !== null) {
    updateDirectionHeld(activeTouchDir, false);
  }

  touchStartX = touchStartY = null;
  touchId = null;
  activeTouchDir = null;
});

function handleTouchMove(e: TouchEvent) {
  const rect = joystickContainer.getBoundingClientRect();
  const touch = e.touches[0];
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  let dx = touch.clientX - centerX;
  let dy = touch.clientY - centerY;

  const distance = Math.min(Math.sqrt(dx * dx + dy * dy), maxRadius);

  const angle = Math.atan2(dy, dx);
  const clampedX = Math.cos(angle) * distance;
  const clampedY = Math.sin(angle) * distance;

  inputVector.x = clampedX / maxRadius;
  inputVector.y = clampedY / maxRadius;

  thumb.style.transform = `translate(${clampedX}px, ${clampedY}px)`;

  if (touchId === null) return;

  const t = Array.from(e.changedTouches).find((c) => c.identifier === touchId);
  if (!t || touchStartX === null || touchStartY === null) return;

  dx = t.clientX - touchStartX;
  dy = t.clientY - touchStartY;
  const dist2 = dx * dx + dy * dy;

  if (dist2 < DRAG_THRESHOLD * DRAG_THRESHOLD) {
    if (activeTouchDir !== null) {
      updateDirectionHeld(activeTouchDir, false);
      activeTouchDir = null;
    }
    return;
  }

  const dir = swipedDir(dx, dy);
  if (dir !== activeTouchDir) {
    if (activeTouchDir !== null) updateDirectionHeld(activeTouchDir, false);
    updateDirectionHeld(dir, true);
    activeTouchDir = dir;
  }
}

const btnAttack = document.getElementById('btn-attack');
btnAttack.addEventListener('touchstart', () => {
  updateInputHeld(Input.Attack, true);
});

btnAttack.addEventListener('touchend', () => {
  updateInputHeld(Input.Attack, false);
});

const btnSit = document.getElementById('btn-toggle-sit');
btnSit.addEventListener('touchstart', () => {
  updateInputHeld(Input.SitStand, true);
});

btnSit.addEventListener('touchend', () => {
  updateInputHeld(Input.SitStand, false);
});



window.addEventListener(
  'wheel',
  (e) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) zoomIn();
      else if (e.deltaY > 0) zoomOut();
    }
  },
  { passive: false },
);

window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  e.stopPropagation();
  return false;
});
