import { ImGui } from '@zhobo63/imgui-ts';
import type { ImScalar } from '@zhobo63/imgui-ts/src/bind-imgui';
export class ErrorModal {
  private title = '';
  private error = '';
  private isOpen: ImScalar<boolean> = [false];

  open(error: string, title: string) {
    if (this.isOpen[0]) {
      return;
    }

    this.title = title || 'Error';
    this.error = error;
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

    ImGui.Begin(this.title, this.isOpen);
    ImGui.TextWrapped(this.error);

    ImGui.NewLine();

    if (ImGui.Button('OK')) {
      this.isOpen[0] = false;
    }

    ImGui.End();
  }
}
