import { Direction } from 'eolib';
import { CharacterFrame } from '@/atlas';
import type { Client } from '@/client';
import { CHARACTER_HEIGHT, CHARACTER_WIDTH } from '@/consts';

export const CHARACTER_PREVIEW_W = CHARACTER_WIDTH + 40;
export const CHARACTER_PREVIEW_H = CHARACTER_HEIGHT + 40;

export function drawCharacterPreview(
  client: Client,
  playerId: number,
  direction: Direction = Direction.Down,
): string | undefined {
  const canvas = document.createElement('canvas');
  canvas.width = CHARACTER_PREVIEW_W;
  canvas.height = CHARACTER_PREVIEW_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return undefined;
  }

  const mirrored = direction === Direction.Right || direction === Direction.Up;
  const downRight =
    direction === Direction.Down || direction === Direction.Right;
  const frame = client.atlas.getCharacterFrame(
    playerId,
    downRight
      ? CharacterFrame.StandingDownRight
      : CharacterFrame.StandingUpLeft,
  );
  if (!frame) {
    return undefined;
  }

  const atlas = client.atlas.getAtlas(frame.atlasIndex);
  if (!atlas) {
    return undefined;
  }

  if (mirrored) {
    ctx.save();
    ctx.scale(-1, 1);
    ctx.translate(-canvas.width, 0);
  }

  ctx.drawImage(
    atlas,
    frame.x,
    frame.y,
    frame.w,
    frame.h,
    Math.floor(
      (canvas.width >> 1) + (mirrored ? frame.mirroredXOffset : frame.xOffset),
    ),
    canvas.height + frame.yOffset - 20,
    frame.w,
    frame.h,
  );

  if (mirrored) {
    ctx.restore();
  }

  return canvas.toDataURL();
}

type CharacterPreviewProps = {
  previewUrl: string | undefined;
  alt: string;
};

export function CharacterPreview({ previewUrl, alt }: CharacterPreviewProps) {
  if (previewUrl) {
    return (
      <img
        src={previewUrl}
        alt={alt}
        style={{
          imageRendering: 'pixelated',
          maxHeight: '100%',
          width: 'auto',
        }}
      />
    );
  }

  return (
    <div
      class='skeleton rounded'
      style={{
        width: `${CHARACTER_PREVIEW_W}px`,
        height: `${CHARACTER_PREVIEW_H}px`,
      }}
    />
  );
}
