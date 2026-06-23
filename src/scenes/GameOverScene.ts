import Phaser from 'phaser';
import { scaleOf } from '../config/layout';
import { LEVELS } from '../config/levels';
import { VERDICTS, pick } from '../config/flavor';

interface GameOverData {
  distance: number;
  bugsSquashed: number;
  bugsExploded: number;
  peakDebt: number;
  levelReached: number;
  won?: boolean;
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOver');
  }

  create(data: GameOverData) {
    const W = this.scale.width;
    const H = this.scale.height;
    const s = scaleOf(this);
    const font = (px: number) => `${Math.round(px * s)}px`;
    this.cameras.main.setBackgroundColor(0x180a0a);

    const won = !!data.won;
    if (won) this.cameras.main.setBackgroundColor(0x0a160a);

    this.add.text(W / 2, H * 0.16, won ? '🏆' : '💥', { fontSize: font(72) }).setOrigin(0.5);
    this.add
      .text(W / 2, H * 0.27, won ? 'YOU SHIPPED IT' : 'TOTAL COLLAPSE', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: font(34),
        color: won ? '#33d17a' : '#ff3344',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(W / 2, H * 0.35, won ? 'PROMOTED TO CTO' : 'INCIDENT POST-MORTEM', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: font(13),
        color: '#8a8aa0',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const reached = LEVELS[data.levelReached]?.name ?? LEVELS[0].name;
    const rows = [
      ['Can kicked', `${data.distance} m`],
      ['Career stage', reached],
      ['Peak debt', `$${Math.floor(data.peakDebt)}`],
      ['Bugs squashed', `${data.bugsSquashed}`],
      ['Prod incidents', `${data.bugsExploded}`],
    ];
    rows.forEach(([k, v], i) => {
      const y = H * 0.42 + i * 30 * s;
      this.add
        .text(W * 0.18, y, k, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: font(16),
          color: '#9a9ab0',
        })
        .setOrigin(0, 0.5);
      this.add
        .text(W * 0.82, y, v, {
          fontFamily: 'system-ui, sans-serif',
          fontSize: font(16),
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(1, 0.5);
    });

    this.add
      .text(
        W / 2,
        H * 0.65,
        won ? 'You survived every stage. The debt is now load-bearing.' : pick(VERDICTS),
        {
          fontFamily: 'system-ui, sans-serif',
          fontSize: font(14),
          color: '#ff9f43',
          fontStyle: 'italic',
          align: 'center',
          wordWrap: { width: W - 60 * s },
        },
      )
      .setOrigin(0.5);

    const btn = this.add.rectangle(W / 2, H * 0.8, 240 * s, 68 * s, 0xff9f43).setOrigin(0.5);
    btn.setStrokeStyle(3 * s, 0xffffff);
    const btnText = this.add
      .text(W / 2, H * 0.8, 'SHIP AGAIN 🚀', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: font(24),
        color: '#0d0d14',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const hint = this.add
      .text(W / 2, H * 0.89, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: font(12),
        color: '#5a5a70',
        align: 'center',
      })
      .setOrigin(0.5);

    // Arm the restart only AFTER a beat — otherwise a still-frenzied thumb
    // instantly restarts before you even read the post-mortem.
    [btn, btnText].forEach((o) => o.setAlpha(0.35));
    hint.setText('reading the post-mortem…');

    this.time.delayedCall(1100, () => {
      [btn, btnText].forEach((o) => o.setAlpha(1));
      hint.setText('tap anywhere to start a fresh codebase\n(it will end the same way)');
      this.tweens.add({
        targets: [btn, btnText],
        scale: 1.05,
        duration: 700,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      });
      this.input.once('pointerdown', () => this.scene.start('Game'));
    });
  }
}
