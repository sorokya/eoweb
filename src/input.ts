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
