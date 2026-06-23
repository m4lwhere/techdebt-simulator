import Phaser from 'phaser';
import { scaleOf } from '../config/layout';
import type { BossDef } from '../config/bosses';

/**
 * A stage-ending boss. Tap it to deal damage while it periodically attacks.
 * Sits near the top so it doesn't fight the action buttons for taps.
 */
export class Boss extends Phaser.GameObjects.Container {
  hitRadius = 0;
  private hp: number;
  private maxHp: number;
  private alive = true;
  private bobPhase = 0;
  private baseY: number;
  private face: Phaser.GameObjects.Text;
  private barBg: Phaser.GameObjects.Rectangle;
  private bar: Phaser.GameObjects.Rectangle;
  private barW: number;
  private onDefeat: (b: Boss) => void;

  constructor(scene: Phaser.Scene, x: number, y: number, def: BossDef, onDefeat: (b: Boss) => void) {
    super(scene, x, y);
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.baseY = y;
    this.onDefeat = onDefeat;

    const s = scaleOf(scene);
    const radius = 70 * s;
    this.barW = 200 * s;

    const glow = scene.add.circle(0, 0, radius + 10 * s, def.color, 0.22);
    const disc = scene.add.circle(0, 0, radius, def.color, 0.9);
    disc.setStrokeStyle(4 * s, 0xffffff, 0.9);
    this.face = scene.add.text(0, 0, def.emoji, { fontSize: `${Math.round(84 * s)}px` }).setOrigin(0.5);

    // HP bar + name BELOW the boss, so they clear the manager-quip zone up top.
    const barY = radius + 28 * s;
    this.barBg = scene.add.rectangle(0, barY, this.barW, 12 * s, 0x2a2a3a).setOrigin(0.5);
    this.bar = scene.add.rectangle(-this.barW / 2, barY, this.barW, 12 * s, 0xff3344).setOrigin(0, 0.5);
    const name = scene.add
      .text(0, barY + 20 * s, def.name, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: `${Math.round(15 * s)}px`,
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add([glow, disc, this.face, name, this.barBg, this.bar]);
    this.setDepth(600);
    this.setScale(0);
    this.hitRadius = radius + 20 * s;

    scene.add.existing(this);
    scene.tweens.add({ targets: this, scale: 1, duration: 320, ease: 'Back.Out' });
    scene.tweens.add({ targets: glow, scale: 1.18, alpha: 0.4, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
  }

  damage(amount = 1) {
    if (!this.alive) return;
    this.hp = Math.max(0, this.hp - amount);
    this.bar.width = this.barW * (this.hp / this.maxHp);

    // Hit feedback: a quick recoil + white flash.
    this.face.setScale(1.18);
    this.scene.tweens.add({ targets: this.face, scale: 1, duration: 120, ease: 'Quad.Out' });

    if (this.hp <= 0) this.die();
  }

  private die() {
    if (!this.alive) return;
    this.alive = false;
    this.onDefeat(this);
    this.scene.tweens.add({
      targets: this,
      scale: 0,
      angle: 220,
      alpha: 0,
      duration: 360,
      ease: 'Cubic.In',
      onComplete: () => this.destroy(),
    });
  }

  tick(dtMs: number) {
    if (!this.alive) return;
    this.bobPhase += dtMs / 520;
    this.y = this.baseY + Math.sin(this.bobPhase) * 10;
  }

  isAlive() {
    return this.alive;
  }

  hpFrac() {
    return this.maxHp > 0 ? this.hp / this.maxHp : 0;
  }
}
