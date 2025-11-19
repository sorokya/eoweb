import classes from './button.module.css';

export class Button extends HTMLButtonElement {
  constructor(
    label: string,
    parent: HTMLElement,
    type: 'button' | 'submit' | 'reset' = 'button',
  ) {
    super();
    const text = document.createElement('span');
    text.innerText = label;
    this.appendChild(text);
    this.type = type;
    this.className = classes.button;
    parent.appendChild(this);
  }
}

customElements.define('custom-button', Button, { extends: 'button' });
