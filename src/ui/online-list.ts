import { PlayersRequestClientPacket } from 'eolib';
import type { Client } from '../client';
import { Base } from './base-ui';

export class OnlineList extends Base {
  private client: Client;

  constructor(client: Client) {
    const draggable = true;
    super(document.getElementById('online-list'), draggable);
    this.client = client;
    const playersContainer = this.container.querySelector('.players');

    const scrollHandle = this.container.querySelector('.scroll-handle');

    const topOffset = 37;
    const bottomOffset = 30;

    playersContainer.addEventListener('scroll', (_) => {
      const percentageScrolled =
        playersContainer.scrollTop /
        (playersContainer.scrollHeight - playersContainer.clientHeight);
      const containerHeight = playersContainer.clientHeight;
      const scrollHandleHeight = 20; // Adjust this value as needed for the height of the scroll handle
      const maxScrollTop = containerHeight - scrollHandleHeight - bottomOffset;
      const percentageScrolledTop =
        percentageScrolled * maxScrollTop + topOffset;
      (scrollHandle as HTMLElement).style.top = `${percentageScrolledTop}px`;
    });

    this.client.on('playersListUpdated', (players) => {
      if (!this.container) return;

      const playerCountElement = this.container.querySelector('.player-count');
      playerCountElement.textContent = `${players.length}`;
      playersContainer.innerHTML = '';

      players.map((player) => {
        const playerElement = document.createElement('div');
        playerElement.className = 'player';

        const nameElement = document.createElement('span');
        nameElement.className = 'name';
        const playerIconElement = document.createElement('div');
        playerIconElement.className = 'icon';
        playerIconElement.setAttribute('data-id', (player.icon + 9).toString());
        const titleElement = document.createElement('span');
        titleElement.className = 'title';
        titleElement.textContent = player.title || '-';
        const guildElement = document.createElement('span');
        guildElement.className = 'guild';
        guildElement.textContent =
          !player.guildTag || player.guildTag === '   ' ? '-' : player.guildTag;
        const classElement = document.createElement('span');
        classElement.className = 'class';
        classElement.textContent =
          this.client.ecf.classes[player.classId - 1]?.name || '-';

        nameElement.textContent = player.name;
        playerElement.appendChild(playerIconElement);
        playerElement.appendChild(nameElement);
        playerElement.appendChild(titleElement);
        playerElement.appendChild(guildElement);
        playerElement.appendChild(classElement);
        playersContainer.appendChild(playerElement);
      });
    });
  }

  show() {
    this.client.bus.send(new PlayersRequestClientPacket());
    super.show();
  }
}
