import {
  BigCoords,
  CharacterMapInfo,
  Direction,
  Emf,
  EoReader,
  EquipmentMapInfo,
  Gender,
  SitState,
} from 'eolib';
import './css/style.css';
import { render } from 'preact';
import { Client } from '@/client';
import { applyUiScale } from '@/ui/in-game';
import { Ui } from './ui';

applyUiScale();

// ── Client & Mobile ──────────────────────────────────────────────────────

const client = new Client();

// ── Render Loop ──────────────────────────────────────────────────────────

let accumulator = 0;
const TICK = 120;
const MAX_ACCUMULATOR = TICK * 10;
window.addEventListener('DOMContentLoaded', async () => {
  await client.initPixi();

  client.app.ticker.add((ticker) => {
    accumulator = Math.min(accumulator + ticker.deltaMS, MAX_ACCUMULATOR);
    while (accumulator >= TICK) {
      client.tick();
      accumulator -= TICK;
    }
    const interpolation = accumulator / TICK;
    client.render(interpolation);
  });

  const response = await fetch('/maps/00005.emf');
  const map = await response.arrayBuffer();
  const reader = new EoReader(new Uint8Array(map));
  const emf = Emf.deserialize(reader);
  client.setMap(emf);

  client.playerId = 0;
  const character = new CharacterMapInfo();
  character.playerId = 0;
  character.coords = new BigCoords();
  character.coords.x = 35;
  character.coords.y = 38;
  character.gender = Gender.Female;
  character.sitState = SitState.Floor;
  character.skin = 0;
  character.hairStyle = 1;
  character.hairColor = 0;
  character.name = 'debug';
  character.guildTag = '   ';
  character.direction = Direction.Down;
  character.equipment = new EquipmentMapInfo();
  character.equipment.armor = 0;
  character.equipment.weapon = 0;
  character.equipment.boots = 0;
  character.equipment.shield = 0;
  character.equipment.hat = 0;
  client.nearby.characters = [character];
  client.atlas.refresh();
  render(<Ui client={client} />, document.getElementById('ui')!);
});
