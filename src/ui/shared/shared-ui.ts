export class SharedUI {
  private el: HTMLDivElement;

  constructor(container: HTMLElement) {
    this.el = document.createElement('div');
    this.el.id = 'shared-ui';
    container.appendChild(this.el);
  }
}
