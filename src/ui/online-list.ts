import { PlayersRequestClientPacket } from 'eolib';
import type { Client } from '../client';
import { BaseDialogMd } from './base-dialog-md';
import { characterIconToChatIcon } from './utils/character-icon-to-chat-icon';

type Events = {
  playerSelected: { playerId: number };
};

export class OnlineList extends BaseDialogMd<Events> {
  constructor(client: Client) {
    super(client, document.querySelector('#online-list'), 'Online Players');

    const playersContainer = this.container.querySelector('.players');

    this.client.on('playersListUpdated', (players) => {
      if (!this.container) return;

      this.updateLabelText(`Online Players (${players.length})`);
      playersContainer.innerHTML = '';

      players.map((player) => {
        const playerElement = document.createElement('div');
        playerElement.className = 'player';

        const nameElement = document.createElement('span');
        nameElement.className = 'name';
        const playerIconElement = document.createElement('div');
        playerIconElement.className = 'icon';
        playerIconElement.setAttribute(
          'data-id',
          characterIconToChatIcon(player.icon).toString(),
        );
        const guildElement = document.createElement('span');
        guildElement.className = 'guild';
        guildElement.textContent =
          !player.guildTag || player.guildTag === '   ' ? '-' : player.guildTag;

        nameElement.textContent = player.name;
        playerElement.appendChild(playerIconElement);
        playerElement.appendChild(nameElement);
        playerElement.appendChild(guildElement);
        playersContainer.appendChild(playerElement);

        playerElement.addEventListener('contextmenu', () => {
          const chatBox = document.getElementById(
            'chat-message',
          ) as HTMLInputElement;
          if (chatBox) {
            chatBox.value = `!${player.name} `;
          }
        });
      });
    });
  }

  show() {
    this.client.bus.send(new PlayersRequestClientPacket());
    super.show();
  }

  render(): void {}
}
