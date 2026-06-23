export type PowerUpKind = 'coffee' | 'senior' | 'refactor' | 'paste' | 'oracle';

export interface PowerUpDef {
  kind: PowerUpKind;
  emoji: string;
  name: string;
  tagline: string;
  color: number;
  /** Relative spawn weight. */
  weight: number;
}

export const POWERUPS: Record<PowerUpKind, PowerUpDef> = {
  coffee: {
    kind: 'coffee',
    emoji: '☕',
    name: 'COFFEE',
    tagline: '2× velocity. Crash later.',
    color: 0xc08457,
    weight: 4,
  },
  senior: {
    kind: 'senior',
    emoji: '🦸',
    name: 'SENIOR ENGINEER',
    tagline: 'Auto-squashes incidents.',
    color: 0x4a90d9,
    weight: 3,
  },
  refactor: {
    kind: 'refactor',
    emoji: '♻️',
    name: 'REFACTOR SPRINT',
    tagline: 'Pays down the mess.',
    color: 0x33d17a,
    weight: 3,
  },
  paste: {
    kind: 'paste',
    emoji: '📋',
    name: 'STACK OVERFLOW PASTE',
    tagline: 'Fix-all… or catastrophe?',
    color: 0xf48024, // Stack Overflow orange, naturally
    weight: 2,
  },
  oracle: {
    kind: 'oracle',
    emoji: '🐋',
    name: 'OPEN-WEIGHTS ORACLE',
    tagline: 'Suspiciously capable. Suspiciously cheap.',
    color: 0x6c5ce7,
    weight: 2,
  },
};

export const POWERUP_KINDS = Object.keys(POWERUPS) as PowerUpKind[];

/** Weighted random pick. */
export function pickPowerUpKind(): PowerUpKind {
  const total = POWERUP_KINDS.reduce((sum, k) => sum + POWERUPS[k].weight, 0);
  let roll = Math.random() * total;
  for (const k of POWERUP_KINDS) {
    roll -= POWERUPS[k].weight;
    if (roll <= 0) return k;
  }
  return 'coffee';
}
