type StatsUpdatedSubscriber = () => void;

export class StatsController {
  private subscribers: StatsUpdatedSubscriber[] = [];

  subscribeStatsUpdated(cb: StatsUpdatedSubscriber): void {
    this.subscribers.push(cb);
  }

  unsubscribeStatsUpdated(cb: StatsUpdatedSubscriber): void {
    this.subscribers = this.subscribers.filter((s) => s !== cb);
  }

  notifyStatsUpdated(): void {
    for (const cb of this.subscribers) cb();
  }
}
