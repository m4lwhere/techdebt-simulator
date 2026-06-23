/** One boss per career stage — the climax you fight at the distance goal. */
export interface BossDef {
  emoji: string;
  name: string;
  /** Taps required to defeat. */
  hp: number;
  /** ms between attacks (spawns a bug cluster + taunt). */
  attackInterval: number;
  /** Bugs spawned per attack. */
  attackBugs: number;
  color: number;
}

/** Indexed to match LEVELS. The last one is the finale. */
export const BOSSES: BossDef[] = [
  { emoji: '🍕', name: 'THE MVP MONSTER', hp: 14, attackInterval: 2600, attackBugs: 2, color: 0xff9f43 },
  { emoji: '📊', name: 'THE BURN-RATE BEAST', hp: 22, attackInterval: 2300, attackBugs: 2, color: 0xe056fd },
  { emoji: '🧟', name: 'THE ZOMBIE MONOLITH', hp: 30, attackInterval: 2000, attackBugs: 3, color: 0x33d17a },
  { emoji: '🫧', name: 'THE HYPE BUBBLE', hp: 38, attackInterval: 1800, attackBugs: 3, color: 0xffd23f },
  { emoji: '🖥️', name: 'COBOL-OSAURUS REX', hp: 50, attackInterval: 1600, attackBugs: 4, color: 0xff3344 },
];
