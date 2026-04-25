type AlertSubscriber = (title: string, message: string) => void;
type ConfirmSubscriber = (
  title: string,
  message: string,
  callback: (confirmed: boolean) => void,
) => void;
type AmountSubscriber = (
  title: string,
  message: string,
  max: number,
  actionLabel: string,
  callback: (amount: number | null) => void,
  repeatActionLabel?: string,
) => void;
type InputSubscriber = (
  title: string,
  message: string,
  callback: (input: string | null) => void,
) => void;

export class AlertController {
  private subscribers: AlertSubscriber[] = [];
  private confirmSubscribers: ConfirmSubscriber[] = [];
  private amountSubscribers: AmountSubscriber[] = [];
  private inputSubscribers: InputSubscriber[] = [];

  subscribe(subscriber: AlertSubscriber) {
    this.subscribers.push(subscriber);
  }

  subscribeConfirm(subscriber: ConfirmSubscriber) {
    this.confirmSubscribers.push(subscriber);
  }

  subscribeAmount(subscriber: AmountSubscriber) {
    this.amountSubscribers.push(subscriber);
  }

  subscribeInput(subscriber: InputSubscriber) {
    this.inputSubscribers.push(subscriber);
  }

  show(title: string, message: string) {
    for (const subscriber of this.subscribers) {
      subscriber(title, message);
    }
  }

  showConfirm(
    title: string,
    message: string,
    callback: (confirmed: boolean) => void,
  ) {
    for (const subscriber of this.confirmSubscribers) {
      subscriber(title, message, callback);
    }
  }

  showAmount(
    title: string,
    message: string,
    max: number,
    actionLabel: string,
    callback: (amount: number | null) => void,
    repeatActionLabel?: string,
  ) {
    for (const subscriber of this.amountSubscribers) {
      subscriber(title, message, max, actionLabel, callback, repeatActionLabel);
    }
  }

  showInput(
    title: string,
    message: string,
    callback: (input: string | null) => void,
  ) {
    for (const subscriber of this.inputSubscribers) {
      subscriber(title, message, callback);
    }
  }
}
