import { StatId } from 'eolib';
import mitt from 'mitt';
import type { Client } from '../../client';
import { playSfxById, SfxId } from '../../sfx';
import { calculateTnl } from '../../utils/calculate-tnl';
import { capitalize } from '../../utils/capitalize';
import { Base } from '../base-ui';

import './stats.css';

type Events = {
  confirmTraining: undefined;
};

class StatItem {
  private container: HTMLSpanElement;

  setValue(value: string) {
    this.container.textContent = value;
  }

  getValue(): string {
    return this.container.textContent || '';
  }

  constructor(id: string) {
    this.container = document.querySelector(`#stats span[data-id="${id}"]`);
  }
}

class StatUpgradeButton {
  private container: HTMLButtonElement;

  constructor(target: string, callback: () => void) {
    this.container = document.querySelector(
      `#stats button[data-target="${target}"]`,
    );
    this.container.addEventListener('click', () => {
      callback();
    });
  }

  show() {
    this.container.classList.remove('hidden');
  }

  hide() {
    this.container.classList.add('hidden');
  }
}

export class Stats extends Base {
  protected container: HTMLDivElement = document.querySelector('#stats');
  private dialogs = document.getElementById('dialogs');
  private client: Client;
  private statItems: { [key: string]: StatItem };
  private statButtons: { [key: string]: StatUpgradeButton };
  private open = false;
  private confirmedTraining = false;
  private emitter = mitt<Events>();

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

    this.statButtons = {
      str: new StatUpgradeButton('str', () => {
        this.upgradeStat(StatId.Str);
      }),
      int: new StatUpgradeButton('int', () => {
        this.upgradeStat(StatId.Int);
      }),
      wis: new StatUpgradeButton('wis', () => {
        this.upgradeStat(StatId.Wis);
      }),
      agi: new StatUpgradeButton('agi', () => {
        this.upgradeStat(StatId.Agi);
      }),
      con: new StatUpgradeButton('con', () => {
        this.upgradeStat(StatId.Con);
      }),
      cha: new StatUpgradeButton('cha', () => {
        this.upgradeStat(StatId.Cha);
      }),
    };

    const btnBack = this.container.querySelector<HTMLButtonElement>(
      'button[data-id="cancel"]',
    );
    if (btnBack) {
      btnBack.addEventListener('click', () => {
        playSfxById(SfxId.ButtonClick);
        this.hide();
      });
    }
  }

  private upgradeStat(statId: StatId) {
    if (!this.confirmedTraining) {
      this.emitter.emit('confirmTraining');
      return;
    }

    this.client.trainStat(statId);
  }

  on<Event extends keyof Events>(
    event: Event,
    handler: (data: Events[Event]) => void,
  ) {
    this.emitter.on(event, handler);
  }

  setTrainingConfirmed() {
    this.confirmedTraining = true;
  }

  render() {
    if (!this.open) return;

    if (this.statItems.level.getValue() !== this.client.level.toString()) {
      this.confirmedTraining = false;
    }

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

    if (this.client.statPoints > 0) {
      for (const button of Object.values(this.statButtons)) {
        button.show();
      }
    } else {
      for (const button of Object.values(this.statButtons)) {
        button.hide();
      }
    }
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
    this.dialogs.classList.remove('hidden');
  }

  hide() {
    this.open = false;
    this.container.classList.add('hidden');

    if (!document.querySelector('#dialogs > div:not(.hidden)')) {
      this.dialogs.classList.add('hidden');
      this.client.typing = false;
    }
  }

  toggle() {
    if (this.container.classList.contains('hidden')) {
      this.show();
    } else {
      this.hide();
    }
  }
}
