import type { Client } from '../client';
import { Base } from './base-ui';

export class HUD extends Base {
  private client: Client;
  private healthText: HTMLElement;
  private heartFill: HTMLElement;
  private heartBar: HTMLElement;
  private statsDropdown: HTMLElement;
  private lastHP = -1;

  private readonly LOW_HEALTH_THRESHOLD = 0.25;

  private readonly SPRITE_TOTAL_WIDTH = 110;
  private readonly EXCLUDED_LEFT = 25;
  private readonly EXCLUDED_RIGHT = 5;
  private readonly REGULAR_HEARTS_COUNT = 10;

  constructor(client: Client) {
    super();
    this.client = client;

    const container = document.getElementById('hud');
    if (!container) throw new Error('HUD container not found');
    this.container = container;

    const healthText = this.container.querySelector('#health-text');
    if (!healthText) throw new Error('Health text element not found');
    this.healthText = healthText as HTMLElement;

    const heartFill = this.container.querySelector('#heart-fill');
    if (!heartFill) throw new Error('Heart fill element not found');
    this.heartFill = heartFill as HTMLElement;

    const heartBar = this.container.querySelector('#heart-bar');
    if (!heartBar) throw new Error('Heart bar element not found');
    this.heartBar = heartBar as HTMLElement;

    const statsDropdown = this.container.querySelector('#stats-dropdown');
    if (!statsDropdown) throw new Error('Stats dropdown element not found');
    this.statsDropdown = statsDropdown as HTMLElement;

    this.heartBar.addEventListener('click', () => {
      this.statsDropdown.classList.toggle('hidden');
    });

    this.client.on('selectCharacter', () => this.updateStats());
    this.startUpdateLoop();
  }

  private get usableWidth(): number {
    return this.SPRITE_TOTAL_WIDTH - this.EXCLUDED_LEFT - this.EXCLUDED_RIGHT;
  }

  private get heartWidth(): number {
    return this.usableWidth / this.REGULAR_HEARTS_COUNT;
  }

  private calculateFillWidth(hp: number, maxHp: number): number {
    if (maxHp <= 0) return this.EXCLUDED_LEFT;

    const healthPercentage = Math.min(hp / maxHp, 1.0);
    const hearts = healthPercentage * this.REGULAR_HEARTS_COUNT;
    const clamped = Math.max(Math.floor(hearts), 0);

    return Math.round(this.EXCLUDED_LEFT + clamped * this.heartWidth);
  }

  private startUpdateLoop(): void {
    const update = () => {
      if (!this.container.classList.contains('hidden')) {
        this.updateStats();
      }
      requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  // wtf was i thinking ...coding via phone doesn't work
  private updateStats(): void {
    const { hp, maxHp } = this.client;
    const fillPx = this.calculateFillWidth(hp, maxHp);

    this.heartFill.style.width = `${fillPx}px`;
    this.healthText.textContent = `${hp}/${maxHp}`;

    const healthPercentage = maxHp > 0 ? hp / maxHp : 0;
    this.heartFill.classList.toggle(
      'low-health',
      healthPercentage < this.LOW_HEALTH_THRESHOLD,
    );

    const statHp = this.statsDropdown.querySelector('#stat-hp') as HTMLElement;
    if (statHp) {
      statHp.textContent = `${hp}/${maxHp}`;
    }
  }
}
