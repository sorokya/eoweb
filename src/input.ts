export enum Input {
	Up,
	Down,
	Left,
	Right,
	SitStand,
	Unknown = -1,
}

let held: boolean[] = [];
let lastDirectionHeld: Input[] = [];

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
	return dx < 0
		? dy < 0 ? Input.Left : Input.Down
		: dy < 0 ? Input.Up : Input.Right;
}

window.addEventListener("keydown", (e) => {
	switch (e.key) {
		case "w":
			updateDirectionHeld(Input.Up, true);
			break;
		case "a":
			updateDirectionHeld(Input.Left, true);
			break;
		case "s":
			updateDirectionHeld(Input.Down, true);
			break;
		case "d":
			updateDirectionHeld(Input.Right, true);
			break;
		case "x":
			updateInputHeld(Input.SitStand, true);
			break;
	}
});

window.addEventListener("keyup", (e) => {
	switch (e.key) {
		case "w":
			updateDirectionHeld(Input.Up, false);
			break;
		case "a":
			updateDirectionHeld(Input.Left, false);
			break;
		case "s":
			updateDirectionHeld(Input.Down, false);
			break;
		case "d":
			updateDirectionHeld(Input.Right, false);
			break;
		case "x":
			updateInputHeld(Input.SitStand, false);
			break;
	}
});

window.addEventListener(
	"touchstart",
	(e) => {
		const t = e.changedTouches[0];
		touchStartX = t.clientX;
		touchStartY = t.clientY;
		touchId = t.identifier;
		activeTouchDir = null;
	},
	{ passive: false },
);

window.addEventListener(
	"touchmove",
	(e) => {
		if (touchId === null) return;

		const t = Array.from(e.changedTouches).find(c => c.identifier === touchId);
		if (!t || touchStartX === null || touchStartY === null) return;

		const dx = t.clientX - touchStartX;
		const dy = t.clientY - touchStartY;
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

		e.preventDefault(); // block page scroll/zoom
	},
	{ passive: false },
);

window.addEventListener(
	"touchend",
	() => {
		if (activeTouchDir !== null) {
			updateDirectionHeld(activeTouchDir, false);
		} else if (touchStartX !== null && touchStartY !== null) {
			updateInputHeld(Input.SitStand, true);
			setTimeout(() => updateInputHeld(Input.SitStand, false), 150);
		}

		touchStartX = touchStartY = null;
		touchId = null;
		activeTouchDir = null;
	},
	{ passive: false },
);