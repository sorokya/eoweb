import classes from './button.module.css';

export class Button extends HTMLButtonElement {
  constructor(
    label: string,
    parent: HTMLElement,
    type: 'button' | 'submit' | 'reset' = 'button',
    variant: 'large' | 'small' = 'small',
  ) {
    super();
    const text = document.createElement('span');
    text.innerText = label;
    this.appendChild(text);
    this.type = type;
    this.classList.add(classes.button, classes[variant]);
    parent.appendChild(this);
  }
}

customElements.define('custom-button', Button, { extends: 'button' });
