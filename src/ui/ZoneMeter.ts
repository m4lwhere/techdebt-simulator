import Phaser from 'phaser';
import { TUNING } from '../config/gameConfig';

// The track shows debt from 0 to 1.5× the sustainable line, so the danger zone
// past the line is visible. Band edges (as fractions of the track):
const DISPLAY_MULT = 1.5;
const GREEN_END = TUNING.SWEET_SPOT_LOW / DISPLAY_MULT; // ~0.37
const GOLD_END = 1 / DISPLAY_MULT; // ~0.67

/**
 * A debt gauge that lives right above the action buttons. A marker slides
 * across green (ship more) → gold (sweet spot) → red (pay down), so the
 * ship-vs-pay choice is read at a glance, next to your thumbs.
 */
export class ZoneMeter {
  private bands: Phaser.GameObjects.Graphics;
  private marker: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private left = 0;
  private cy = 0;
  private mw = 0;
  private mh = 0;
  private s = 1;

  constructor(scene: Phaser.Scene) {
    this.bands = scene.add.graphics().setDepth(150);
    this.marker = scene.add.graphics().setDepth(152);
    this.label = scene.add
      .text(0, 0, '', { fontFamily: 'system-ui, sans-serif', fontStyle: 'bold' })
      .setOrigin(0.5)
      .setDepth(151);
  }

  layout(W: number, H: number, s: number) {
    this.s = s;
    this.mw = W - 56 * s;
    this.left = (W - this.mw) / 2;
    this.cy = H - 190 * s;
    this.mh = 18 * s;
    const top = this.cy - this.mh / 2;

    this.bands.clear();
    this.bands.fillStyle(0x000000, 0.35);
    this.bands.fillRect(this.left, top, this.mw, this.mh);
    this.bands.fillStyle(0x2f9e57, 1); // green: ship more
    this.bands.fillRect(this.left, top, this.mw * GREEN_END, this.mh);
    this.bands.fillStyle(0xc79a2e, 1); // gold: sweet spot
    this.bands.fillRect(this.left + this.mw * GREEN_END, top, this.mw * (GOLD_END - GREEN_END), this.mh);
    this.bands.fillStyle(0xa83246, 1); // red: pay down
    this.bands.fillRect(this.left + this.mw * GOLD_END, top, this.mw * (1 - GOLD_END), this.mh);

    this.label.setPosition(W / 2, this.cy - 22 * s).setFontSize(Math.round(14 * s));
  }

  update(debt: number, sustainable: number, time: number) {
    const frac = Phaser.Math.Clamp(debt / (sustainable * DISPLAY_MULT), 0, 1);
    const s = this.s;
    const mx = this.left + frac * this.mw;
    const top = this.cy - this.mh / 2;

    this.marker.clear();
    this.marker.fillStyle(0xffffff, 1);
    this.marker.fillRect(mx - 2 * s, top - 6 * s, 4 * s, this.mh + 12 * s);
    this.marker.fillTriangle(mx - 7 * s, top - 8 * s, mx + 7 * s, top - 8 * s, mx, top + 3 * s);

    if (frac < GREEN_END) {
      this.label.setText('▸ SHIP MORE — debt is low').setColor('#5fe39a');
      this.label.setScale(1);
    } else if (frac <= GOLD_END) {
      this.label.setText('🔥 SWEET SPOT — keep shipping').setColor('#ffd23f');
      this.label.setScale(1);
    } else {
      this.label.setText('⚠ TOO RISKY — PAY DOWN').setColor('#ff6b6b');
      // Pulse to grab attention in the danger zone.
      this.label.setScale(1 + 0.06 * (0.5 + 0.5 * Math.sin(time / 120)));
    }
  }
}
