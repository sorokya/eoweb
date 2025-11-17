import { zoomIn, zoomOut } from './main';

export enum Input {
  Up = 0,
  Down = 1,
  Left = 2,
  Right = 3,
  SitStand = 4,
  Attack = 5,
  EmoteHappy = 6,
  EmoteDepressed = 7,
  EmoteSad = 8,
  EmoteAngry = 9,
  EmoteConfused = 10,
  EmoteSurprised = 11,
  EmoteHearts = 12,
  EmoteMoon = 13,
  EmoteSuicidal = 14,
  EmoteEmbarassed = 15,
  EmotePlayful = 16,
  Hotbar1 = 17,
  Hotbar2 = 18,
  Hotbar3 = 19,
  Hotbar4 = 20,
  Hotbar5 = 21,
  Tab = 22,
  Refresh = 23,
  Unknown = -1,
}

const held: boolean[] = [];
const lastInputHeld: Input[] = []; // | null = null;

export function isInputHeld(input: Input): boolean {
  return held[input] || false;
}

export function isOrWasInputHeld(input: Input): boolean {
  return held[input] || wasInputHeldLastTick(input);
}

export function getLastHeldDirection(): Input | null {
  const directions = lastInputHeld.filter((i) =>
    [Input.Up, Input.Down, Input.Left, Input.Right].includes(i),
  );
  return directions[directions.length - 1] ?? null;
}

export function wasInputHeldLastTick(input: Input): boolean {
  return lastInputHeld.indexOf(input) > -1;
}

export function clearUnheldInput() {
  for (let i = lastInputHeld.length - 1; i >= 0; --i) {
    if (!held[lastInputHeld[i]]) {
      lastInputHeld.splice(i, 1);
    }
  }
}

function updateInputHeld(input: Input, down: boolean) {
  held[input] = down;
  const index = lastInputHeld.indexOf(input);
  if (down) {
    if (index === -1) lastInputHeld.push(input); // track most recent
  }
}

window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && ['=', '+', '-', '_'].includes(e.key)) {
    e.preventDefault();
    if (e.key === '=' || e.key === '+') zoomIn();
    else zoomOut();
  }
  switch (e.code) {
    case 'KeyW':
    case 'ArrowUp':
      updateInputHeld(Input.Up, true);
      break;
    case 'KeyA':
    case 'ArrowLeft':
      updateInputHeld(Input.Left, true);
      break;
    case 'KeyS':
    case 'ArrowDown':
      updateInputHeld(Input.Down, true);
      break;
    case 'KeyD':
    case 'ArrowRight':
      updateInputHeld(Input.Right, true);
      break;
    case 'KeyX':
      updateInputHeld(Input.SitStand, true);
      break;
    case 'Space':
    case 'ControlLeft':
    case 'ControlRight':
      updateInputHeld(Input.Attack, true);
      break;
    case 'NumpadDecimal':
      updateInputHeld(Input.EmoteEmbarassed, true);
      break;
    case 'Numpad0':
      updateInputHeld(Input.EmotePlayful, true);
      break;
    case 'Numpad1':
      updateInputHeld(Input.EmoteHappy, true);
      break;
    case 'Numpad2':
      updateInputHeld(Input.EmoteDepressed, true);
      break;
    case 'Numpad3':
      updateInputHeld(Input.EmoteSad, true);
      break;
    case 'Numpad4':
      updateInputHeld(Input.EmoteAngry, true);
      break;
    case 'Numpad5':
      updateInputHeld(Input.EmoteConfused, true);
      break;
    case 'Numpad6':
      updateInputHeld(Input.EmoteSurprised, true);
      break;
    case 'Numpad7':
      updateInputHeld(Input.EmoteHearts, true);
      break;
    case 'Numpad8':
      updateInputHeld(Input.EmoteMoon, true);
      break;
    case 'Numpad9':
      updateInputHeld(Input.EmoteSuicidal, true);
      break;
    case 'Digit1':
      updateInputHeld(Input.Hotbar1, true);
      break;
    case 'Digit2':
      updateInputHeld(Input.Hotbar2, true);
      break;
    case 'Digit3':
      updateInputHeld(Input.Hotbar3, true);
      break;
    case 'Digit4':
      updateInputHeld(Input.Hotbar4, true);
      break;
    case 'Digit5':
      updateInputHeld(Input.Hotbar5, true);
      break;
    case 'Tab':
      updateInputHeld(Input.Tab, true);
      e.preventDefault();
      break;
    case 'KeyR':
      updateInputHeld(Input.Refresh, true);
      break;
  }
});

window.addEventListener('keyup', (e) => {
  switch (e.code) {
    case 'KeyW':
    case 'ArrowUp':
      updateInputHeld(Input.Up, false);
      break;
    case 'KeyA':
    case 'ArrowLeft':
      updateInputHeld(Input.Left, false);
      break;
    case 'KeyS':
    case 'ArrowDown':
      updateInputHeld(Input.Down, false);
      break;
    case 'KeyD':
    case 'ArrowRight':
      updateInputHeld(Input.Right, false);
      break;
    case 'KeyX':
      updateInputHeld(Input.SitStand, false);
      break;
    case 'Space':
    case 'ControlLeft':
    case 'ControlRight':
      updateInputHeld(Input.Attack, false);
      break;
    case 'NumpadDecimal':
      updateInputHeld(Input.EmoteEmbarassed, false);
      break;
    case 'Numpad0':
      updateInputHeld(Input.EmotePlayful, false);
      break;
    case 'Numpad1':
      updateInputHeld(Input.EmoteHappy, false);
      break;
    case 'Numpad2':
      updateInputHeld(Input.EmoteDepressed, false);
      break;
    case 'Numpad3':
      updateInputHeld(Input.EmoteSad, false);
      break;
    case 'Numpad4':
      updateInputHeld(Input.EmoteAngry, false);
      break;
    case 'Numpad5':
      updateInputHeld(Input.EmoteConfused, false);
      break;
    case 'Numpad6':
      updateInputHeld(Input.EmoteSurprised, false);
      break;
    case 'Numpad7':
      updateInputHeld(Input.EmoteHearts, false);
      break;
    case 'Numpad8':
      updateInputHeld(Input.EmoteMoon, false);
      break;
    case 'Numpad9':
      updateInputHeld(Input.EmoteSuicidal, false);
      break;
    case 'Digit1':
      updateInputHeld(Input.Hotbar1, false);
      break;
    case 'Digit2':
      updateInputHeld(Input.Hotbar2, false);
      break;
    case 'Digit3':
      updateInputHeld(Input.Hotbar3, false);
      break;
    case 'Digit4':
      updateInputHeld(Input.Hotbar4, false);
      break;
    case 'Digit5':
      updateInputHeld(Input.Hotbar5, false);
      break;
    case 'Tab':
      updateInputHeld(Input.Tab, false);
      break;
    case 'KeyR':
      updateInputHeld(Input.Refresh, false);
      break;
  }
});

/*
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
    updateInputHeld(activeTouchDir, false);
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
      updateInputHeld(activeTouchDir, false);
      activeTouchDir = null;
    }
    return;
  }

  const dir = swipedDir(dx, dy);
  if (dir !== activeTouchDir) {
    if (activeTouchDir !== null) updateInputHeld(activeTouchDir, false);
    updateInputHeld(dir, true);
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

*/

/*
window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
  e.stopPropagation();
  return false;
});
*/
