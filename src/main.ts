import { BigCoords, CharacterMapInfo, Coords, Emf, EoReader } from "eolib";
import { getBitmapById, GfxType } from "./gfx";
import { MapRenderer } from "./map";
import "./style.css";
import { randomRange } from "./utils/random-range";
import { padWithZeros } from "./utils/pad-with-zeros";
import { Vector2 } from "./vector";
import { GAME_HEIGHT, GAME_WIDTH } from "./consts";
import { MainCharacterRenderer } from "./character";

const GAME_FPS = 1000 / 60;

const canvas = document.getElementById("game");
if (!canvas || !(canvas instanceof HTMLCanvasElement)) {
	throw new Error("Canvas not found!");
}

canvas.width = GAME_WIDTH;
canvas.height = GAME_HEIGHT;

const ctx = canvas.getContext("2d");
if (!ctx) {
	throw new Error("Failed to get canvas context!");
}

const npcs: { id: number; x: number; y: number }[] = [];

const character = new CharacterMapInfo();
character.coords = new BigCoords();
const characterRenderer = new MainCharacterRenderer(character);

const held = {
	up: false,
	down: false,
	left: false,
	right: false,
};

window.onkeydown = (e) => {
	if (e.key === "w") {
		held.up = true;
	} else if (e.key === "a") {
		held.left = true;
	} else if (e.key === "s") {
		held.down = true;
	} else if (e.key === "d") {
		held.right = true;
	}
};

window.onkeyup = (e) => {
	if (e.key === "w") {
		held.up = false;
	} else if (e.key === "a") {
		held.left = false;
	} else if (e.key === "s") {
		held.down = false;
	} else if (e.key === "d") {
		held.right = false;
	}
};

for (let i = 0; i < 100; ++i) {
	const id = randomRange(1, 300);
	npcs.push({
		id,
		x: randomRange(0, GAME_WIDTH),
		y: randomRange(0, GAME_HEIGHT),
	});
}

let map: MapRenderer | undefined;

const mapId = randomRange(1, 282);

fetch(`/maps/${padWithZeros(mapId, 5)}.emf`)
	.then((res) => res.bytes())
	.then((buf) => {
		const reader = new EoReader(buf);
		const emf = Emf.deserialize(reader);
		map = new MapRenderer(emf);
	});

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

	if (map) {
		if (held.up) {
			character.coords.y -= 1;
		} else if (held.down) {
			character.coords.y += 1;
		}

		if (held.left) {
			character.coords.x -= 1;
		} else if (held.right) {
			character.coords.x += 1;
		}

		character.coords.x = Math.max(0, character.coords.x);
		character.coords.y = Math.max(0, character.coords.y);
		character.coords.x = Math.min(map.getWidth(), character.coords.x);
		character.coords.y = Math.min(map.getHeight(), character.coords.y);
	}

	lastTime = now;

	ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

	ctx.fillStyle = "#000";
	ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

	if (map) {
		map.render(ctx, character.coords);
	}

	characterRenderer.render(ctx);

	/*
  for (const npc of npcs) {
    const bmp = getBitmapById(GfxType.NPC, (npc.id - 1) * 40 + 1);
    if (!bmp) {
      continue;
    }

    npc.x += randomRange(-1, 1);
    npc.y += randomRange(-1, 1);

    if (npc.x < 0 || npc.y < 0) {
      npc.x = randomRange(0, GAME_WIDTH);
      npc.y = randomRange(0, GAME_HEIGHT);
    }

    ctx.drawImage(bmp, npc.x, npc.y);
  }
  */

	ctx.fillStyle = "#fff";
	ctx.fillText(
		`Map: ${mapId} (${character.coords.x}, ${character.coords.y})`,
		5,
		15,
	);

	requestAnimationFrame(render);
};

requestAnimationFrame(render);

// Tick loop
setInterval(() => {
	if (map) {
		map.tick();
	}
}, 100);
