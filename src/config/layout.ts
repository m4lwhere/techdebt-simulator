import Phaser from 'phaser';

/**
 * The world is rendered at full device pixel resolution (for crispness), so
 * coordinates are in PHYSICAL pixels, not CSS pixels. Everything is authored
 * against this reference width and multiplied by the scale factor below, which
 * keeps the layout identical across phones and pixel densities.
 */
export const BASE_W = 414;

/** Multiply any design-px value (calibrated at 414 wide) to get world px. */
export function scaleOf(scene: Phaser.Scene): number {
  return scene.scale.width / BASE_W;
}
