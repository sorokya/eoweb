import { ImGui } from '@zhobo63/imgui-ts';
import type { ImScalar } from '@zhobo63/imgui-ts/src/bind-imgui';
import mitt, { type Emitter } from 'mitt';

type ConnectModalEvents = {
  connect: string;
  closed: undefined;
};

export class ConnectModal {
  private emitter: Emitter<ConnectModalEvents>;
  private host: ImGui.ImStringBuffer = new ImGui.ImStringBuffer(
    256,
    'wss://ws.reoserv.net',
  );
  private isOpen: ImScalar<boolean> = [false];

  constructor() {
    this.emitter = mitt<ConnectModalEvents>();
  }

  on<Event extends keyof ConnectModalEvents>(
    event: Event,
    handler: (data: ConnectModalEvents[Event]) => void,
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

    ImGui.Begin('Connect to Server', this.isOpen, ImGui.WindowFlags.NoResize);
    ImGui.InputText('Host', this.host);

    if (ImGui.Button('Connect')) {
      this.emitter.emit('connect', this.host.buffer);
    }

    ImGui.SameLine();

    if (ImGui.Button('Cancel')) {
      this.isOpen[0] = false;
    }

    ImGui.End();
  }
}
