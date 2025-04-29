import { padWithZeros } from "./utils/pad-with-zeros";

export enum GfxType {
	PreLoginUI = 1,
	PostLoginUI,
	MapTiles,
	MapObjects,
	MapOverlay,
	MapWalls,
	MapWallTop,
	SkinSprites,
	MaleHair,
	FemaleHair,
	MaleShoes,
	FemaleShoes,
	MaleArmor,
	FemaleArmor,
	MaleHat,
	FemaleHat,
	MaleWeapons,
	FemaleWeapons,
	MaleBack,
	FemaleBack,
	NPC,
	Shadows,
	Items,
	Spells,
	SpellIcons,
}

const GFX: HTMLImageElement[][] = [];
const PENDING: { type: GfxType; id: number }[] = [];

export function getBitmapById(
	gfxType: GfxType,
	resourceId: number,
): HTMLImageElement | null {
	if (PENDING.some((p) => p.type === gfxType && p.id === resourceId)) {
		return null;
	}

	const gfx = GFX[gfxType];
	if (!gfx) {
		loadBitmapById(gfxType, resourceId);
		return null;
	}

	const bmp = gfx[resourceId];
	if (!bmp) {
		loadBitmapById(gfxType, resourceId);
		return null;
	}

	return bmp;
}

function loadBitmapById(gfxType: GfxType, resourceId: number) {
	const img = new Image();
	img.src = `/gfx${padWithZeros(gfxType, 3)}/${resourceId + 100}.png`;
	img.onload = () => {
		if (!GFX[gfxType]) {
			GFX[gfxType] = [];
		}

		GFX[gfxType][resourceId] = img;
	};
}
