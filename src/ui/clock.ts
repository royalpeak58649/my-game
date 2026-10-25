import { tick } from '../sim/tick';
import type { Speed, Store } from './store';

/** Milliseconds per weekly tick for each running speed. */
export const SPEED_MS: Record<Exclude<Speed, 0>, number> = {
  1: 1500,
  2: 800,
  3: 400,
  4: 180,
  5: 60,
};

/**
 * Drives the simulation clock. Speed 0 pauses; the last non-zero speed is
 * remembered so that pause can be toggled back on.
 */
export class GameClock {
  private readonly store: Store;
  private timer: number | null = null;
  private lastRunningSpeed: Exclude<Speed, 0> = 1;
  private unsubscribe: () => void;

  constructor(store: Store) {
    this.store = store;
    this.unsubscribe = store.subscribeUi((ui) => {
      if (ui.speed !== 0) this.lastRunningSpeed = ui.speed;
      this.reschedule();
    });
  }

  /** Toggles between paused and the last running speed. */
  togglePause(): void {
    const speed = this.store.getUi().speed;
    this.store.setUi({ speed: speed === 0 ? this.lastRunningSpeed : 0 });
  }

  setSpeed(speed: Speed): void {
    this.store.setUi({ speed });
  }

  dispose(): void {
    this.unsubscribe();
    this.clear();
  }

  private clear(): void {
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
  }

  private reschedule(): void {
    this.clear();
    const speed = this.store.getUi().speed;
    if (speed === 0) return;
    this.timer = window.setTimeout(() => this.step(), SPEED_MS[speed]);
  }

  private step(): void {
    this.timer = null;
    const speed = this.store.getUi().speed;
    if (speed === 0) return;
    this.store.set(tick(this.store.get()));
    this.timer = window.setTimeout(() => this.step(), SPEED_MS[speed]);
  }
}
