import { ImGui } from "@zhobo63/imgui-ts";
import mitt, { Emitter } from "mitt";

type MenuEvents = {
    'connect': void;
    'disconnect': void;
    'create-account': void;
    'login': void;
    'help': void;
    'packet-log': void;
}

export class Menu {
    private emitter: Emitter<MenuEvents>;

    constructor() {
        this.emitter = mitt<MenuEvents>();
    }

    on<Event extends keyof MenuEvents>(event: Event, handler: (data: MenuEvents[Event]) => void) {
        this.emitter.on(event, handler);
    }

    render() {
        if (ImGui.BeginMainMenuBar()) {
            if (ImGui.BeginMenu("Game")) {
                if (ImGui.MenuItem("Connect")) {
                    this.emitter.emit('connect');
                }
                if (ImGui.MenuItem("Disconnect")) {
                    this.emitter.emit('disconnect');
                }
                ImGui.Separator();
                if (ImGui.MenuItem("Create Account")) {
                    this.emitter.emit('create-account');
                }
                if (ImGui.MenuItem("Login")) {
                    this.emitter.emit('login');
                }
                ImGui.EndMenu();
            }

            if (ImGui.BeginMenu("Debug")) {
                if (ImGui.MenuItem('Packet Log')) {
                    this.emitter.emit('packet-log');
                }
                ImGui.EndMenu();
            }

            // "Help" dropdown
            if (ImGui.BeginMenu("Help")) {
                if (ImGui.MenuItem("About")) {
                    console.log("Show About Dialog");
                }
                ImGui.EndMenu();
            }

            ImGui.EndMainMenuBar();
        }
    }
}