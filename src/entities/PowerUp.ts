import Phaser from 'phaser';
import { scaleOf } from '../config/layout';
import { POWERUPS, type PowerUpKind } from '../config/powerups';

const LIFESPAN_MS = 5200;

/**
 * A floating, tappable perk. Drifts in, bobs and pulses to read as "grab me",
 * and despawns (no penalty) if ignored. The scene hit-tests it manually.
 */
export class PowerUp extends Phaser.GameObjects.Container {
  readonly kind: PowerUpKind;
  hitRadius = 0;
  private alive = true;
  private life = LIFESPAN_MS;
  private bobPhase = Math.random() * Math.PI * 2;
  private baseY: number;
  private onCollect: (p: PowerUp) => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    kind: PowerUpKind,
    onCollect: (p: PowerUp) => void,
  ) {
    super(scene, x, y);
    this.kind = kind;
    this.baseY = y;
    this.onCollect = onCollect;

    const def = POWERUPS[kind];
    const s = scaleOf(scene);
    const radius = 40 * s;

    const glow = scene.add.circle(0, 0, radius + 8 * s, def.color, 0.25);
    const disc = scene.add.circle(0, 0, radius, def.color, 0.95);
    disc.setStrokeStyle(3 * s, 0xffffff, 0.9);
    const glyph = scene.add.text(0, 0, def.emoji, { fontSize: `${Math.round(46 * s)}px` }).setOrigin(0.5);

    this.add([glow, disc, glyph]);
    this.setDepth(550); // above bugs, so a perk on a bug wins the tap
    this.setScale(0);
    this.hitRadius = radius + 24 * s;

    scene.add.existing(this);
    scene.tweens.add({ targets: this, scale: 1, duration: 220, ease: 'Back.Out' });
    // Gentle pulse so it stands out from the bugs.
    scene.tweens.add({
      targets: glow,
      scale: 1.25,
      alpha: 0.45,
      duration: 600,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });
  }

  collect() {
    if (!this.alive) return;
    this.alive = false;
    this.onCollect(this);
    this.scene.tweens.add({
      targets: this,
      scale: 1.6,
      alpha: 0,
      duration: 160,
      ease: 'Cubic.Out',
      onComplete: () => this.destroy(),
    });
  }

  tick(dtMs: number) {
    if (!this.alive) return;
    this.life -= dtMs;
    this.bobPhase += dtMs / 380;
    this.y = this.baseY + Math.sin(this.bobPhase) * 6;
    // Blink out the final stretch as a "hurry up" cue.
    if (this.life < 1400) this.setAlpha(0.45 + 0.55 * Math.abs(Math.sin(this.life / 90)));
    if (this.life <= 0) this.expire();
  }

  private expire() {
    if (!this.alive) return;
    this.alive = false;
    this.scene.tweens.add({
      targets: this,
      scale: 0,
      alpha: 0,
      duration: 160,
      onComplete: () => this.destroy(),
    });
  }

  isAlive() {
    return this.alive;
  }
}
