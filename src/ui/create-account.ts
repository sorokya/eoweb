import { ImGui } from '@zhobo63/imgui-ts';
import type { ImScalar } from '@zhobo63/imgui-ts/src/bind-imgui';
import mitt, { type Emitter } from 'mitt';
import { MAX_PASSWORD_LENGTH, MAX_USERNAME_LENGTH } from '../consts';

type CreateAccountModalEvents = {
  createAccount: {
    username: string;
    password: string;
    confirmPassword: string;
    name: string;
    location: string;
    email: string;
  };
};

export class CreateAccountModal {
  private emitter: Emitter<CreateAccountModalEvents>;
  private username: ImGui.ImStringBuffer = new ImGui.ImStringBuffer(
    MAX_USERNAME_LENGTH,
    '',
  );

  private password: ImGui.ImStringBuffer = new ImGui.ImStringBuffer(
    MAX_PASSWORD_LENGTH,
    '',
  );

  private confirmPassword: ImGui.ImStringBuffer = new ImGui.ImStringBuffer(
    MAX_PASSWORD_LENGTH,
    '',
  );

  private name: ImGui.ImStringBuffer = new ImGui.ImStringBuffer(255, '');

  private location: ImGui.ImStringBuffer = new ImGui.ImStringBuffer(255, '');

  private email: ImGui.ImStringBuffer = new ImGui.ImStringBuffer(255, '');

  private isOpen: ImScalar<boolean> = [false];

  constructor() {
    this.emitter = mitt<CreateAccountModalEvents>();
  }

  on<Event extends keyof CreateAccountModalEvents>(
    event: Event,
    handler: (data: CreateAccountModalEvents[Event]) => void,
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
    const windowSize = new ImGui.Vec2(400, 200); // desired size of the window
    const center = new ImGui.Vec2(
      io.DisplaySize.x / 2 - windowSize.x / 2,
      io.DisplaySize.y / 2 - windowSize.y / 2,
    );

    ImGui.SetNextWindowSize(windowSize, ImGui.Cond.Once);
    ImGui.SetNextWindowPos(center, ImGui.Cond.Once); // or Cond.Always for hard placement

    ImGui.Begin('Create Account', this.isOpen, ImGui.WindowFlags.NoResize);
    ImGui.InputText('Account name', this.username);
    ImGui.InputText(
      'Password',
      this.password,
      MAX_PASSWORD_LENGTH,
      ImGui.InputTextFlags.Password,
    );

    ImGui.InputText(
      'Confirm password',
      this.confirmPassword,
      MAX_PASSWORD_LENGTH,
      ImGui.InputTextFlags.Password,
    );

    ImGui.InputText('Real name', this.name);
    ImGui.InputText('Location', this.location);
    ImGui.InputText('Email', this.email);

    if (ImGui.Button('Create')) {
      this.emitter.emit('createAccount', {
        username: this.username.buffer,
        password: this.password.buffer,
        confirmPassword: this.confirmPassword.buffer,
        name: this.name.buffer,
        email: this.email.buffer,
        location: this.location.buffer,
      });
    }

    ImGui.SameLine();

    if (ImGui.Button('Cancel')) {
      this.isOpen[0] = false;
    }

    ImGui.End();
  }
}
