import { TUNING } from '../config/gameConfig';
import type { EngineSnapshot, LevelConfig } from './types';

/**
 * The economic simulation behind "kick the can."
 *
 * The twist: technical debt is GOOD — it's leverage. Debt makes you faster,
 * so you kick the reckoning further down the road. But debt compounds, and
 * once it passes the stage's sustainable line, COLLAPSE pressure builds. The
 * skill is living right under that line, not paying everything off.
 */
export class DebtEngine {
  debt = 0;
  canDistance = 0;
  pressure = 0; // 0..1, collapse at 1
  velocityMultiplier = 1; // power-ups (e.g. Coffee) crank this temporarily
  private level: LevelConfig;

  constructor(level: LevelConfig) {
    this.level = level;
  }

  setLevel(level: LevelConfig) {
    this.level = level;
  }

  get velocity(): number {
    return (TUNING.BASE_VELOCITY + this.debt * TUNING.VELOCITY_PER_DEBT) * this.velocityMultiplier;
  }

  /** The stage's sustainable debt line — used to size power-up effects. */
  get sustainableDebt(): number {
    return this.level.sustainableDebt;
  }

  reduceDebt(amount: number) {
    this.debt = Math.max(0, this.debt - amount);
  }

  addDebt(amount: number) {
    this.debt += amount;
  }

  relievePressure(amount: number) {
    this.pressure = Math.max(0, this.pressure - amount);
  }

  addPressure(amount: number) {
    this.pressure = Math.min(1, this.pressure + amount);
  }

  /** Bugs per second right now — scales with how leveraged you are. */
  get bugRate(): number {
    return this.level.bugRateBase + this.debt * TUNING.BUG_RATE_PER_DEBT;
  }

  /** -1 (too clean, leaving velocity on the table) .. 0 .. 1 (over the line). */
  get leverage(): number {
    const sustainable = this.level.sustainableDebt;
    const low = sustainable * TUNING.SWEET_SPOT_LOW;
    if (this.debt < low) {
      return (this.debt - low) / Math.max(low, 1); // negative: under-leveraged
    }
    return (this.debt - sustainable) / Math.max(sustainable, 1); // 0 at the line, positive over it
  }

  /** True while debt sits in the rewarding "just under collapse" band. */
  get inSweetSpot(): boolean {
    const lev = this.leverage;
    return lev >= -0.45 && lev <= 0.02;
  }

  shipIt() {
    this.debt += TUNING.SHIP_DEBT;
    this.canDistance += TUNING.SHIP_BURST;
  }

  payDown() {
    this.debt = Math.max(0, this.debt - TUNING.PAY_AMOUNT);
    this.pressure = Math.max(0, this.pressure - TUNING.PAY_PRESSURE_RELIEF);
  }

  squashBug() {
    this.pressure = Math.max(0, this.pressure - TUNING.BUG_SQUASH_RELIEF);
  }

  bugExploded() {
    this.debt += TUNING.BUG_EXPLODE_DEBT;
    this.pressure = Math.min(1, this.pressure + TUNING.BUG_EXPLODE_PRESSURE);
  }

  /** Advance the sim. dt is in SECONDS. Returns true if the codebase collapsed. */
  update(dt: number): boolean {
    // The can keeps rolling — distance always accrues at current velocity.
    this.canDistance += this.velocity * dt;

    // Compounding interest. This is what eventually kills pure shippers.
    this.debt += this.debt * this.level.interestRate * dt;

    // Collapse pressure: rises when over the sustainable line, decays when under.
    const over = this.debt - this.level.sustainableDebt;
    if (over > 0) {
      const overFrac = over / this.level.sustainableDebt;
      this.pressure += TUNING.PRESSURE_GAIN * overFrac * dt;
    } else {
      this.pressure -= TUNING.PRESSURE_DECAY * dt;
    }
    this.pressure = Math.min(1, Math.max(0, this.pressure));

    return this.pressure >= 1;
  }

  snapshot(): EngineSnapshot {
    return {
      debt: this.debt,
      canDistance: this.canDistance,
      velocity: this.velocity,
      interestRate: this.level.interestRate,
      pressure: this.pressure,
      leverage: this.leverage,
    };
  }
}
