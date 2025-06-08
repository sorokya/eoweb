import { ImGui } from "@zhobo63/imgui-ts";
import mitt, { Emitter } from "mitt";

type ConnectModalEvents = {
    'connect': string;
    'closed': void;
}

export class ConnectModal {
    private emitter: Emitter<ConnectModalEvents>;
    private host: ImGui.ImStringBuffer = new ImGui.ImStringBuffer(256, 'wss://ws.reoserv.net');
    open: boolean = true;

    constructor() {
        this.emitter = mitt<ConnectModalEvents>();
    }

    on<Event extends keyof ConnectModalEvents>(event: Event, handler: (data: ConnectModalEvents[Event]) => void) {
        this.emitter.on(event, handler);
    }

    render() {
        const io = ImGui.GetIO();
        const windowSize = new ImGui.Vec2(300, 100); // desired size of the window
        const center = new ImGui.Vec2(
            io.DisplaySize.x / 2 - windowSize.x / 2,
            io.DisplaySize.y / 2 - windowSize.y / 2
        );

        ImGui.SetNextWindowSize(windowSize, ImGui.Cond.Once);
        ImGui.SetNextWindowPos(center, ImGui.Cond.Once); // or Cond.Always for hard placement

        ImGui.Begin('Connect to Server', null, ImGui.WindowFlags.NoResize);
        ImGui.InputText("Host", this.host);

        if (ImGui.Button("Connect")) {
            this.emitter.emit('connect', this.host.buffer);
        }

        ImGui.SameLine();

        if (ImGui.Button('Cancel')) {
            this.emitter.emit('closed');
        }

        ImGui.End();
    }
}