type ImgbuttonId = 'create-account' | 'play-game' | 'view-credits';

export class ImgButton extends HTMLButtonElement {
  constructor(id: ImgbuttonId, title: string, parent: HTMLElement) {
    super();
    this.classList.add('img-btn');
    this.title = title;
    this.type = 'button';
    this.setAttribute('data-id', id);
    parent.appendChild(this);
  }
}

customElements.define('img-button', ImgButton, { extends: 'button' });
