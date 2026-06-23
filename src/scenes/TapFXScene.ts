import Phaser from 'phaser';
import { scaleOf } from '../config/layout';

/**
 * A transparent overlay scene that runs on top of everything and draws a quick
 * ripple wherever a pointer goes down — on any finger. Pooled, so it never
 * allocates during play. Doubles as a live check that touches map 1:1.
 */
export class TapFXScene extends Phaser.Scene {
  private pool: Phaser.GameObjects.Arc[] = [];
  private dots: Phaser.GameObjects.Arc[] = [];
  private idx = 0;

  constructor() {
    super({ key: 'TapFX' });
  }

  create() {
    const s = scaleOf(this);
    for (let i = 0; i < 12; i++) {
      const ring = this.add.circle(0, 0, 22 * s);
      ring.setStrokeStyle(3 * s, 0xffffff, 0.9);
      ring.isFilled = false;
      ring.setVisible(false).setDepth(10000);
      this.pool.push(ring);

      const dot = this.add.circle(0, 0, 5 * s, 0xffffff, 0.95);
      dot.setVisible(false).setDepth(10000);
      this.dots.push(dot);
    }

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.ripple(p.x, p.y));
  }

  private ripple(x: number, y: number) {
    const ring = this.pool[this.idx];
    const dot = this.dots[this.idx];
    this.idx = (this.idx + 1) % this.pool.length;

    this.tweens.killTweensOf([ring, dot]);

    ring.setPosition(x, y).setVisible(true).setScale(0.5).setAlpha(0.85);
    this.tweens.add({
      targets: ring,
      scale: 1.9,
      alpha: 0,
      duration: 160,
      ease: 'Quad.Out',
      onComplete: () => ring.setVisible(false),
    });

    dot.setPosition(x, y).setVisible(true).setScale(1).setAlpha(0.95);
    this.tweens.add({
      targets: dot,
      alpha: 0,
      duration: 110,
      ease: 'Quad.Out',
      onComplete: () => dot.setVisible(false),
    });
  }
}
