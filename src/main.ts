import { Emf, EoReader } from "eolib";
import { getBitmapById, GfxType } from "./gfx";
import { MapRenderer } from "./map";
import "./style.css";
import { randomRange } from "./utils/random-range";
import { padWithZeros } from "./utils/pad-with-zeros";
import { Vector2 } from "./vector";

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
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

const playerPosition = new Vector2(0, 0);

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

for (let i = 0; i < 1000; ++i) {
	const id = randomRange(1, 300);
	npcs.push({
		id,
		x: randomRange(0, GAME_WIDTH),
		y: randomRange(0, GAME_HEIGHT),
	});
}

let map: MapRenderer | undefined;

const mapId = 5; //randomRange(1, 282);
console.log(mapId, "mapId");

fetch(`/maps/${padWithZeros(mapId, 5)}.emf`)
	.then((res) => res.bytes())
	.then((buf) => {
		const reader = new EoReader(buf);
		const emf = Emf.deserialize(reader);
		map = new MapRenderer(emf, GAME_WIDTH, GAME_HEIGHT);
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
			playerPosition.y -= 1;
		} else if (held.down) {
			playerPosition.y += 1;
		}

		if (held.left) {
			playerPosition.x -= 1;
		} else if (held.right) {
			playerPosition.x += 1;
		}

		playerPosition.x = Math.max(0, playerPosition.x);
		playerPosition.y = Math.max(0, playerPosition.y);
		playerPosition.x = Math.min(map.getWidth(), playerPosition.x);
		playerPosition.y = Math.min(map.getHeight(), playerPosition.y);
	}

	lastTime = now;

	ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

	ctx.fillStyle = "#000";
	ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

	if (map) {
		map.render(ctx, playerPosition);
	}

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

	requestAnimationFrame(render);
};

requestAnimationFrame(render);
