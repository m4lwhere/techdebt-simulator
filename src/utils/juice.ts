import Phaser from 'phaser';
import { scaleOf } from '../config/layout';

export type BurstColor = 'green' | 'red' | 'orange' | 'blue';

const TINTS: Record<BurstColor, number> = {
  green: 0x33d17a,
  red: 0xff3344,
  orange: 0xff9f43,
  blue: 0x7a9aff,
};

/**
 * Pooled feedback effects. Allocate ONCE in create(), never during gameplay.
 * Sizes/speeds scale with the device resolution (see config/layout.ts).
 */
export class Juice {
  private emitters: Record<BurstColor, Phaser.GameObjects.Particles.ParticleEmitter>;
  private textPool: Phaser.GameObjects.Text[] = [];
  private poolIndex = 0;
  private s: number;

  constructor(private scene: Phaser.Scene) {
    const s = scaleOf(scene);
    this.s = s;

    const make = (tint: number) =>
      scene.add
        .particles(0, 0, 'spark', {
          speed: { min: 60 * s, max: 220 * s },
          angle: { min: 0, max: 360 },
          scale: { start: 0.25 * s, end: 0 },
          lifespan: { min: 220, max: 480 },
          tint,
          blendMode: 'ADD',
          emitting: false,
        })
        .setDepth(800);

    this.emitters = {
      green: make(TINTS.green),
      red: make(TINTS.red),
      orange: make(TINTS.orange),
      blue: make(TINTS.blue),
    };

    for (let i = 0; i < 16; i++) {
      const t = scene.add
        .text(0, 0, '', { fontFamily: 'system-ui, sans-serif', fontStyle: 'bold' })
        .setOrigin(0.5)
        .setDepth(900)
        .setActive(false)
        .setVisible(false);
      this.textPool.push(t);
    }
  }

  burst(x: number, y: number, color: BurstColor, count = 12): void {
    this.emitters[color].emitParticleAt(x, y, count);
  }

  /** size is a design-px value (calibrated at 414 wide); scaled here. */
  pop(x: number, y: number, text: string, color = '#ffffff', size = 22): void {
    const t = this.textPool[this.poolIndex];
    this.poolIndex = (this.poolIndex + 1) % this.textPool.length;

    this.scene.tweens.killTweensOf(t);
    t.setActive(true)
      .setVisible(true)
      .setPosition(x, y)
      .setText(text)
      .setColor(color)
      .setFontSize(Math.round(size * this.s))
      .setAlpha(1)
      .setScale(1);

    this.scene.tweens.add({
      targets: t,
      y: y - 60 * this.s,
      alpha: 0,
      scale: 1.3,
      duration: 700,
      ease: 'Cubic.Out',
      onComplete: () => t.setActive(false).setVisible(false),
    });
  }
}

/** Screen shake scaled by an intensity 0..1. (Resolution-independent.) */
export function shake(scene: Phaser.Scene, intensity = 0.5, duration = 220): void {
  scene.cameras.main.shake(duration, 0.004 + intensity * 0.012);
}

/** Brief full-screen color flash (e.g. red on incident). */
export function flash(scene: Phaser.Scene, color = 0xff3344, duration = 180): void {
  const c = Phaser.Display.Color.IntegerToRGB(color);
  scene.cameras.main.flash(duration, c.r, c.g, c.b);
}
