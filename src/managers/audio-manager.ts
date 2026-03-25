import { MapTileSpec } from 'eolib';
import type { Client } from '../client';
import { getDistance, getVolumeFromDistance, padWithZeros } from '../utils';
import type { Vector2 } from '../vector';

export function setAmbientVolume(client: Client): void {
  if (!client.map || !client.ambientSound) {
    return;
  }

  const playerAt = client.getPlayerCoords();
  const sources: { coords: Vector2; distance: number }[] = [];
  for (const row of client.map!.tileSpecRows) {
    for (const tile of row.tiles) {
      if (tile.tileSpec === MapTileSpec.AmbientSource) {
        const coords = { x: tile.x, y: row.y };
        const distance = getDistance(playerAt, coords);
        sources.push({ coords, distance });
      }
    }
  }

  sources.sort((a, b) => a.distance - b.distance);
  if (sources.length) {
    const distance = sources[0].distance;
    const volume = getVolumeFromDistance(distance);
    client.ambientVolume!.gain.value = volume;
  }
}

export function stopAmbientSound(client: Client): void {
  if (client.ambientSound && client.ambientVolume) {
    client.ambientSound.disconnect();
    client.ambientSound = null;
    client.ambientVolume.disconnect();
    client.ambientVolume = null;
  }
}

export function startAmbientSound(client: Client): void {
  if (!client.map!.ambientSoundId) {
    return;
  }

  const context = new AudioContext();
  fetch(`/sfx/sfx${padWithZeros(client.map!.ambientSoundId, 3)}.wav`)
    .then((response) => response.arrayBuffer())
    .then((data) => context.decodeAudioData(data))
    .then((buffer) => {
      client.ambientSound = context.createBufferSource();
      client.ambientVolume = context.createGain();
      client.ambientSound.connect(client.ambientVolume);
      client.ambientSound.buffer = buffer;
      client.ambientSound.loop = true;
      client.ambientVolume.connect(context.destination);
      setAmbientVolume(client);
      client.ambientSound.start(0);
    });
}
