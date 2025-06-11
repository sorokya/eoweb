import { ImGui } from '@zhobo63/imgui-ts';

export enum ChatTab {
  Local = 'Local',
  Global = 'Global',
  Party = 'Party',
  Guild = 'Guild',
  System = 'System',
}

export class ChatModal {
  private currentTab: ChatTab = ChatTab.Local;
  private chatMessages: Record<ChatTab, string[]> = {
    [ChatTab.Local]: [],
    [ChatTab.Global]: [],
    [ChatTab.Party]: [],
    [ChatTab.Guild]: [],
    [ChatTab.System]: [],
  };
  private chatInputBuffer = new ImGui.ImStringBuffer(256);

  addMessage(tab: ChatTab, message: string) {
    this.chatMessages[tab].push(message);
  }

  render() {
    ImGui.Begin('Chat', null, ImGui.WindowFlags.AlwaysAutoResize);

    // Tab bar
    if (ImGui.BeginTabBar('ChatTabs')) {
      for (const tab of Object.values(ChatTab)) {
        if (ImGui.BeginTabItem(tab as string)) {
          this.currentTab = tab as ChatTab;
          ImGui.EndTabItem();
        }
      }
      ImGui.EndTabBar();
    }

    // Scrollable message log
    ImGui.BeginChild('ChatLog', new ImGui.Vec2(400, 200), true);
    const messages = this.chatMessages[this.currentTab];
    for (const msg of messages) {
      ImGui.TextUnformatted(msg);
    }
    ImGui.EndChild();

    // Message input box
    ImGui.InputText(
      '##chatInput',
      this.chatInputBuffer,
      ImGui.InputTextFlags.EnterReturnsTrue,
    );
    ImGui.SameLine();
    if (
      ImGui.Button('Send') ||
      (ImGui.IsItemFocused() && ImGui.IsKeyPressed(ImGui.Key.Enter))
    ) {
      const msg = this.chatInputBuffer.buffer.trim();
      if (msg.length > 0) {
        this.chatMessages[this.currentTab].push(`You: ${msg}`);
        this.chatInputBuffer.buffer = '';
      }
    }

    ImGui.End();
  }
}
