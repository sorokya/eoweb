import { BigCoords, CharacterMapInfo, Emf, EoReader, InitInitClientPacket, SitState, Version } from "eolib";
import { MapRenderer } from "./map";
import "./style.css";
import { padWithZeros } from "./utils/pad-with-zeros";
import { GAME_FPS, GAME_HEIGHT, GAME_WIDTH, MAX_CHALLENGE } from "./consts";
import { Vector2 } from "./vector";
import { MovementController } from "./movement-controller";
import { CharacterRenderer } from "./character";
import { ImGui, ImGui_Impl } from "@zhobo63/imgui-ts";
import { Menu } from "./ui/menu";
import { ConnectModal } from "./ui/connect";
import { ErrorModal } from "./ui/error";
import { randomRange } from "./utils/random-range";
import { PacketBus, PacketLog } from "./bus";
import { Client } from "./client";
import { PacketLogModal, PacketSource } from "./ui/packet-log";

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

ctx.imageSmoothingEnabled = false;

enum GameState {
	Initial,
	Login,
	LoggedIn,
	InGame,
};

let state: GameState = GameState.InGame;

const mapInfo = new CharacterMapInfo();
mapInfo.playerId = 1;
mapInfo.coords = new BigCoords();
mapInfo.coords.x = 35;
mapInfo.coords.y = 41;
mapInfo.gender = 1;
mapInfo.skin = 0;
mapInfo.sitState = SitState.Stand;

const character = new CharacterRenderer(mapInfo);

const movementController = new MovementController(character);

let map: MapRenderer | undefined;

const mapId = 5;

fetch(`/maps/${padWithZeros(mapId, 5)}.emf`)
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

	ctx.fillStyle = "#000";
	ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

	switch (state) {
		case GameState.Initial:
		case GameState.InGame:
			renderInitialState(now, ctx);
			break;
	}

	requestAnimationFrame(render);
};

let connectModal: ConnectModal | null = null;
let errorModal: ErrorModal | null = null;
const client = new Client();

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
let receiveCallack: ((data: PacketLog) => void) | null = null;
let sendCallback: ((data: PacketLog) => void) | null = null;
menu.on('connect', () => {
	connectModal = new ConnectModal();
	connectModal.on('closed', () => {
		connectModal = null;
	});

	connectModal.on('connect', (host) => {
		const socket = new WebSocket(host);
		socket.addEventListener('open', () => {
			const bus = new PacketBus(socket);
			receiveCallack = (data) => {
				if (packetLogModal) {
					packetLogModal.addEntry({
						source: PacketSource.Server,
						...data,
					});
				}
			};
			bus.on('receive', receiveCallack);
			sendCallback = (data) => {
				if (packetLogModal) {
					packetLogModal.addEntry({
						source: PacketSource.Client,
						...data,
					});
				}
			};
			bus.on('send', sendCallback);
			client.setBus(bus);
			initializeSocket();
			connectModal = null;
		});

		socket.addEventListener('close', () => {
			console.log('Server closed connection..');
			client.bus = null;
		});

		socket.addEventListener('error', (e) => {
			console.error('Websocket Error', e);
		});
	});
});

let packetLogModal: PacketLogModal | null = null;
menu.on('packet-log', () => {
	packetLogModal = new PacketLogModal();
});

function renderUI(now: number) {
	ImGui_Impl.NewFrame(now);
	ImGui.NewFrame();

	menu.render();

	if (connectModal) {
		connectModal.render();
	}

	if (packetLogModal) {
		packetLogModal.render();
	}

	ImGui.EndFrame();
	ImGui.Render();
	ImGui_Impl.RenderDrawData(ImGui.GetDrawData());
}

function renderInitialState(now: DOMHighResTimeStamp, ctx: CanvasRenderingContext2D) {
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
		if (state === GameState.InGame && mousePosition) {
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

window.addEventListener('DOMContentLoaded', async () => {
	await ImGui.default();

	ImGui.CHECKVERSION();
	ImGui.CreateContext();
	const io: ImGui.IO = ImGui.GetIO();
	ImGui.StyleColorsDark();
	io.Fonts.AddFontDefault();

	const uiCanvas: HTMLCanvasElement = document.getElementById("ui") as HTMLCanvasElement;
	const uiCtx = uiCanvas.getContext('webgl2', {
		alpha: true,
		premultipliedAlpha: false,
	});
	ImGui_Impl.Init(uiCtx);

	requestAnimationFrame(render);
});