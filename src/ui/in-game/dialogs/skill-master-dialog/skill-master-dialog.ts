import type { SkillLearn } from 'eolib';
import mitt from 'mitt';
import type { Client } from '../../../../client';
import { DialogResourceID, EOResourceID } from '../../../../edf';
import { playSfxById, SfxId } from '../../../../sfx';
import { Base } from '../../../base-ui';
import { DialogIcon } from '../../../dialog-icon';
import {
  createIconMenuItem,
  createSkillMenuItem,
  createTextMenuItem,
} from '../../../utils/create-menu-item';

import './skill-master-dialog.css';

enum State {
  Initial = 0,
  Learn = 1,
  Forget = 2,
  ForgetAll = 3,
  Requirements = 4,
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
  private state = [State.Initial];
  private skillId = 0;
  private open = false;

  constructor(client: Client) {
    super();
    this.client = client;

    this.btnCancel.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      this.hide();
    });

    this.btnBack.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      this.state.pop();
      this.render();
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

    this.scrollHandle.addEventListener('pointerdown', () => {
      const onPointerMove = (e: PointerEvent) => {
        const rect = this.itemList.getBoundingClientRect();
        const min = 30;
        const max = 212;
        const clampedY = Math.min(
          Math.max(e.clientY, rect.top + min),
          rect.top + max,
        );
        const scrollPercent = (clampedY - rect.top - min) / (max - min);
        const scrollHeight = this.itemList.scrollHeight;
        const clientHeight = this.itemList.clientHeight;
        this.itemList.scrollTop = scrollPercent * (scrollHeight - clientHeight);
      };

      const onPointerUp = () => {
        document.removeEventListener('pointermove', onPointerMove);
        document.removeEventListener('pointerup', onPointerUp);
      };

      document.addEventListener('pointermove', onPointerMove);
      document.addEventListener('pointerup', onPointerUp);
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
    this.reset();
  }

  private reset() {
    this.skillId = 0;
    this.state = [State.Initial];
    this.render();
  }

  refresh() {
    if (this.open) {
      this.render();
    }
  }

  show() {
    this.cover.classList.remove('hidden');
    this.container.classList.remove('hidden');
    this.dialogs.classList.remove('hidden');
    this.client.typing = true;
    this.setScrollThumbPosition();
    this.open = true;
  }

  hide() {
    this.cover.classList.add('hidden');
    this.container.classList.add('hidden');

    if (!document.querySelector('#dialogs > div:not(.hidden)')) {
      this.dialogs.classList.add('hidden');
      this.client.typing = false;
    }
    this.open = false;
  }

  private render() {
    this.txtName.innerText = this.name;
    this.btnBack.classList.add('hidden');

    switch (this.state[this.state.length - 1]) {
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
      case State.Requirements:
        this.renderRequirements();
        return;
    }
  }

  private changeState(state: State) {
    this.state.push(state);
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

    if (forgetCount) {
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
    }

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
    let skillCount = 0;
    for (const skill of this.skills) {
      if (this.client.spells.some((s) => s.id === skill.id)) {
        continue;
      }

      skillCount++;

      const record = this.client.getEsfRecordById(skill.id);
      const learn = this.skills.find((s) => s.id === skill.id);
      if (!record || !learn) {
        continue;
      }

      const item = createSkillMenuItem(
        record,
        record.name,
        this.client.getResourceString(
          EOResourceID.SKILLMASTER_WORD_REQUIREMENTS,
        ),
        () => {
          this.skillId = skill.id;
          this.changeState(State.Requirements);
        },
      );
      const click = () => {
        if (
          learn.classRequirement &&
          this.client.classId !== learn.classRequirement
        ) {
          const strings = this.client.getDialogStrings(
            DialogResourceID.SKILL_LEARN_WRONG_CLASS,
          );
          this.client.showError(
            `${strings[1]} ${this.getClassName(learn.classRequirement)}`,
            strings[0],
          );
          return;
        }

        let skillRequirementsMet = true;
        for (const req of learn.skillRequirements) {
          if (req && this.client.spells.every((s) => s.id !== req)) {
            skillRequirementsMet = false;
            break;
          }
        }

        const gold = this.client.items.find((i) => i.id === 1);

        const requirementsMet =
          skillRequirementsMet &&
          this.client.level >= learn.levelRequirement &&
          gold &&
          gold.amount >= learn.cost &&
          this.client.baseStats.str >= learn.statRequirements.str &&
          this.client.baseStats.intl >= learn.statRequirements.intl &&
          this.client.baseStats.wis >= learn.statRequirements.wis &&
          this.client.baseStats.agi >= learn.statRequirements.agi &&
          this.client.baseStats.con >= learn.statRequirements.con &&
          this.client.baseStats.cha >= learn.statRequirements.cha;

        if (!requirementsMet) {
          const strings = this.client.getDialogStrings(
            DialogResourceID.SKILL_LEARN_REQS_NOT_MET,
          );
          this.client.showError(strings[1], strings[0]);
          return;
        }

        const strings = this.client.getDialogStrings(
          DialogResourceID.SKILL_LEARN_CONFIRMATION,
        );
        this.client.showConfirmation(
          `${strings[1]} ${record.name}`,
          strings[0],
          () => {
            this.client.learnSkill(skill.id);
          },
        );
      };

      item.addEventListener('click', click);
      item.addEventListener('contextmenu', click);
      this.itemList.appendChild(item);
    }

    if (!skillCount) {
      this.reset();
      return;
    }

    this.btnBack.classList.remove('hidden');
  }

  renderForget() {
    this.itemList.innerHTML = '';

    if (!this.client.spells.length) {
      this.reset();
      return;
    }

    for (const skill of this.client.spells) {
      const record = this.client.getEsfRecordById(skill.id);
      if (!record) {
        continue;
      }

      const item = createSkillMenuItem(record, record.name, '');

      const click = () => {
        const strings = this.client.getDialogStrings(
          DialogResourceID.SKILL_PROMPT_TO_FORGET,
        );
        this.client.showConfirmation(strings[1], strings[0], () => {
          this.client.forgetSkill(skill.id);
        });
      };

      item.addEventListener('click', click);
      item.addEventListener('contextmenu', click);
      this.itemList.appendChild(item);
    }

    this.btnBack.classList.remove('hidden');
  }

  renderForgetAll() {
    this.itemList.innerHTML = '';

    this.itemList.appendChild(
      createTextMenuItem(
        this.client.getResourceString(EOResourceID.SKILLMASTER_FORGET_ALL),
      ),
    );

    this.itemList.appendChild(createTextMenuItem());
    this.itemList.append(
      createTextMenuItem(
        this.client.getResourceString(
          EOResourceID.SKILLMASTER_FORGET_ALL_MSG_1,
        ),
      ),
    );
    this.itemList.appendChild(createTextMenuItem());
    this.itemList.append(
      createTextMenuItem(
        this.client.getResourceString(
          EOResourceID.SKILLMASTER_FORGET_ALL_MSG_2,
        ),
      ),
    );
    this.itemList.appendChild(createTextMenuItem());
    this.itemList.append(
      createTextMenuItem(
        this.client.getResourceString(
          EOResourceID.SKILLMASTER_FORGET_ALL_MSG_3,
        ),
      ),
    );
    this.itemList.appendChild(createTextMenuItem());

    this.itemList.appendChild(
      createTextMenuItem(
        this.client.getResourceString(
          EOResourceID.SKILLMASTER_CLICK_HERE_TO_FORGET_ALL,
        ),
        () => {
          const lines = this.client.getDialogStrings(
            DialogResourceID.SKILL_RESET_CHARACTER_CONFIRMATION,
          );
          this.client.showConfirmation(lines[1], lines[0], () => {
            this.client.resetCharacter();
          });
        },
      ),
    );

    this.btnBack.classList.remove('hidden');
  }

  renderRequirements() {
    this.itemList.innerHTML = '';

    if (!this.skillId) {
      this.reset();
      return;
    }

    const learn = this.skills.find((s) => s.id === this.skillId);
    if (!learn) {
      this.reset();
      return;
    }

    const record = this.client.getEsfRecordById(this.skillId);
    const goldRecord = this.client.getEifRecordById(1);
    if (!record || !goldRecord) {
      this.reset();
      return;
    }

    const classRequirement = learn.classRequirement
      ? `[${this.getClassName(learn.classRequirement)}]`
      : '';
    this.itemList.appendChild(
      createTextMenuItem(`${record.name} ${classRequirement}`),
    );

    this.itemList.appendChild(createTextMenuItem());

    const skillRequirements = learn.skillRequirements.filter((id) => !!id);
    if (skillRequirements.length) {
      const wordSkill = this.client.getResourceString(
        EOResourceID.SKILLMASTER_WORD_SKILL,
      );
      for (const req of skillRequirements) {
        const reqRecord = this.client.getEsfRecordById(req);
        if (!reqRecord) {
          continue;
        }

        this.itemList.appendChild(
          createTextMenuItem(`${wordSkill}: ${reqRecord.name}`),
        );
      }

      this.itemList.appendChild(createTextMenuItem());
    }

    if (learn.statRequirements.str) {
      this.itemList.appendChild(
        createTextMenuItem(
          `${learn.statRequirements.str} ${this.client.getResourceString(EOResourceID.SKILLMASTER_WORD_STRENGTH)}`,
        ),
      );
    }

    if (learn.statRequirements.intl) {
      this.itemList.appendChild(
        createTextMenuItem(
          `${learn.statRequirements.intl} ${this.client.getResourceString(EOResourceID.SKILLMASTER_WORD_INTELLIGENCE)}`,
        ),
      );
    }

    if (learn.statRequirements.wis) {
      this.itemList.appendChild(
        createTextMenuItem(
          `${learn.statRequirements.wis} ${this.client.getResourceString(EOResourceID.SKILLMASTER_WORD_WISDOM)}`,
        ),
      );
    }

    if (learn.statRequirements.agi) {
      this.itemList.appendChild(
        createTextMenuItem(
          `${learn.statRequirements.agi} ${this.client.getResourceString(EOResourceID.SKILLMASTER_WORD_AGILITY)}`,
        ),
      );
    }

    if (learn.statRequirements.con) {
      this.itemList.appendChild(
        createTextMenuItem(
          `${learn.statRequirements.con} ${this.client.getResourceString(EOResourceID.SKILLMASTER_WORD_CONSTITUTION)}`,
        ),
      );
    }

    if (learn.statRequirements.cha) {
      this.itemList.appendChild(
        createTextMenuItem(
          `${learn.statRequirements.cha} ${this.client.getResourceString(EOResourceID.SKILLMASTER_WORD_CHARISMA)}`,
        ),
      );
    }

    this.itemList.appendChild(createTextMenuItem());

    this.itemList.appendChild(
      createTextMenuItem(
        `${learn.levelRequirement} ${this.client.getResourceString(EOResourceID.SKILLMASTER_WORD_LEVEL)}`,
      ),
    );

    this.itemList.appendChild(
      createTextMenuItem(`${learn.cost} ${goldRecord.name}`),
    );

    this.btnBack.classList.remove('hidden');
  }

  private getClassName(classId: number): string {
    const classRecord = this.client.getEcfRecordById(classId);
    return classRecord ? classRecord.name : '';
  }
}
