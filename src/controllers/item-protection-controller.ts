export class ItemProtectionController {
  itemProtectionTimers: Map<
    number,
    {
      ticks: number;
      ownerId: number;
    }
  > = new Map();

  tick(): void {
    for (const [index, { ticks, ownerId }] of this.itemProtectionTimers) {
      if (ticks <= 1) {
        this.itemProtectionTimers.delete(index);
      } else {
        this.itemProtectionTimers.set(index, {
          ticks: ticks - 1,
          ownerId,
        });
      }
    }
  }
}
