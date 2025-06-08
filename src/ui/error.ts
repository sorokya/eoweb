import { ImGui } from "@zhobo63/imgui-ts";
import mitt, { Emitter } from "mitt";

type ErrorModalEvents = {
    'closed': void;
}

export class ErrorModal {
    private emitter: Emitter<ErrorModalEvents>;
    private error: string;

    constructor(error: string) {
        this.emitter = mitt<ErrorModalEvents>();
        this.error = error;
    }

    on<Event extends keyof ErrorModalEvents>(event: Event, handler: (data: ErrorModalEvents[Event]) => void) {
        this.emitter.on(event, handler);
    }

    render() {
        const io = ImGui.GetIO();
        const windowSize = new ImGui.Vec2(300, 200); // desired size of the window
        const center = new ImGui.Vec2(
            io.DisplaySize.x / 2 - windowSize.x / 2,
            io.DisplaySize.y / 2 - windowSize.y / 2
        );

        ImGui.SetNextWindowSize(windowSize, ImGui.Cond.Once);
        ImGui.SetNextWindowPos(center, ImGui.Cond.Once); // or Cond.Always for hard placement

        ImGui.Begin('Error');
        ImGui.Text(this.error);

        if (ImGui.Button('Cancel')) {
            this.emitter.emit('closed');
        }

        ImGui.End();
    }
}