import Phaser from 'phaser';
import { scaleOf } from '../config/layout';
import { MENU_TAGLINES, pick } from '../config/flavor';
import { sound } from '../audio/Sound';

export class MenuScene extends Phaser.Scene {
  private s = 1;
  private W = 0;
  private H = 0;

  constructor() {
    super('Menu');
  }

  create() {
    const W = (this.W = this.scale.width);
    const H = (this.H = this.scale.height);
    const s = (this.s = scaleOf(this));
    const font = (px: number) => `${Math.round(px * s)}px`;
    this.cameras.main.setBackgroundColor(0x0d0d14);

    this.add
      .text(W / 2, H * 0.2, 'TECHNICAL\nDEBT', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: font(64),
        color: '#ffffff',
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5);

    this.add
      .text(W / 2, H * 0.34, 'S I M U L A T O R', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: font(22),
        color: '#ff9f43',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(W / 2, H * 0.45, 'Debt is leverage.\nShip fast, kick the can,\nride the line before it all collapses.', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: font(16),
        color: '#8a8aa0',
        align: 'center',
        lineSpacing: 6 * s,
      })
      .setOrigin(0.5);

    // Primary CTA — tap to start.
    const btn = this.add.rectangle(W / 2, H * 0.63, 240 * s, 72 * s, 0xff9f43).setOrigin(0.5);
    btn.setStrokeStyle(3 * s, 0xffffff);
    const btnText = this.add
      .text(W / 2, H * 0.63, 'SHIP IT 🚀', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: font(26),
        color: '#0d0d14',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    btn.setInteractive({ useHandCursor: true });
    btn.on('pointerdown', () => {
      sound.unlock();
      sound.start();
      this.tweens.add({
        targets: [btn, btnText],
        scale: 0.92,
        duration: 80,
        yoyo: true,
        onComplete: () => this.scene.start('Game'),
      });
    });

    this.tweens.add({
      targets: [btn, btnText],
      scale: 1.05,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.InOut',
    });

    // Small "What is this?" help button.
    const help = this.add
      .text(W / 2, H * 0.73, '❔  What is this?', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: font(15),
        color: '#9a9ab0',
        fontStyle: 'bold',
        backgroundColor: '#1a1c28',
        padding: { x: 14 * s, y: 9 * s },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    help.on('pointerdown', () => this.showHelp());

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

  private showHelp() {
    const { W, H, s } = this;
    const font = (px: number) => `${Math.round(px * s)}px`;
    const layer: Phaser.GameObjects.GameObject[] = [];

    // Dim that swallows taps so nothing behind reacts.
    const dim = this.add
      .rectangle(W / 2, H / 2, W, H, 0x0a0b12, 0.96)
      .setDepth(2000)
      .setInteractive();
    layer.push(dim);

    layer.push(
      this.add
        .text(W / 2, H * 0.1, 'HOW TO PLAY', {
          fontFamily: 'system-ui, sans-serif',
          fontSize: font(28),
          color: '#ff9f43',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(2001),
    );

    const body =
      "You're an engineer drowning in deadlines.\n" +
      'Kick the can as far as you can — distance is your score.\n\n' +
      '🚀  SHIP IT — race ahead fast, but pile on DEBT.\n' +
      '🔧  PAY DOWN — clear debt & danger, but no progress.\n\n' +
      'Plot twist: DEBT MAKES YOU FASTER. It’s leverage!\n' +
      'But it compounds. If the red COLLAPSE bar fills up,\n' +
      'it’s game over.\n\n' +
      'The gold bar at the top = progress to the next BOSS.\n\n' +
      '🐛  Tap bugs to squash them before they detonate.\n' +
      '🎁  Grab power-ups for a serious edge.\n' +
      '👹  Beat each stage’s boss to get promoted.\n\n' +
      'Pro move: carry as much debt as you dare —\nwithout collapsing. Ride the line.';

    layer.push(
      this.add
        .text(W / 2, H * 0.16, body, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: font(15),
          color: '#cfcfe0',
          align: 'left',
          lineSpacing: 5 * s,
          wordWrap: { width: W - 56 * s },
        })
        .setOrigin(0.5, 0)
        .setDepth(2001),
    );

    const close = this.add.rectangle(W / 2, H * 0.9, 200 * s, 60 * s, 0xff9f43).setDepth(2001);
    close.setStrokeStyle(3 * s, 0xffffff);
    const closeText = this.add
      .text(W / 2, H * 0.9, 'GOT IT', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: font(22),
        color: '#0d0d14',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(2002);
    layer.push(close, closeText);

    close.setInteractive({ useHandCursor: true });
    close.on('pointerdown', () => layer.forEach((o) => o.destroy()));
  }
}
