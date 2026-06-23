import Phaser from 'phaser';
import { TUNING } from '../config/gameConfig';
import { scaleOf } from '../config/layout';

const BUG_EMOJI = ['🐛', '🔥', '💣', '⚠️', '🧟', '👾'];

/**
 * An incident spawned by debt. Tap it to squash; ignore it and the fuse runs
 * out, detonating into more debt + collapse pressure.
 */
export class Bug extends Phaser.GameObjects.Container {
  /** Tap radius, used by the scene's manual hit-test. */
  hitRadius = 0;
  private fuseStrokeWidth = 4;
  private fuse: Phaser.GameObjects.Arc;
  private fuseTotal = TUNING.BUG_FUSE_MS;
  private fuseLeft = TUNING.BUG_FUSE_MS;
  private alive = true;
  private onSquash: (b: Bug) => void;
  private onExplode: (b: Bug) => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    handlers: { onSquash: (b: Bug) => void; onExplode: (b: Bug) => void },
  ) {
    super(scene, x, y);
    this.onSquash = handlers.onSquash;
    this.onExplode = handlers.onExplode;

    const s = scaleOf(scene);
    const radius = 44 * s;
    const ring = scene.add.circle(0, 0, radius + 6 * s, 0x000000, 0.35);
    this.fuse = scene.add.arc(0, 0, radius + 3 * s, -90, 270, false, 0xff5566, 1);
    this.fuse.setStrokeStyle(5 * s, 0xff5566);
    this.fuse.isFilled = false;
    const glyph = BUG_EMOJI[Phaser.Math.Between(0, BUG_EMOJI.length - 1)];
    const label = scene.add.text(0, 0, glyph, { fontSize: `${Math.round(60 * s)}px` }).setOrigin(0.5);

    this.add([ring, this.fuse, label]);
    this.setSize(radius * 2 + 12 * s, radius * 2 + 12 * s);
    this.setDepth(500);
    this.setScale(0);

    // Generous touch target — much bigger than the glyph so fat thumbs land.
    // The scene hit-tests against this manually (no Phaser per-object input,
    // which mis-routes taps when these big circles overlap).
    this.hitRadius = radius + 26 * s;
    this.fuseStrokeWidth = 4 * s;

    scene.add.existing(this);
    scene.tweens.add({ targets: this, scale: 1, duration: 180, ease: 'Back.Out' });
  }

  /** Squash this bug. Safe to call repeatedly — guarded by the alive flag. */
  squash() {
    if (!this.alive) return;
    this.alive = false;
    this.onSquash(this);
    this.scene.tweens.add({
      targets: this,
      scale: 0,
      angle: 180,
      duration: 140,
      ease: 'Cubic.In',
      onComplete: () => this.destroy(),
    });
  }

  /** Called from the scene's update loop. dtMs in milliseconds. */
  tick(dtMs: number) {
    if (!this.alive) return;
    this.fuseLeft -= dtMs;
    const frac = Phaser.Math.Clamp(this.fuseLeft / this.fuseTotal, 0, 1);
    // Shrink the arc as the fuse burns down; redder + wobblier near the end.
    this.fuse.setEndAngle(-90 + 360 * frac);
    if (frac < 0.35) {
      this.fuse.setStrokeStyle(this.fuseStrokeWidth, 0xffaa00);
      this.angle = Math.sin(this.scene.time.now / 40) * 6;
    }
    if (this.fuseLeft <= 0) this.explode();
  }

  private explode() {
    if (!this.alive) return;
    this.alive = false;
    this.onExplode(this);
    this.destroy();
  }

  isAlive() {
    return this.alive;
  }
}
