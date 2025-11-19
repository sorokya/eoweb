import { type Client, GameState } from '../../../client';
import { playSfxById, SfxId } from '../../../sfx';
import { Base } from '../../base-ui';
import { Button } from '../../shared/button';

import classes from './login-dialog.module.css';

export class LoginDialog extends Base {
  public declare el: HTMLDivElement;
  private client: Client;
  private form: HTMLFormElement;
  private username: HTMLInputElement;
  private password: HTMLInputElement;
  private chkRememberMe: HTMLInputElement;
  private formElements: HTMLElement[];

  show() {
    this.username.value = '';
    this.password.value = '';
    this.chkRememberMe.checked = this.client.rememberMe;
    this.el.classList.remove('hidden');
    this.username.focus();
  }

  constructor(parent: HTMLElement, client: Client) {
    super();

    const focus = () => {
      playSfxById(SfxId.TextBoxFocus);
    };

    this.el = document.createElement('div');
    this.el.className = classes['login-dialog'];

    this.client = client;

    const title = document.createElement('div');
    title.className = classes.title;
    title.innerText = 'Login';
    this.el.appendChild(title);

    this.form = document.createElement('form');

    const formContainer = document.createElement('div');

    const usernameRow = document.createElement('div');
    usernameRow.className = classes['form-row'];
    const usernameLabel = document.createElement('label');
    usernameLabel.innerText = 'Account name';
    usernameLabel.htmlFor = 'login-username';
    usernameRow.appendChild(usernameLabel);

    this.username = document.createElement('input');
    this.username.id = 'login-username';
    this.username.type = 'text';
    this.username.title = 'Username';
    this.username.name = 'username';
    this.username.addEventListener('focus', focus);
    usernameRow.appendChild(this.username);
    formContainer.appendChild(usernameRow);

    const passwordRow = document.createElement('div');
    passwordRow.className = classes['form-row'];
    const passwordLabel = document.createElement('label');
    passwordLabel.innerText = 'Password';
    passwordLabel.htmlFor = 'login-password';
    passwordRow.appendChild(passwordLabel);

    this.password = document.createElement('input');
    this.password.id = 'login-password';
    this.password.type = 'password';
    this.password.title = 'Password';
    this.password.name = 'password';
    this.password.addEventListener('focus', focus);
    passwordRow.appendChild(this.password);
    formContainer.appendChild(passwordRow);

    const rememberMeRow = document.createElement('div');
    rememberMeRow.className = classes['form-row'];
    const rememberMeLabel = document.createElement('label');
    rememberMeLabel.innerText = 'Remember me?';
    rememberMeLabel.htmlFor = 'login-remember';
    rememberMeRow.appendChild(rememberMeLabel);

    this.chkRememberMe = document.createElement('input');
    this.chkRememberMe.type = 'checkbox';
    this.chkRememberMe.id = 'login-remember';
    this.chkRememberMe.name = 'remember-me';
    rememberMeLabel.appendChild(this.chkRememberMe);
    formContainer.appendChild(rememberMeRow);

    const buttonRow = document.createElement('div');
    buttonRow.className = classes['button-row'];
    new Button('Connect', buttonRow, 'submit');

    const btnCancel = new Button('Cancel', buttonRow, 'button');
    btnCancel.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      client.setState(GameState.MainMenu);
    });

    this.form.appendChild(formContainer);
    this.form.appendChild(buttonRow);
    this.el.appendChild(this.form);
    parent.appendChild(this.el);

    this.formElements = [this.username, this.password];

    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      playSfxById(SfxId.ButtonClick);
      this.client.login(
        this.username.value,
        this.password.value,
        this.chkRememberMe.checked,
      );

      this.password.value = '';
      this.password.focus();
      localStorage.setItem('remember-me', `${this.chkRememberMe.checked}`);
      return false;
    });

    this.setupTabTrapping();
  }

  private setupTabTrapping() {
    this.formElements.forEach((element, index) => {
      element.addEventListener('keydown', (e: KeyboardEvent) => {
        if (e.key === 'Tab' && !this.el.classList.contains('hidden')) {
          e.preventDefault();

          if (e.shiftKey) {
            const prevIndex =
              index === 0 ? this.formElements.length - 1 : index - 1;
            this.formElements[prevIndex].focus();
          } else {
            const nextIndex =
              index === this.formElements.length - 1 ? 0 : index + 1;
            this.formElements[nextIndex].focus();
          }
        }
      });
    });
  }
}
