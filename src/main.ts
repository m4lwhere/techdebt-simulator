import Phaser from 'phaser';
import { sound } from './audio/Sound';
import { BootScene } from './scenes/BootScene';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';
import { GameOverScene } from './scenes/GameOverScene';
import { TapFXScene } from './scenes/TapFXScene';

// Cap DPR at 3 — past that the extra pixels cost FPS for no visible gain.
const dpr = Math.min(window.devicePixelRatio || 1, 3);

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  backgroundColor: '#0d0d14',
  scale: {
    // Render the canvas BUFFER at full device resolution so nothing is fuzzy.
    // baseSize is in physical px; the canvas is then displayed at CSS size.
    // Scenes lay out against this.scale.width via config/layout.ts.
    mode: Phaser.Scale.NONE,
    width: Math.round(window.innerWidth * dpr),
    height: Math.round(window.innerHeight * dpr),
    zoom: 1 / dpr,
  },
  fps: { target: 60, min: 30 },
  render: { antialias: true, powerPreference: 'high-performance' },
  scene: [BootScene, MenuScene, GameScene, GameOverScene, TapFXScene],
};

const game = new Phaser.Game(config);

// Keep the buffer at physical resolution and the canvas at CSS size, tracking
// the real visible viewport (the address bar resize that 'resize' often misses).
const app = document.getElementById('app')!;
function fitToViewport() {
  const vv = window.visualViewport;
  const cssW = vv ? vv.width : window.innerWidth;
  const cssH = vv ? vv.height : window.innerHeight;

  app.style.width = `${cssW}px`;
  app.style.height = `${cssH}px`;

  game.scale.resize(Math.round(cssW * dpr), Math.round(cssH * dpr));

  // Display the high-res buffer at CSS size (crisp on retina).
  const canvas = game.canvas;
  if (canvas) {
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
  }
  game.scale.refresh();
}

window.visualViewport?.addEventListener('resize', fitToViewport);
window.visualViewport?.addEventListener('scroll', fitToViewport);
window.addEventListener('resize', fitToViewport);
window.addEventListener('orientationchange', () => setTimeout(fitToViewport, 200));
fitToViewport();

// Audio must start inside a user gesture on mobile — unlock on first touch.
// Listen broadly so whichever gesture event fires first does the unlock.
const unlock = () => sound.unlock();
window.addEventListener('pointerdown', unlock, { passive: true });
window.addEventListener('touchend', unlock, { passive: true });
window.addEventListener('keydown', unlock);

// Always-available mute toggle (persisted in localStorage).
const muteBtn = document.getElementById('mute-btn');
if (muteBtn) {
  const render = () => (muteBtn.textContent = sound.muted ? '🔇' : '🔊');
  render();
  muteBtn.addEventListener('click', () => {
    sound.unlock();
    sound.toggleMute();
    render();
  });
}
