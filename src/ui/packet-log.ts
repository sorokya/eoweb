import { ImGui } from '@zhobo63/imgui-ts';
import type { ImScalar } from '@zhobo63/imgui-ts/src/bind-imgui';
import { PacketAction, PacketFamily } from 'eolib';

const MAX_ENTRIES = 50;

export enum PacketSource {
  Client = 0,
  Server = 1,
}

type PacketLogEntry = {
  source: PacketSource;
  action: PacketAction;
  family: PacketFamily;
  timestamp: Date;
  data: Uint8Array;
};

export class PacketLogModal {
  private log: PacketLogEntry[] = [];
  private isOpen: ImScalar<boolean> = [false];

  open() {
    this.isOpen[0] = true;
  }

  close() {
    this.isOpen[0] = false;
  }

  addEntry(entry: PacketLogEntry) {
    this.log.push(entry);
    if (this.log.length > MAX_ENTRIES) {
      this.log.splice(0, this.log.length - MAX_ENTRIES);
    }
  }

  render() {
    if (!this.isOpen[0]) {
      return;
    }

    const io = ImGui.GetIO();
    const windowSize = new ImGui.Vec2(600, 300); // desired size of the window
    const center = new ImGui.Vec2(
      io.DisplaySize.x / 2 - windowSize.x / 2,
      io.DisplaySize.y / 2 - windowSize.y / 2,
    );

    ImGui.SetNextWindowSize(windowSize, ImGui.Cond.Once);
    ImGui.SetNextWindowPos(center, ImGui.Cond.Once); // or Cond.Always for hard placement
    ImGui.Begin('Packet Log', this.isOpen);

    if (
      ImGui.BeginTable(
        'packet_table',
        5,
        ImGui.TableFlags.Borders | ImGui.TableFlags.RowBg,
      )
    ) {
      ImGui.TableSetupColumn(' ', ImGui.TableColumnFlags.WidthFixed, 10);
      ImGui.TableSetupColumn('Family', ImGui.TableColumnFlags.WidthFixed, 100);
      ImGui.TableSetupColumn('Action', ImGui.TableColumnFlags.WidthFixed, 100);
      ImGui.TableSetupColumn('Data', ImGui.TableColumnFlags.WidthStretch);
      ImGui.TableSetupColumn('Time', ImGui.TableColumnFlags.WidthFixed, 100);
      ImGui.TableHeadersRow();

      for (const entry of this.log) {
        ImGui.TableNextRow();

        ImGui.TableSetColumnIndex(0);
        ImGui.Text(entry.source === PacketSource.Client ? '↑' : '↓');

        ImGui.TableSetColumnIndex(1);
        ImGui.Text(PacketFamily[entry.family]);

        ImGui.TableSetColumnIndex(2);
        ImGui.Text(PacketAction[entry.action]);

        ImGui.TableSetColumnIndex(3);

        ImGui.PushStyleColor(ImGui.Col.Text, ImGui.COL32(180, 180, 180, 255));
        ImGui.TextWrapped(this.toHex(entry.data));
        ImGui.PopStyleColor();

        ImGui.TableSetColumnIndex(4);
        ImGui.Text(this.formatTime(entry.timestamp));
      }

      ImGui.SetScrollHereY();

      ImGui.EndTable();
    }

    ImGui.End();
  }

  private toHex(data: Uint8Array): string {
    return Array.from(data)
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join(' ');
  }

  private formatTime(date: Date): string {
    return date.toTimeString().split(' ')[0];
  }
}
