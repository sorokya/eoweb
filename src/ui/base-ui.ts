export abstract class Base {
  public el: HTMLElement;
  public hidden = true;

  show() {
    this.el.classList.remove('hidden');
    this.hidden = false;
  }

  hide() {
    this.el.classList.add('hidden');
    this.hidden = true;
  }

  toggle() {
    if (this.el.classList.contains('hidden')) {
      this.show();
    } else {
      this.hide();
    }
  }
}
