import Phaser from 'phaser';

/** Generates the handful of textures we need so the game ships with zero assets. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create() {
    // A white dot for particle bursts. Rendered large so it stays crisp when
    // the world runs at full device resolution.
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(16, 16, 16);
    g.generateTexture('spark', 32, 32);
    g.destroy();

    // Persistent tap-ripple overlay that survives scene changes, kept on top.
    this.scene.launch('TapFX');
    this.scene.start('Menu');
    this.scene.bringToTop('TapFX');
  }
}
