import Phaser from 'phaser';
import { scaleOf } from '../config/layout';
import type { EngineSnapshot } from '../core/types';

/** Top-of-screen readout: can distance, debt, interest, and the collapse bar. */
export class Hud {
  private W: number;
  private s: number;
  private distanceText: Phaser.GameObjects.Text;
  private debtText: Phaser.GameObjects.Text;
  private interestText: Phaser.GameObjects.Text;
  private levelText: Phaser.GameObjects.Text;
  private barFill: Phaser.GameObjects.Rectangle;
  private topBarFill: Phaser.GameObjects.Rectangle;
  private topBarLabel: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    const W = scene.scale.width;
    const s = scaleOf(scene);
    this.W = W;
    this.s = s;

    const font = (px: number) => `${Math.round(px * s)}px`;

    scene.add.rectangle(0, 0, W, 150 * s, 0x000000, 0.25).setOrigin(0, 0).setDepth(100);

    // Top-edge progress bar: career progress to the next stage (or boss HP).
    scene.add.rectangle(0, 0, W, 7 * s, 0x000000, 0.5).setOrigin(0, 0).setDepth(104);
    this.topBarFill = scene.add.rectangle(0, 0, 0, 7 * s, 0xffd23f).setOrigin(0, 0).setDepth(105);
    this.topBarLabel = scene.add
      .text(W - 8 * s, 9 * s, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: font(10),
        color: '#ffd23f',
        fontStyle: 'bold',
      })
      .setOrigin(1, 0)
      .setDepth(106);

    this.levelText = scene.add
      .text(W / 2, 14 * s, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: font(13),
        color: '#8a8aa0',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0)
      .setDepth(101);

    scene.add
      .text(W / 2, 34 * s, 'CAN KICKED', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: font(11),
        color: '#6a6a80',
      })
      .setOrigin(0.5, 0)
      .setDepth(101);

    this.distanceText = scene.add
      .text(W / 2, 48 * s, '0 m', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: font(34),
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0)
      .setDepth(101);

    this.debtText = scene.add
      .text(14 * s, 96 * s, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: font(15),
        color: '#ff9f43',
        fontStyle: 'bold',
      })
      .setOrigin(0, 0)
      .setDepth(101);

    this.interestText = scene.add
      .text(W - 14 * s, 96 * s, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: font(15),
        color: '#ff6b81',
        fontStyle: 'bold',
      })
      .setOrigin(1, 0)
      .setDepth(101);

    // COLLAPSE bar.
    scene.add
      .rectangle(14 * s, 128 * s, W - 28 * s, 12 * s, 0x2a2a3a)
      .setOrigin(0, 0)
      .setDepth(101);
    this.barFill = scene.add
      .rectangle(14 * s, 128 * s, 0, 12 * s, 0x33d17a)
      .setOrigin(0, 0)
      .setDepth(102);
    scene.add
      .text(W / 2, 129 * s, 'COLLAPSE RISK', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: font(9),
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0)
      .setDepth(103);
  }

  setLevel(name: string) {
    this.levelText.setText(name);
  }

  /** Drive the top-edge bar: frac 0..1, a color, and a caption explaining it. */
  setTopBar(frac: number, color: number, label: string, labelCss: string) {
    this.topBarFill.width = this.W * Phaser.Math.Clamp(frac, 0, 1);
    this.topBarFill.setFillStyle(color);
    this.topBarLabel.setText(label).setColor(labelCss);
  }

  update(s: EngineSnapshot) {
    this.distanceText.setText(`${Math.floor(s.canDistance)} m`);
    this.debtText.setText(`DEBT  $${Math.floor(s.debt)}`);
    this.interestText.setText(`INTEREST  ${(s.interestRate * 100).toFixed(0)}%/s`);

    this.barFill.width = (this.W - 28 * this.s) * s.pressure;
    // Green when safe, amber as it climbs, red near collapse.
    const color = s.pressure > 0.75 ? 0xff3344 : s.pressure > 0.4 ? 0xffaa00 : 0x33d17a;
    this.barFill.setFillStyle(color);
  }
}
