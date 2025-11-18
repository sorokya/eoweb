export class PreGameUI {
  private el: HTMLDivElement;

  constructor(container: HTMLElement) {
    this.el = document.createElement('div');
    this.el.id = 'pre-game-ui';
    container.appendChild(this.el);
  }
}
