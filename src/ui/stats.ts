import type { Client } from '../client';
import { calculateTnl } from '../utils/calculate-tnl';
import { capitalize } from '../utils/capitalize';
import { Base } from './base-ui';

class StatItem {
  private container: HTMLSpanElement;

  setValue(value: string) {
    this.container.textContent = value;
  }

  constructor(id: string) {
    this.container = document.querySelector(`#stats span[data-id="${id}"]`);
  }
}

export class Stats extends Base {
  protected container: HTMLDivElement = document.querySelector('#stats');
  private client: Client;
  private statItems: { [key: string]: StatItem };
  private open = false;

  constructor(client: Client) {
    super();
    this.client = client;
    this.statItems = {
      str: new StatItem('str'),
      int: new StatItem('int'),
      wis: new StatItem('wis'),
      agi: new StatItem('agi'),
      con: new StatItem('con'),
      cha: new StatItem('cha'),
      hp: new StatItem('hp'),
      tp: new StatItem('tp'),
      dam: new StatItem('dam'),
      acc: new StatItem('acc'),
      arm: new StatItem('arm'),
      eva: new StatItem('eva'),
      name: new StatItem('name'),
      level: new StatItem('lvl'),
      guild: new StatItem('guild'),
      weight: new StatItem('weight'),
      statPoints: new StatItem('stat-points'),
      skillPoints: new StatItem('skill-points'),
      gold: new StatItem('gold'),
      exp: new StatItem('exp'),
      tnl: new StatItem('tnl'),
      karma: new StatItem('karma'),
    };
  }

  render() {
    if (!this.open) return;

    const goldItem = this.client.items.find((i) => i.id === 1);
    const goldAmount = goldItem ? goldItem.amount : 0;

    this.statItems.str.setValue(this.client.baseStats.str.toString());
    this.statItems.int.setValue(this.client.baseStats.intl.toString());
    this.statItems.wis.setValue(this.client.baseStats.wis.toString());
    this.statItems.agi.setValue(this.client.baseStats.agi.toString());
    this.statItems.con.setValue(this.client.baseStats.con.toString());
    this.statItems.cha.setValue(this.client.baseStats.cha.toString());
    this.statItems.hp.setValue(this.client.hp.toString());
    this.statItems.tp.setValue(this.client.tp.toString());
    this.statItems.dam.setValue(
      `${this.client.secondaryStats.minDamage} - ${this.client.secondaryStats.maxDamage}`,
    );
    this.statItems.acc.setValue(this.client.secondaryStats.accuracy.toString());
    this.statItems.arm.setValue(this.client.secondaryStats.armor.toString());
    this.statItems.eva.setValue(this.client.secondaryStats.evade.toString());
    this.statItems.name.setValue(capitalize(this.client.name));
    this.statItems.level.setValue(this.client.level.toString());
    this.statItems.guild.setValue(this.client.guildName || '');
    this.statItems.weight.setValue(
      `${this.client.weight.current} / ${this.client.weight.max}`,
    );
    this.statItems.statPoints.setValue(this.client.statPoints.toString());
    this.statItems.skillPoints.setValue(this.client.skillPoints.toString());
    this.statItems.gold.setValue(goldAmount.toString());
    this.statItems.exp.setValue(this.client.experience.toString());
    this.statItems.tnl.setValue(
      calculateTnl(this.client.experience).toString(),
    );
    this.statItems.karma.setValue(this.getKarmaString(this.client.karma));
  }

  private getKarmaString(value: number): string {
    if (value >= 0) {
      if (value <= 100) return 'Demonic';
      if (value <= 500) return 'Doomed';
      if (value <= 750) return 'Cursed';
      if (value <= 900) return 'Evil';
      if (value <= 1099) return 'Neutral';
      if (value <= 1249) return 'Good';
      if (value <= 1499) return 'Blessed';
      if (value <= 1899) return 'Saint';
      if (value <= 2000) return 'Pure';
    }

    return '';
  }

  show() {
    this.open = true;
    this.render();
    this.container.classList.remove('hidden');
    this.container.style.top = `${Math.floor(window.innerHeight / 2 - this.container.clientHeight / 2)}px`;
    this.container.style.left = `${Math.floor(window.innerWidth / 2 - this.container.clientWidth / 2)}px`;
  }

  hide() {
    this.open = false;
    this.container.classList.add('hidden');
  }

  toggle() {
    if (this.container.classList.contains('hidden')) {
      this.show();
    } else {
      this.hide();
    }
  }
}
