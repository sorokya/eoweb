type AlertSubscriber = (title: string, message: string) => void;

export class AlertController {
  private subscribers: AlertSubscriber[] = [];

  subscribe(subscriber: AlertSubscriber) {
    this.subscribers.push(subscriber);
  }

  show(title: string, message: string) {
    for (const subscriber of this.subscribers) {
      subscriber(title, message);
    }
  }
}
