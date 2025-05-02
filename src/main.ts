import { BigCoords, CharacterMapInfo, Direction, Emf, EoReader } from "eolib";
import { MapRenderer } from "./map";
import "./style.css";
import { randomRange } from "./utils/random-range";
import { padWithZeros } from "./utils/pad-with-zeros";
import { GAME_HEIGHT, GAME_WIDTH } from "./consts";
import { Vector2 } from "./vector";
import { getBitmapById, GfxType } from "./gfx";
import { MovementController } from "./movement-controller";
import { CharacterRenderer, CharacterState } from "./character";

const GAME_FPS = 1000 / 30;

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

const mapInfo = new CharacterMapInfo();
mapInfo.playerId = 1;
mapInfo.coords = new BigCoords();
mapInfo.gender = 1; //randomRange(0, 1);
mapInfo.skin = 0; //randomRange(0, 6);

const character = new CharacterRenderer(mapInfo);

const movementController = new MovementController(character);

for (let i = 0; i < 0; ++i) {
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
		map = new MapRenderer(emf, 1);
		character.mapInfo.coords.x = randomRange(0, emf.width);
		character.mapInfo.coords.y = randomRange(0, emf.height);
		map.addCharacter(character);
		movementController.setMapDimensions(emf.width, emf.height);

		for (let i = 2; i < 10; ++i) {
			const info = new CharacterMapInfo();
			info.playerId = i;
			info.gender = randomRange(0, 1);
			info.skin = randomRange(0, 6);
			info.direction = randomRange(0, 3);
			info.coords = new BigCoords();
			info.coords.x = randomRange(0, emf.width);
			info.coords.y = randomRange(0, emf.height);
			map.addCharacter(new CharacterRenderer(info));
		}
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

	lastTime = now;

	ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

	ctx.fillStyle = "#000";
	ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

	if (map) {
		map.render(ctx);
	}

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

	ctx.fillStyle = "#fff";
	ctx.fillText(
		`Map: ${mapId} (${mapInfo.coords.x}, ${mapInfo.coords.y})`,
		5,
		15,
	);

	requestAnimationFrame(render);
};

requestAnimationFrame(render);

let mousePosition: Vector2 | undefined;

// Tick loop
setInterval(() => {
	if (map) {
		map.tick();
		if (mousePosition) {
			map.setMousePosition(mousePosition);
		}
	}
	movementController.tick();
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
