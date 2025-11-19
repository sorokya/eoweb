import { type Client, GameState } from '../../../client';
import { MAX_PASSWORD_LENGTH, MAX_USERNAME_LENGTH } from '../../../consts';
import { DialogResourceID } from '../../../edf';
import { playSfxById, SfxId } from '../../../sfx';
import { Base } from '../../base-ui';
import { Button } from '../../shared/button';

import classes from './create-account-dialog.module.css';

export class CreateAccountDialog extends Base {
  public declare el: HTMLDivElement;

  private form: HTMLFormElement;
  private username: HTMLInputElement;
  private password: HTMLInputElement;
  private confirmPassword: HTMLInputElement;
  private name: HTMLInputElement;
  private location: HTMLInputElement;
  private email: HTMLInputElement;
  private formElements: HTMLInputElement[];

  show() {
    this.username.value = '';
    this.password.value = '';
    this.confirmPassword.value = '';
    this.name.value = '';
    this.location.value = '';
    this.email.value = '';
    this.el.classList.remove('hidden');
    this.username.focus();
  }

  constructor(parent: HTMLElement, client: Client) {
    super();

    const focus = () => {
      playSfxById(SfxId.TextBoxFocus);
    };

    this.el = document.createElement('div');
    this.el.className = classes['create-account-dialog'];

    const title = document.createElement('div');
    title.className = classes.title;
    title.innerText = 'Create Account';
    this.el.appendChild(title);

    this.form = document.createElement('form');

    const formContainer = document.createElement('div');

    const usernameRow = document.createElement('div');
    usernameRow.className = classes['form-row'];
    const usernameLabel = document.createElement('label');
    usernameLabel.innerText = 'Account name';
    usernameLabel.htmlFor = 'create-account-username';
    usernameRow.appendChild(usernameLabel);

    this.username = document.createElement('input');
    this.username.id = 'create-account-username';
    this.username.type = 'text';
    this.username.title = 'Username';
    this.username.name = 'username';
    this.username.maxLength = MAX_USERNAME_LENGTH;
    this.username.addEventListener('focus', focus);
    usernameRow.appendChild(this.username);
    formContainer.appendChild(usernameRow);

    const passwordRow = document.createElement('div');
    passwordRow.className = classes['form-row'];
    const passwordLabel = document.createElement('label');
    passwordLabel.innerText = 'Password';
    passwordLabel.htmlFor = 'create-account-password';
    passwordRow.appendChild(passwordLabel);

    this.password = document.createElement('input');
    this.password.id = 'create-account-password';
    this.password.type = 'password';
    this.password.title = 'Password';
    this.password.name = 'password';
    this.password.maxLength = MAX_PASSWORD_LENGTH;
    this.password.addEventListener('focus', focus);
    passwordRow.appendChild(this.password);
    formContainer.appendChild(passwordRow);

    const confirmPasswordRow = document.createElement('div');
    confirmPasswordRow.className = classes['form-row'];
    const confirmPasswordLabel = document.createElement('label');
    confirmPasswordLabel.innerText = 'Confirm Password';
    confirmPasswordLabel.htmlFor = 'create-account-confirm-password';
    confirmPasswordRow.appendChild(confirmPasswordLabel);

    this.confirmPassword = document.createElement('input');
    this.confirmPassword.id = 'create-account-confirm-password';
    this.confirmPassword.type = 'password';
    this.confirmPassword.title = 'Confirm Password';
    this.confirmPassword.name = 'confirm-password';
    this.confirmPassword.maxLength = MAX_PASSWORD_LENGTH;
    this.confirmPassword.addEventListener('focus', focus);
    confirmPasswordRow.appendChild(this.confirmPassword);
    formContainer.appendChild(confirmPasswordRow);

    const nameRow = document.createElement('div');
    nameRow.className = classes['form-row'];
    const nameLabel = document.createElement('label');
    nameLabel.innerText = 'Name';
    nameLabel.htmlFor = 'create-account-name';
    nameRow.appendChild(nameLabel);

    this.name = document.createElement('input');
    this.name.id = 'create-account-name';
    this.name.type = 'text';
    this.name.title = 'Name';
    this.name.name = 'name';
    this.name.addEventListener('focus', focus);
    nameRow.appendChild(this.name);
    formContainer.appendChild(nameRow);

    const locationRow = document.createElement('div');
    locationRow.className = classes['form-row'];
    const locationLabel = document.createElement('label');
    locationLabel.innerText = 'Location';
    locationLabel.htmlFor = 'create-account-location';
    locationRow.appendChild(locationLabel);

    this.location = document.createElement('input');
    this.location.id = 'create-account-location';
    this.location.type = 'text';
    this.location.title = 'Location';
    this.location.name = 'location';
    this.location.addEventListener('focus', focus);
    locationRow.appendChild(this.location);
    formContainer.appendChild(locationRow);

    const emailRow = document.createElement('div');
    emailRow.className = classes['form-row'];
    const emailLabel = document.createElement('label');
    emailLabel.innerText = 'Email';
    emailLabel.htmlFor = 'create-account-email';
    emailRow.appendChild(emailLabel);

    this.email = document.createElement('input');
    this.email.id = 'create-account-email';
    this.email.type = 'text';
    this.email.title = 'Email';
    this.email.name = 'email';
    this.email.addEventListener('focus', focus);
    emailRow.appendChild(this.email);
    formContainer.appendChild(emailRow);

    const buttonRow = document.createElement('div');
    buttonRow.className = classes['button-row'];
    new Button('Create', buttonRow, 'submit');

    const btnCancel = new Button('Cancel', buttonRow);
    btnCancel.addEventListener('click', () => {
      playSfxById(SfxId.ButtonClick);
      client.setState(GameState.MainMenu);
    });

    this.form.appendChild(formContainer);
    this.form.appendChild(buttonRow);
    this.el.appendChild(this.form);
    parent.appendChild(this.el);

    this.formElements = [
      this.username,
      this.password,
      this.confirmPassword,
      this.name,
      this.location,
      this.email,
    ];

    this.form.addEventListener('submit', (e) => {
      e.preventDefault();
      playSfxById(SfxId.ButtonClick);
      const username = this.username.value.trim();
      const password = this.password.value.trim();
      const confirmPassword = this.confirmPassword.value.trim();
      const name = this.name.value.trim();
      const location = this.location.value.trim();
      const email = this.email.value.trim();

      if (
        !username ||
        !password ||
        !confirmPassword ||
        !name ||
        !location ||
        !email
      ) {
        const strings = client.getDialogStrings(
          DialogResourceID.ACCOUNT_CREATE_FIELDS_STILL_EMPTY,
        );
        client.showAlert(strings[0], strings[1]);
        return false;
      }

      if (password !== confirmPassword) {
        const strings = client.getDialogStrings(
          DialogResourceID.ACCOUNT_CREATE_PASSWORD_MISMATCH,
        );
        client.showAlert(strings[0], strings[1]);
        return false;
      }

      if (!email.includes('@') || !email.includes('.')) {
        const strings = client.getDialogStrings(
          DialogResourceID.ACCOUNT_CREATE_EMAIL_INVALID,
        );
        client.showAlert(strings[0], strings[1]);
        return false;
      }

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
