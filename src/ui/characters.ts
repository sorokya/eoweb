import { ImGui } from '@zhobo63/imgui-ts';
import type { ImScalar } from '@zhobo63/imgui-ts/src/bind-imgui';
import type { CharacterSelectionListEntry } from 'eolib';
import mitt, { type Emitter } from 'mitt';

type CharactersModalEvents = {
  'select-character': number;
};

export class CharactersModal {
  private emitter: Emitter<CharactersModalEvents>;
  private isOpen: ImScalar<boolean> = [false];
  private characters: CharacterSelectionListEntry[] = [];

  constructor() {
    this.emitter = mitt<CharactersModalEvents>();
  }

  setCharacters(characters: CharacterSelectionListEntry[]) {
    this.characters = characters;
  }

  on<Event extends keyof CharactersModalEvents>(
    event: Event,
    handler: (data: CharactersModalEvents[Event]) => void,
  ) {
    this.emitter.on(event, handler);
  }

  open() {
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
    const windowSize = new ImGui.Vec2(300, 200); // desired size of the window
    const center = new ImGui.Vec2(
      io.DisplaySize.x / 2 - windowSize.x / 2,
      io.DisplaySize.y / 2 - windowSize.y / 2,
    );

    ImGui.SetNextWindowSize(windowSize, ImGui.Cond.Once);
    ImGui.SetNextWindowPos(center, ImGui.Cond.Once); // or Cond.Always for hard placement

    ImGui.Begin('Character selection', this.isOpen, ImGui.WindowFlags.NoResize);

    ImGui.Text('Select your character:');

    for (const char of this.characters) {
      ImGui.Separator();
      ImGui.Text(`${char.name} (Level ${char.level})`);
      ImGui.SameLine();

      const buttonId = `Login##${char.id}`;
      if (ImGui.Button(buttonId)) {
        this.emitter.emit('select-character', char.id);
      }

      ImGui.SameLine();
      const deleteButtonId = `Delete##${char.id}`;
      if (ImGui.Button(deleteButtonId)) {
        console.log(`Deleting ${char.name}`);
        // Trigger delete here
      }
    }

    ImGui.Separator();
    ImGui.NewLine();

    if (ImGui.Button('Change password')) {
      console.log('Change password clicked');
      // Trigger password change flow here
    }

    ImGui.SameLine();

    if (ImGui.Button('New character')) {
      console.log('New character clicked');
      // Trigger new character creation
    }

    ImGui.End();
  }
}
