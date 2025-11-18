export class InGameUI {
  private el: HTMLDivElement;

  constructor(container: HTMLElement) {
    this.el = document.createElement('div');
    this.el.id = 'in-game-ui';
    container.appendChild(this.el);
  }
}
