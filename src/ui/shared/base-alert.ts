import { Base } from '../base-ui';

export class BaseAlert extends Base {
  protected title: HTMLSpanElement;
  protected message: HTMLSpanElement;

  setContent(title: string, message: string) {
    this.title.innerText = title;
    this.message.innerText = message;
  }
}
