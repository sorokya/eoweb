import "./style.css";

const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;

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

const render = () => {
	ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

	ctx.fillStyle = "#000";
	ctx.fillText("EOWeb!", 100, 100);

	requestAnimationFrame(render);
};

requestAnimationFrame(render);
