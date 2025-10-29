import type { SkillLearn } from 'eolib';
import mitt from 'mitt';
import type { Client } from '../client';
import { DialogResourceID, EOResourceID } from '../edf';
import { playSfxById, SfxId } from '../sfx';
import { Base } from './base-ui';
import { DialogIcon } from './dialog-icon';
import {
  createIconMenuItem,
  createSkillMenuItem,
} from './utils/create-menu-item';

enum State {
  Initial = 0,
  Learn = 1,
  Forget = 2,
  ForgetAll = 3,
}

type Events = {
  learnSkill: number;
  forgetSkill: number;
  forgetAllSkills: undefined;
};

export class SkillMasterDialog extends Base {
  private client: Client;
  private emitter = mitt<Events>();
  protected container = document.getElementById('skill-master');
  private dialogs = document.getElementById('dialogs');
  private cover = document.querySelector<HTMLDivElement>('#cover');
  private btnCancel = this.container.querySelector<HTMLButtonElement>(
    'button[data-id="cancel"]',
  );
  private btnBack = this.container.querySelector<HTMLButtonElement>(
    'button[data-id="back"]',
  );
  private txtName = this.container.querySelector<HTMLSpanElement>('.name');
  private itemList = this.container.querySelector<HTMLDivElement>('.item-list');
  private scrollHandle =
    this.container.querySelector<HTMLDivElement>('.scroll-handle');
  private name = '';
  private skills: SkillLearn[] = [];
  private state = State.Initial;

  constructor(client: Client) {
    super();
    this.client = client;

    this.btnCancel.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      this.hide();
    });

    this.btnBack.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      this.changeState(State.Initial);
    });

    this.itemList.addEventListener('scroll', () => {
      this.setScrollThumbPosition();
    });

    this.client.on('itemBought', () => {
      this.render();
    });

    this.client.on('itemSold', () => {
      this.render();
    });
  }

  on<Event extends keyof Events>(
    event: Event,
    handler: (data: Events[Event]) => void,
  ) {
    this.emitter.on(event, handler);
  }

  setScrollThumbPosition() {
    const min = 60;
    const max = 212;
    const scrollTop = this.itemList.scrollTop;
    const scrollHeight = this.itemList.scrollHeight;
    const clientHeight = this.itemList.clientHeight;
    const scrollPercent = scrollTop / (scrollHeight - clientHeight);
    const clampedPercent = Math.min(Math.max(scrollPercent, 0), 1);
    const top = min + (max - min) * clampedPercent || min;
    this.scrollHandle.style.top = `${top}px`;
  }

  setData(name: string, skills: SkillLearn[]) {
    this.name = name;
    this.skills = skills;
    this.state = State.Initial;
    this.render();
  }

  show() {
    this.cover.classList.remove('hidden');
    this.container.classList.remove('hidden');
    this.dialogs.classList.remove('hidden');
    this.client.typing = true;
    this.setScrollThumbPosition();
  }

  hide() {
    this.cover.classList.add('hidden');
    this.container.classList.add('hidden');

    if (!document.querySelector('#dialogs > div:not(.hidden)')) {
      this.dialogs.classList.add('hidden');
      this.client.typing = false;
    }
  }

  private render() {
    this.txtName.innerText = this.name;
    this.btnBack.classList.add('hidden');

    switch (this.state) {
      case State.Initial:
        this.renderInitial();
        return;
      case State.Learn:
        this.renderLearn();
        return;
      case State.Forget:
        this.renderForget();
        return;
      case State.ForgetAll:
        this.renderForgetAll();
        return;
    }
  }

  private changeState(state: State) {
    this.state = state;
    this.render();
  }

  private renderInitial() {
    this.itemList.innerHTML = '';

    const learnCount = this.skills.filter((s) =>
      this.client.spells.every((p) => p.id !== s.id),
    ).length;
    const forgetCount = this.client.spells.length;

    const learnItem = createIconMenuItem(
      DialogIcon.Learn,
      this.client.getResourceString(EOResourceID.SKILLMASTER_WORD_LEARN),
      `${learnCount}${this.client.getResourceString(EOResourceID.SKILLMASTER_ITEMS_TO_LEARN)}`,
    );
    const clickLearn = () => {
      if (!learnCount) {
        const strings = this.client.getDialogStrings(
          DialogResourceID.SKILL_NOTHING_MORE_TO_LEARN,
        );
        this.client.showError(strings[1], strings[0]);
        return;
      }
      this.changeState(State.Learn);
    };
    learnItem.addEventListener('click', clickLearn);
    learnItem.addEventListener('contextmenu', clickLearn);
    this.itemList.appendChild(learnItem);

    const forgetItem = createIconMenuItem(
      DialogIcon.Forget,
      this.client.getResourceString(EOResourceID.SKILLMASTER_WORD_FORGET),
      `${forgetCount}${this.client.getResourceString(EOResourceID.SKILLMASTER_ITEMS_LEARNED)}`,
    );
    const clickForget = () => {
      if (!forgetCount) {
        return;
      }
      this.changeState(State.Forget);
    };
    forgetItem.addEventListener('click', clickForget);
    forgetItem.addEventListener('contextmenu', clickForget);
    this.itemList.appendChild(forgetItem);

    const forgetAllItem = createIconMenuItem(
      DialogIcon.Forget,
      this.client.getResourceString(EOResourceID.SKILLMASTER_FORGET_ALL),
      this.client.getResourceString(
        EOResourceID.SKILLMASTER_RESET_YOUR_CHARACTER,
      ),
    );
    const clickForgetAll = () => {
      this.changeState(State.ForgetAll);
    };
    forgetAllItem.addEventListener('click', clickForgetAll);
    forgetAllItem.addEventListener('contextmenu', clickForgetAll);
    this.itemList.appendChild(forgetAllItem);
  }

  renderLearn() {
    this.itemList.innerHTML = '';
    for (const skill of this.skills) {
      const record = this.client.getEsfRecordById(skill.id);
      if (!record) {
        continue;
      }

      const item = createSkillMenuItem(
        record,
        record.name,
        this.client.getResourceString(
          EOResourceID.SKILLMASTER_WORD_REQUIREMENTS,
        ),
      );
      const click = () => {};
      item.addEventListener('click', click);
      item.addEventListener('contextmenu', click);
      this.itemList.appendChild(item);
    }
    this.btnBack.classList.remove('hidden');
  }

  renderForget() {
    this.itemList.innerHTML = '';
    this.btnBack.classList.remove('hidden');
  }

  renderForgetAll() {
    this.itemList.innerHTML = '';
    this.btnBack.classList.remove('hidden');
  }
}
