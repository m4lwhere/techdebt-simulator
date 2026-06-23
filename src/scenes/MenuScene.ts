import Phaser from 'phaser';
import { scaleOf } from '../config/layout';
import { MENU_TAGLINES, pick } from '../config/flavor';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('Menu');
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    const s = scaleOf(this);
    const font = (px: number) => `${Math.round(px * s)}px`;
    this.cameras.main.setBackgroundColor(0x0d0d14);

    this.add
      .text(W / 2, H * 0.22, 'TECHNICAL\nDEBT', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: font(64),
        color: '#ffffff',
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5);

    this.add
      .text(W / 2, H * 0.36, 'S I M U L A T O R', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: font(22),
        color: '#ff9f43',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(W / 2, H * 0.47, 'Debt is leverage.\nShip fast, kick the can,\nride the line before it all collapses.', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: font(16),
        color: '#8a8aa0',
        align: 'center',
        lineSpacing: 6 * s,
      })
      .setOrigin(0.5);

    // Big tap target.
    const btn = this.add.rectangle(W / 2, H * 0.66, 240 * s, 72 * s, 0xff9f43).setOrigin(0.5);
    btn.setStrokeStyle(3 * s, 0xffffff);
    const btnText = this.add
      .text(W / 2, H * 0.66, 'SHIP IT 🚀', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: font(26),
        color: '#0d0d14',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.input.once('pointerdown', () => {
      this.tweens.add({
        targets: [btn, btnText],
        scale: 0.92,
        duration: 80,
        yoyo: true,
        onComplete: () => this.scene.start('Game'),
      });
    });

    // Idle pulse so it reads as tappable.
    this.tweens.add({
      targets: [btn, btnText],
      scale: 1.05,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    this.add
      .text(W / 2, H * 0.86, pick(MENU_TAGLINES), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: font(12),
        color: '#5a5a70',
        fontStyle: 'italic',
        align: 'center',
        wordWrap: { width: W - 40 * s },
      })
      .setOrigin(0.5);
  }
}
