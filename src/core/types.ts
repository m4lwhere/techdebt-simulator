/** A career stage. Each one ramps the absurdity — and the interest rate. */
export interface LevelConfig {
  id: number;
  name: string;
  tagline: string;
  /** Compounding debt interest per second (fraction of current debt). */
  interestRate: number;
  /** Debt you can carry before COLLAPSE pressure starts building. */
  sustainableDebt: number;
  /** Base bugs-per-second at zero debt; scales up with debt. */
  bugRateBase: number;
  /** CAN DISTANCE needed to graduate to the next stage. */
  distanceGoal: number;
  /** Background tint for the stage. */
  bgColor: number;
}

/** Read-only snapshot the HUD renders each frame. */
export interface EngineSnapshot {
  debt: number;
  canDistance: number;
  velocity: number;
  interestRate: number;
  /** 0..1 — at 1.0 the codebase collapses. */
  pressure: number;
  /** How deep in the "sweet spot" we are, -1 (too clean) .. 0 (perfect) .. 1 (over-leveraged). */
  leverage: number;
}
