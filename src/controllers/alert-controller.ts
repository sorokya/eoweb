type AlertSubscriber = (title: string, message: string) => void;
type ConfirmSubscriber = (
  title: string,
  message: string,
  callback: (confirmed: boolean) => void,
) => void;

export class AlertController {
  private subscribers: AlertSubscriber[] = [];
  private confirmSubscribers: ConfirmSubscriber[] = [];

  subscribe(subscriber: AlertSubscriber) {
    this.subscribers.push(subscriber);
  }

  subscribeConfirm(subscriber: ConfirmSubscriber) {
    this.confirmSubscribers.push(subscriber);
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
}
