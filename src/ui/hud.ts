import type { Client } from '../client';
import { playSfxById, SfxId } from '../sfx';
import { calculateTnl, getExpForLevel } from '../utils/calculate-tnl';
import { Base } from './base-ui';

export class HUD extends Base {
  private client: Client;
  protected container = document.getElementById('hud');
  private hpText: HTMLDivElement = this.container.querySelector(
    '.stat-container[data-id="hp"] span',
  );
  private hpFill: HTMLDivElement = this.container.querySelector(
    '.stat-container[data-id="hp"] .stat-fill',
  );
  private hpBar: HTMLDivElement = this.container.querySelector(
    '.stat-container[data-id="hp"] .bar',
  );
  private hpDropdown: HTMLDivElement = this.container.querySelector(
    '.stat-container[data-id="hp"] .dropdown',
  );

  private tpText: HTMLDivElement = this.container.querySelector(
    '.stat-container[data-id="tp"] span',
  );
  private tpFill: HTMLDivElement = this.container.querySelector(
    '.stat-container[data-id="tp"] .stat-fill',
  );
  private tpBar: HTMLDivElement = this.container.querySelector(
    '.stat-container[data-id="tp"] .bar',
  );
  private tpDropdown: HTMLDivElement = this.container.querySelector(
    '.stat-container[data-id="tp"] .dropdown',
  );

  private expText: HTMLDivElement = this.container.querySelector(
    '.stat-container[data-id="exp"] span',
  );
  private expFill: HTMLDivElement = this.container.querySelector(
    '.stat-container[data-id="exp"] .stat-fill',
  );
  private expBar: HTMLDivElement = this.container.querySelector(
    '.stat-container[data-id="exp"] .bar',
  );
  private expDropdown: HTMLDivElement = this.container.querySelector(
    '.stat-container[data-id="exp"] .dropdown',
  );
  private readonly LEFT_SIDE_WIDTH = 24;
  private readonly STAT_WIDTH = 79;

  setStats(client: Client) {
    this.hpText.innerText = `${client.hp}/${client.maxHp}`;
    this.hpFill.style.width = `${this.LEFT_SIDE_WIDTH + Math.floor((client.hp / client.maxHp) * this.STAT_WIDTH)}px`;

    this.tpText.innerText = `${client.tp}/${client.maxTp}`;
    this.tpFill.style.width = `${this.LEFT_SIDE_WIDTH + Math.floor((client.tp / client.maxTp) * this.STAT_WIDTH)}px`;

    const tnl = calculateTnl(client.experience);
    const exp = getExpForLevel(client.level + 1);
    this.expText.innerText = `${tnl}`;
    this.expFill.style.width = `${this.LEFT_SIDE_WIDTH + Math.floor((client.experience / exp) * this.STAT_WIDTH)}px`;
  }

  constructor() {
    super();

    this.hpBar.addEventListener('click', () => {
      playSfxById(SfxId.HudStatusBarClick);
      this.hpDropdown.classList.toggle('hidden');
    });

    this.tpBar.addEventListener('click', () => {
      playSfxById(SfxId.HudStatusBarClick);
      this.tpDropdown.classList.toggle('hidden');
    });

    this.expBar.addEventListener('click', () => {
      playSfxById(SfxId.HudStatusBarClick);
      this.expDropdown.classList.toggle('hidden');
    });
  }
}
