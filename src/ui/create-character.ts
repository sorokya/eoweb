import { ImGui } from '@zhobo63/imgui-ts';
import type { ImScalar } from '@zhobo63/imgui-ts/src/bind-imgui';
import mitt, { type Emitter } from 'mitt';
import { MAX_CHARACTER_NAME_LENGTH } from '../consts';
import { Gender } from 'eolib';

type CreateCharacterModalEvents = {
  createCharacter: {
    name: string;
    gender: Gender;
    hairStyle: number;
    hairColor: number;
    skin: number;
  };
};

export class CreateCharacterModal {
  private emitter: Emitter<CreateCharacterModalEvents>;
  private name: ImGui.ImStringBuffer = new ImGui.ImStringBuffer(
    MAX_CHARACTER_NAME_LENGTH,
    '',
  );
  private gender: Gender = Gender.Female;

  private isOpen: ImScalar<boolean> = [false];
  private hairStyleBuf: ImScalar<number> = [1];
  private hairColorBuf: ImScalar<number> = [1];
  private skinBuf: ImScalar<number> = [1];

  constructor() {
    this.emitter = mitt<CreateCharacterModalEvents>();
  }

  on<Event extends keyof CreateCharacterModalEvents>(
    event: Event,
    handler: (data: CreateCharacterModalEvents[Event]) => void,
  ) {
    this.emitter.on(event, handler);
  }

  open() {
    this.name.buffer = '';
    this.gender = Gender.Female;
    this.hairColorBuf[0] = 1;
    this.hairStyleBuf[0] = 1;
    this.skinBuf[0] = 1;
    this.isOpen[0] = true;
  }

  close() {
    this.isOpen[0] = false;
  }

  render() {
    if (!this.isOpen[0]) {
      return;
    }

    const io = ImGui.GetIO();
    const windowSize = new ImGui.Vec2(400, 200); // desired size of the window
    const center = new ImGui.Vec2(
      io.DisplaySize.x / 2 - windowSize.x / 2,
      io.DisplaySize.y / 2 - windowSize.y / 2,
    );

    ImGui.SetNextWindowSize(windowSize, ImGui.Cond.Once);
    ImGui.SetNextWindowPos(center, ImGui.Cond.Once); // or Cond.Always for hard placement

    ImGui.Begin('Create Character', this.isOpen, ImGui.WindowFlags.NoResize);
    ImGui.InputText('Name', this.name);

    if (ImGui.RadioButton('Female', this.gender === Gender.Female)) {
      this.gender = Gender.Female;
    }
    ImGui.SameLine();
    if (ImGui.RadioButton('Male', this.gender === Gender.Male)) {
      this.gender = Gender.Male;
    }

    ImGui.SliderInt('Hair style', this.hairStyleBuf, 1, 20);
    ImGui.SliderInt('Hair color', this.hairColorBuf, 1, 10);
    ImGui.SliderInt('Skin', this.skinBuf, 1, 4);

    if (ImGui.Button('Create')) {
      this.emitter.emit('createCharacter', {
        name: this.name.buffer,
        gender: this.gender,
        hairStyle: this.hairStyleBuf[0],
        hairColor: this.hairColorBuf[0],
        skin: this.skinBuf[0] - 1,
      });
    }

    ImGui.SameLine();

    if (ImGui.Button('Cancel')) {
      this.isOpen[0] = false;
    }

    ImGui.End();
  }
}
