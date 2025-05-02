export enum Input {
	Up,
	Down,
	Left,
	Right,
	Unknown = -1,
}

let directionHeld: boolean[] = [];
let lastDirectionHeld: Input[] = [];

export function isDirectionHeld(input: Input): boolean {
	return directionHeld[input] || false;
}

export function getLatestDirectionHeld(): Input | null {
	if (lastDirectionHeld.length === 0) return null;
	return lastDirectionHeld[lastDirectionHeld.length - 1];
}

function updateDirectionHeld(input: Input, down: boolean) {
	directionHeld[input] = down;
	const index = lastDirectionHeld.indexOf(input);
	if (down) {
		if (index === -1) lastDirectionHeld.push(input); // track most recent
	} else {
		if (index !== -1) lastDirectionHeld.splice(index, 1);
	}
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
	}
});
