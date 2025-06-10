import { ImGui } from '@zhobo63/imgui-ts';
import type { ImScalar } from '@zhobo63/imgui-ts/src/bind-imgui';
import mitt, { type Emitter } from 'mitt';
import { MAX_PASSWORD_LENGTH, MAX_USERNAME_LENGTH } from '../consts';

type LoginModalEvents = {
  login: { username: string; password: string };
};

export class LoginModal {
  private emitter: Emitter<LoginModalEvents>;
  private username: ImGui.ImStringBuffer = new ImGui.ImStringBuffer(
    MAX_USERNAME_LENGTH,
    '',
  );
  private password: ImGui.ImStringBuffer = new ImGui.ImStringBuffer(
    MAX_PASSWORD_LENGTH,
    '',
  );
  private isOpen: ImScalar<boolean> = [false];

  constructor() {
    this.emitter = mitt<LoginModalEvents>();
  }

  on<Event extends keyof LoginModalEvents>(
    event: Event,
    handler: (data: LoginModalEvents[Event]) => void,
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
    const windowSize = new ImGui.Vec2(300, 100); // desired size of the window
    const center = new ImGui.Vec2(
      io.DisplaySize.x / 2 - windowSize.x / 2,
      io.DisplaySize.y / 2 - windowSize.y / 2,
    );

    ImGui.SetNextWindowSize(windowSize, ImGui.Cond.Once);
    ImGui.SetNextWindowPos(center, ImGui.Cond.Once); // or Cond.Always for hard placement

    ImGui.Begin('Login', this.isOpen, ImGui.WindowFlags.NoResize);
    ImGui.InputText('Username', this.username);
    ImGui.InputText(
      'Password',
      this.password,
      MAX_PASSWORD_LENGTH,
      ImGui.InputTextFlags.Password,
    );

    if (ImGui.Button('Login')) {
      this.emitter.emit('login', {
        username: this.username.buffer,
        password: this.password.buffer,
      });
    }

    ImGui.SameLine();

    if (ImGui.Button('Cancel')) {
      this.isOpen[0] = false;
    }

    ImGui.End();
  }
}
