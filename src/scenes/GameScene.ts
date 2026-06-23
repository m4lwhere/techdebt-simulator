import Phaser from 'phaser';
import { TUNING } from '../config/gameConfig';
import { LEVELS } from '../config/levels';
import { BOSSES } from '../config/bosses';
import type { LevelConfig } from '../core/types';
import { DebtEngine } from '../core/DebtEngine';
import { Bug } from '../entities/Bug';
import { PowerUp } from '../entities/PowerUp';
import { Boss } from '../entities/Boss';
import { Hud } from '../ui/Hud';
import { scaleOf } from '../config/layout';
import { POWERUPS, pickPowerUpKind, type PowerUpKind } from '../config/powerups';
import {
  MANAGER_QUIPS,
  SQUASH_LINES,
  INCIDENT_LINES,
  SHIP_LINES,
  PAY_LINES,
  PROMOTION_LINES,
  BOSS_TAUNTS,
  pick,
} from '../config/flavor';
import { Juice, flash, shake, type BurstColor } from '../utils/juice';
import { sound } from '../audio/Sound';

const CAREER_BAR_COLOR = 0xffd23f;

interface RunStats {
  bugsSquashed: number;
  bugsExploded: number;
  peakDebt: number;
  levelReached: number;
}

interface ButtonRefs {
  rect: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
  onTap: (b: ButtonRefs) => void;
}

interface ActiveEffect {
  kind: PowerUpKind;
  endTime: number;
  duration: number;
  icon: Phaser.GameObjects.Text;
  barBg: Phaser.GameObjects.Rectangle;
  bar: Phaser.GameObjects.Rectangle;
  timer?: Phaser.Time.TimerEvent;
  onExpire?: () => void;
}

const BURST_BY_KIND: Record<PowerUpKind, BurstColor> = {
  coffee: 'orange',
  senior: 'blue',
  refactor: 'green',
  paste: 'orange',
  oracle: 'blue',
};

export class GameScene extends Phaser.Scene {
  private engine!: DebtEngine;
  private hud!: Hud;
  private juice!: Juice;
  private bugs!: Phaser.GameObjects.Group;
  private powerups!: Phaser.GameObjects.Group;
  private shipBtn!: ButtonRefs;
  private payBtn!: ButtonRefs;
  private W = 0;
  private H = 0;
  private s = 1;
  private levelIndex = 0;
  private bugAccumulator = 0;
  private quipTimer = 0;
  private powerupTimer = 0;
  private activeEffects: ActiveEffect[] = [];
  private frozen = false; // true during splashes/spinner — pauses the world
  private bossPhase = false;
  private boss?: Boss;
  private bossAttackTimer?: Phaser.Time.TimerEvent;
  private prevGoal = 0; // distance at which the current stage began
  private stats: RunStats = { bugsSquashed: 0, bugsExploded: 0, peakDebt: 0, levelReached: 0 };
  private gameOver = false;

  constructor() {
    super('Game');
  }

  create() {
    this.gameOver = false;
    this.frozen = false;
    this.bossPhase = false;
    this.boss = undefined;
    this.bossAttackTimer = undefined;
    this.prevGoal = 0;
    this.levelIndex = 0;
    this.bugAccumulator = 0;
    this.quipTimer = 2;
    this.powerupTimer = Phaser.Math.Between(5, 9);
    this.activeEffects = [];
    this.stats = { bugsSquashed: 0, bugsExploded: 0, peakDebt: 0, levelReached: 0 };

    this.W = this.scale.width;
    this.H = this.scale.height;
    this.s = scaleOf(this);

    // Crucial for a thumb-masher: without this Phaser tracks only ONE touch,
    // so tapping a bug while a thumb rests on a button is silently dropped.
    this.input.addPointer(3);

    // Re-anchor the layout if the viewport changes (address bar, rotation).
    this.scale.on('resize', this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () =>
      this.scale.off('resize', this.onResize, this),
    );

    const level = LEVELS[this.levelIndex];
    this.cameras.main.setBackgroundColor(level.bgColor);

    this.engine = new DebtEngine(level);
    this.juice = new Juice(this);
    this.hud = new Hud(this);
    this.hud.setLevel(level.name);
    this.bugs = this.add.group();
    this.powerups = this.add.group();

    this.buildButtons();

    // One manual hit-test for every tap (per finger). Buttons first, then the
    // nearest bug. This sidesteps Phaser's topOnly routing, which ate taps when
    // the bugs' big touch circles overlapped.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => this.handleTap(p.x, p.y));

    this.showBanner(level.name, level.tagline);
  }

  private handleTap(x: number, y: number) {
    if (this.gameOver || this.frozen) return;

    // Buttons win if the tap is inside one (they sit over the bottom strip).
    for (const btn of [this.shipBtn, this.payBtn]) {
      if (Phaser.Geom.Rectangle.Contains(btn.rect.getBounds(), x, y)) {
        btn.onTap(btn);
        this.tweens.add({ targets: [btn.rect, btn.text], scale: 0.9, duration: 60, yoyo: true });
        return;
      }
    }

    // The boss is a big target up top — tap it to damage it.
    if (this.bossPhase && this.boss && this.boss.isAlive()) {
      if (Phaser.Math.Distance.Between(x, y, this.boss.x, this.boss.y) <= this.boss.hitRadius) {
        this.boss.damage(1);
        sound.bossHit();
        this.juice.burst(x, y, 'orange', 6);
        return;
      }
    }

    // Power-ups next — rarer, more valuable, and they render above bugs.
    let perk: PowerUp | null = null;
    let perkDist = Infinity;
    (this.powerups.getChildren() as PowerUp[]).forEach((p) => {
      if (!p.isAlive()) return;
      const d = Phaser.Math.Distance.Between(x, y, p.x, p.y);
      if (d <= p.hitRadius && d < perkDist) {
        perk = p;
        perkDist = d;
      }
    });
    if (perk) {
      (perk as PowerUp).collect();
      return;
    }

    // Otherwise squash the bug whose center is nearest the tap (within its radius).
    let nearest: Bug | null = null;
    let nearestDist = Infinity;
    (this.bugs.getChildren() as Bug[]).forEach((bug) => {
      if (!bug.isAlive()) return;
      const d = Phaser.Math.Distance.Between(x, y, bug.x, bug.y);
      if (d <= bug.hitRadius && d < nearestDist) {
        nearest = bug;
        nearestDist = d;
      }
    });
    (nearest as Bug | null)?.squash();
  }

  private buildButtons() {
    // SHIP IT — fast, adds debt, kicks the can.
    this.shipBtn = this.makeButton(0xff9f43, '🚀\nSHIP IT', (b) => {
      this.engine.shipIt();
      sound.ship();
      this.juice.pop(b.rect.x, b.rect.y - 78 * this.s, `+${TUNING.SHIP_BURST}m`, '#ffd23f', 24);
      this.juice.burst(b.rect.x, b.rect.y, 'orange', 8);
      if (Math.random() < 0.28) {
        this.juice.pop(b.rect.x, b.rect.y - 120 * this.s, pick(SHIP_LINES), '#ff9f43', 13);
      }
    });

    // PAY IT DOWN — slow, no distance, drains debt + pressure.
    this.payBtn = this.makeButton(0x4a4a66, '🔧\nPAY DOWN', (b) => {
      this.engine.payDown();
      sound.pay();
      this.juice.pop(b.rect.x, b.rect.y - 78 * this.s, `-$${TUNING.PAY_AMOUNT}`, '#7a9aff', 22);
      this.juice.burst(b.rect.x, b.rect.y, 'blue', 6);
      if (Math.random() < 0.3) {
        this.juice.pop(b.rect.x, b.rect.y - 120 * this.s, pick(PAY_LINES), '#7a9aff', 13);
      }
    });

    this.layoutButtons();
  }

  private makeButton(color: number, label: string, onTap: (b: ButtonRefs) => void): ButtonRefs {
    const rect = this.add.rectangle(0, 0, 160 * this.s, 120 * this.s, color).setDepth(200);
    rect.setStrokeStyle(3 * this.s, 0xffffff, 0.4);
    const text = this.add
      .text(0, 0, label, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: `${Math.round(22 * this.s)}px`,
        color: '#ffffff',
        fontStyle: 'bold',
        align: 'center',
        lineSpacing: 4 * this.s,
      })
      .setOrigin(0.5)
      .setDepth(201);

    // No per-object input — the scene hit-tests everything in one handler.
    return { rect, text, onTap };
  }

  /** Anchor the two action buttons to the bottom of the current viewport. */
  private layoutButtons() {
    const y = this.H - 96 * this.s;
    this.shipBtn.rect.setPosition(this.W * 0.27, y);
    this.shipBtn.text.setPosition(this.W * 0.27, y);
    this.payBtn.rect.setPosition(this.W * 0.73, y);
    this.payBtn.text.setPosition(this.W * 0.73, y);
  }

  private onResize() {
    this.W = this.scale.width;
    this.H = this.scale.height;
    this.s = scaleOf(this);
    if (this.shipBtn) this.layoutButtons();
  }

  private showBanner(title: string, sub: string, subColor = '#ff9f43', yFactor = 0.4) {
    const banner = this.add
      .text(this.W / 2, this.H * yFactor, `${title}\n`, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: `${Math.round(30 * this.s)}px`,
        color: '#ffffff',
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(950);
    const subText = this.add
      .text(this.W / 2, this.H * yFactor + 34 * this.s, sub, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: `${Math.round(15 * this.s)}px`,
        color: subColor,
        align: 'center',
        wordWrap: { width: this.W - 60 * this.s },
        fontStyle: 'italic',
      })
      .setOrigin(0.5)
      .setDepth(950);

    this.tweens.add({
      targets: [banner, subText],
      alpha: 0,
      delay: 1800,
      duration: 600,
      onComplete: () => {
        banner.destroy();
        subText.destroy();
      },
    });
  }

  private spawnBug() {
    const x = Phaser.Math.Between(55 * this.s, this.W - 55 * this.s);
    const y = Phaser.Math.Between(180 * this.s, this.H - 210 * this.s);
    const bug = new Bug(this, x, y, {
      onSquash: (b) => {
        this.stats.bugsSquashed++;
        this.engine.squashBug();
        sound.squash();
        this.juice.burst(b.x, b.y, 'green', 12);
        this.juice.pop(b.x, b.y, pick(SQUASH_LINES), '#33d17a', 18);
      },
      onExplode: (b) => {
        this.stats.bugsExploded++;
        this.engine.bugExploded();
        sound.incident();
        this.juice.burst(b.x, b.y, 'red', 18);
        this.juice.pop(b.x, b.y, pick(INCIDENT_LINES), '#ff3344', 18);
        shake(this, 0.5);
        flash(this, 0xff3344, 120);
      },
    });
    this.bugs.add(bug);
  }

  private floatToast(text: string, color = '#ffffff', y = 168 * this.s) {
    const toast = this.add
      .text(this.W / 2, y, text, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: `${Math.round(14 * this.s)}px`,
        color,
        backgroundColor: '#2a2a3aee',
        padding: { x: 12 * this.s, y: 8 * this.s },
        align: 'center',
        wordWrap: { width: this.W - 60 * this.s },
      })
      .setOrigin(0.5, 0)
      .setDepth(700)
      .setAlpha(0);

    this.tweens.add({
      targets: toast,
      alpha: 1,
      y: y + 8 * this.s,
      duration: 300,
      hold: 2200,
      yoyo: true,
      onComplete: () => toast.destroy(),
    });
  }

  // --- Boss fights & progression -------------------------------------------

  /** Reaching the stage's distance goal summons that stage's boss. */
  private checkProgression() {
    if (this.bossPhase) return;
    if (this.engine.canDistance >= LEVELS[this.levelIndex].distanceGoal) this.enterBossPhase();
  }

  private enterBossPhase() {
    this.bossPhase = true;
    const def = BOSSES[this.levelIndex];
    // Banner sits lower so it doesn't collide with the boss or its HP bar.
    this.showBanner('⚠  BOSS INCOMING  ⚠', def.name, '#ff6b81', 0.62);
    shake(this, 0.7, 400);
    flash(this, 0xff3344, 200);
    this.boss = new Boss(this, this.W / 2, 320 * this.s, def, () => this.onBossDefeated());
    this.bossAttackTimer = this.time.addEvent({
      delay: def.attackInterval,
      loop: true,
      callback: () => this.bossAttack(def.attackBugs),
    });
  }

  private bossAttack(count: number) {
    if (!this.bossPhase || this.frozen) return;
    for (let i = 0; i < count; i++) {
      if (this.bugs.getLength() < TUNING.MAX_ACTIVE_BUGS) this.spawnBug();
    }
    shake(this, 0.35, 180);
    sound.bossAttack();
    // Taunts appear below the boss, clear of the manager-quip slot up top.
    const ty = (this.boss?.y ?? 320 * this.s) + 180 * this.s;
    this.floatToast(pick(BOSS_TAUNTS), '#ff9f9f', ty);
  }

  private onBossDefeated() {
    this.bossPhase = false;
    this.bossAttackTimer?.remove();
    this.bossAttackTimer = undefined;
    this.boss = undefined;
    sound.bossDefeat();
    shake(this, 0.9, 450);
    flash(this, 0xffffff, 220);
    this.juice.burst(this.W / 2, 250 * this.s, 'orange', 40);

    if (this.levelIndex >= LEVELS.length - 1) {
      this.win();
      return;
    }
    this.promote();
  }

  private promote() {
    this.prevGoal = LEVELS[this.levelIndex].distanceGoal;
    this.levelIndex++;
    this.stats.levelReached = this.levelIndex;
    const next = LEVELS[this.levelIndex];
    this.engine.setLevel(next);
    this.hud.setLevel(next.name);
    this.showPromotionSplash(next);
  }

  private showPromotionSplash(next: LevelConfig) {
    this.frozen = true;
    sound.promote();
    const cx = this.W / 2;
    const cy = this.H * 0.42;
    const s = this.s;
    const overlay: Phaser.GameObjects.GameObject[] = [];
    overlay.push(this.add.rectangle(cx, this.H / 2, this.W, this.H, 0x000000, 0.62).setDepth(2000));

    for (let r = 0; r < 3; r++) {
      const ring = this.add.circle(cx, cy, 50 * s);
      ring.setStrokeStyle(6 * s, CAREER_BAR_COLOR, 1);
      ring.isFilled = false;
      ring.setDepth(2000).setScale(0.3).setAlpha(0.9);
      overlay.push(ring);
      this.tweens.add({ targets: ring, scale: 3, alpha: 0, delay: r * 120, duration: 620, ease: 'Cubic.Out' });
    }

    const t1 = this.add
      .text(cx, this.H * 0.3, 'PROMOTED!', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: `${Math.round(40 * s)}px`,
        color: '#ffd23f',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(2001)
      .setScale(0);
    this.tweens.add({ targets: t1, scale: 1, duration: 320, ease: 'Back.Out' });

    const t2 = this.add
      .text(cx, cy, next.name, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: `${Math.round(26 * s)}px`,
        color: '#ffffff',
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(2001)
      .setAlpha(0);
    const t3 = this.add
      .text(cx, this.H * 0.5, pick(PROMOTION_LINES), {
        fontFamily: 'system-ui, sans-serif',
        fontSize: `${Math.round(15 * s)}px`,
        color: '#ffd23f',
        fontStyle: 'italic',
        align: 'center',
        wordWrap: { width: this.W - 60 * s },
      })
      .setOrigin(0.5)
      .setDepth(2001)
      .setAlpha(0);
    overlay.push(t1, t2, t3);
    this.tweens.add({ targets: [t2, t3], alpha: 1, duration: 220, delay: 160 });

    this.cameras.main.setBackgroundColor(next.bgColor);

    this.time.delayedCall(1300, () => {
      this.tweens.killTweensOf(overlay);
      overlay.forEach((o) => o.destroy());
      this.frozen = false;
      this.showBanner(next.name, next.tagline);
    });
  }

  private win() {
    this.gameOver = true;
    sound.victory();
    flash(this, 0xffffff, 500);
    shake(this, 1, 500);
    this.time.delayedCall(600, () => {
      this.scene.start('GameOver', {
        won: true,
        distance: Math.floor(this.engine.canDistance),
        ...this.stats,
      });
    });
  }

  // --- Power-ups -----------------------------------------------------------

  private spawnPowerUp() {
    if (this.powerups.getLength() >= 2) return;
    const kind = pickPowerUpKind();
    const x = Phaser.Math.Between(60 * this.s, this.W - 60 * this.s);
    const y = Phaser.Math.Between(210 * this.s, this.H - 240 * this.s);
    const perk = new PowerUp(this, x, y, kind, (p) => this.activatePowerUp(p.kind, p.x, p.y));
    this.powerups.add(perk);
  }

  private activatePowerUp(kind: PowerUpKind, x: number, y: number) {
    this.juice.burst(x, y, BURST_BY_KIND[kind], 18);
    sound.powerup();

    // Paste gets its own (longer) slot-machine reveal; everything else gets a
    // snappy 0.5s splash, then the effect fires.
    if (kind === 'paste') {
      this.openPasteSpinner();
      return;
    }
    this.showPerkSplash(kind, () => this.applyPerkEffect(kind));
  }

  /** A quick half-second freeze with a punchy card reveal for the perk. */
  private showPerkSplash(kind: PowerUpKind, onDone: () => void) {
    this.frozen = true;
    const def = POWERUPS[kind];
    const cx = this.W / 2;
    const cy = this.H * 0.44;

    const overlay: Phaser.GameObjects.GameObject[] = [];
    overlay.push(this.add.rectangle(cx, this.H / 2, this.W, this.H, 0x000000, 0.55).setDepth(2000));

    // Expanding rings in the perk colour.
    for (let r = 0; r < 2; r++) {
      const ring = this.add.circle(cx, cy, 60 * this.s);
      ring.setStrokeStyle(6 * this.s, def.color, 1);
      ring.isFilled = false;
      ring.setDepth(2000).setScale(0.3).setAlpha(0.9);
      overlay.push(ring);
      this.tweens.add({
        targets: ring,
        scale: 2.4,
        alpha: 0,
        delay: r * 90,
        duration: 460,
        ease: 'Cubic.Out',
      });
    }

    const big = this.add
      .text(cx, cy, def.emoji, { fontSize: `${Math.round(120 * this.s)}px` })
      .setOrigin(0.5)
      .setDepth(2001)
      .setScale(0);
    this.tweens.add({ targets: big, scale: { from: 0, to: 1.1 }, duration: 240, ease: 'Back.Out' });
    this.decorateSplash(kind, big, overlay, cx, cy);

    const name = this.add
      .text(cx, this.H * 0.58, def.name, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: `${Math.round(30 * this.s)}px`,
        color: '#ffffff',
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(2001)
      .setAlpha(0);
    const tag = this.add
      .text(this.W / 2, this.H * 0.64, def.tagline, {
        fontFamily: 'system-ui, sans-serif',
        fontSize: `${Math.round(15 * this.s)}px`,
        color: '#cfcfe0',
        fontStyle: 'italic',
        align: 'center',
        wordWrap: { width: this.W - 60 * this.s },
      })
      .setOrigin(0.5)
      .setDepth(2001)
      .setAlpha(0);
    overlay.push(big, name, tag);
    this.tweens.add({ targets: [name, tag], alpha: 1, duration: 160, delay: 110 });

    this.time.delayedCall(500, () => {
      this.tweens.killTweensOf(overlay);
      overlay.forEach((o) => o.destroy());
      this.frozen = false;
      onDone();
    });
  }

  /** Per-perk motion personality layered on top of the base reveal. */
  private decorateSplash(
    kind: PowerUpKind,
    big: Phaser.GameObjects.Text,
    overlay: Phaser.GameObjects.GameObject[],
    cx: number,
    cy: number,
  ) {
    const s = this.s;
    switch (kind) {
      case 'coffee': {
        // Caffeinated jitters.
        this.tweens.add({ targets: big, x: cx + 6 * s, duration: 45, yoyo: true, repeat: -1 });
        this.tweens.add({ targets: big, angle: 6, duration: 55, yoyo: true, repeat: -1 });
        break;
      }
      case 'senior': {
        // Heroic landing: rise into frame with a bright shockwave.
        big.setY(cy + 26 * s);
        this.tweens.add({ targets: big, y: cy, duration: 260, ease: 'Back.Out' });
        const shock = this.add.circle(cx, cy, 50 * s);
        shock.setStrokeStyle(8 * s, 0xffffff, 1);
        shock.isFilled = false;
        shock.setDepth(2000).setScale(0.4).setAlpha(0.9);
        overlay.push(shock);
        this.tweens.add({ targets: shock, scale: 3, alpha: 0, duration: 380, ease: 'Cubic.Out' });
        break;
      }
      case 'refactor': {
        // The recycle symbol spins; sparkles twinkle around it.
        this.tweens.add({ targets: big, angle: 360, duration: 650, repeat: -1, ease: 'Linear' });
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2;
          const spark = this.add
            .text(cx + Math.cos(a) * 95 * s, cy + Math.sin(a) * 95 * s, '✨', {
              fontSize: `${Math.round(26 * s)}px`,
            })
            .setOrigin(0.5)
            .setDepth(2001)
            .setScale(0);
          overlay.push(spark);
          this.tweens.add({
            targets: spark,
            scale: 1,
            duration: 200,
            delay: k * 50,
            yoyo: true,
            hold: 80,
            repeat: -1,
          });
        }
        break;
      }
      case 'oracle': {
        // Glitchy RGB-split flicker.
        const ghost = (tint: number) =>
          this.add
            .text(cx, cy, big.text, { fontSize: `${Math.round(120 * s)}px` })
            .setOrigin(0.5)
            .setDepth(2000)
            .setScale(1.1)
            .setAlpha(0.5)
            .setTint(tint);
        const ghostA = ghost(0x00e5ff);
        const ghostB = ghost(0xff2bd6);
        overlay.push(ghostA, ghostB);
        this.tweens.add({ targets: ghostA, x: cx - 6 * s, duration: 60, yoyo: true, repeat: -1 });
        this.tweens.add({ targets: ghostB, x: cx + 6 * s, duration: 50, yoyo: true, repeat: -1 });
        this.tweens.add({ targets: big, alpha: 0.4, duration: 70, yoyo: true, repeat: -1 });
        this.tweens.add({ targets: big, x: cx + 4 * s, duration: 40, yoyo: true, repeat: -1 });
        break;
      }
      case 'paste':
        break;
    }
  }

  private applyPerkEffect(kind: PowerUpKind) {
    switch (kind) {
      case 'coffee':
        this.engine.velocityMultiplier = 2;
        this.startEffect('coffee', 6000, {
          onExpire: () => {
            this.engine.velocityMultiplier = 1;
            this.engine.addPressure(0.06);
            this.juice.pop(this.W / 2, this.H * 0.5, 'CAFFEINE CRASH', '#ff6b81', 20);
          },
        });
        break;

      case 'senior':
        this.startEffect('senior', 6000, { interval: 450, onTick: () => this.autoSquashOne() });
        break;

      case 'oracle':
        this.startEffect('oracle', 5000, {
          interval: 260,
          onTick: () => {
            this.autoSquashOne();
            this.engine.reduceDebt(2);
            // It's cheap for a reason: occasionally hallucinates a fresh bug.
            if (Math.random() < 0.22 && this.bugs.getLength() < TUNING.MAX_ACTIVE_BUGS) {
              this.spawnBug();
            }
          },
          onExpire: () => this.juice.pop(this.W / 2, this.H * 0.42, 'RATE LIMITED', '#6c5ce7', 18),
        });
        break;

      case 'refactor':
        this.engine.relievePressure(0.55);
        this.engine.reduceDebt(this.engine.debt * 0.45);
        flash(this, 0x33d17a, 200);
        this.juice.burst(this.W / 2, this.H * 0.5, 'green', 28);
        this.juice.pop(this.W / 2, this.H * 0.5, 'CLEAN CODE!', '#33d17a', 22);
        break;

      case 'paste':
        break; // handled by the spinner
    }
  }

  /** Auto-fix one live incident (Senior Engineer / Oracle). */
  private autoSquashOne() {
    const bug = (this.bugs.getChildren() as Bug[]).find((b) => b.isAlive());
    bug?.squash();
  }

  private startEffect(
    kind: PowerUpKind,
    durationMs: number,
    opts: { interval?: number; onTick?: () => void; onExpire?: () => void },
  ) {
    const now = this.time.now;

    // Re-collecting the same perk just refreshes its timer.
    const existing = this.activeEffects.find((e) => e.kind === kind);
    if (existing) {
      existing.endTime = now + durationMs;
      existing.duration = durationMs;
      return;
    }

    const icon = this.add
      .text(0, 0, POWERUPS[kind].emoji, { fontSize: `${Math.round(22 * this.s)}px` })
      .setOrigin(0.5, 0)
      .setDepth(110);
    const barBg = this.add.rectangle(0, 0, 34 * this.s, 5 * this.s, 0x2a2a3a).setOrigin(0.5, 0).setDepth(110);
    const bar = this.add.rectangle(0, 0, 34 * this.s, 5 * this.s, POWERUPS[kind].color).setOrigin(0.5, 0).setDepth(111);

    const eff: ActiveEffect = {
      kind,
      endTime: now + durationMs,
      duration: durationMs,
      icon,
      barBg,
      bar,
      onExpire: opts.onExpire,
    };
    if (opts.interval && opts.onTick) {
      eff.timer = this.time.addEvent({ delay: opts.interval, loop: true, callback: opts.onTick });
    }
    this.activeEffects.push(eff);
    this.layoutEffects();
  }

  /** Lay the active-effect icons out in a row just under the HUD. */
  private layoutEffects() {
    const startX = 28 * this.s;
    const spacing = 46 * this.s;
    const topY = 156 * this.s;
    this.activeEffects.forEach((e, i) => {
      const x = startX + i * spacing;
      e.icon.setPosition(x, topY);
      e.barBg.setPosition(x, topY + 26 * this.s);
      e.bar.setPosition(x, topY + 26 * this.s);
    });
  }

  private expireEffect(eff: ActiveEffect) {
    eff.timer?.remove();
    eff.icon.destroy();
    eff.barBg.destroy();
    eff.bar.destroy();
    eff.onExpire?.();
  }

  private updateEffects() {
    if (this.activeEffects.length === 0) return;
    const now = this.time.now;
    let changed = false;
    for (let i = this.activeEffects.length - 1; i >= 0; i--) {
      const eff = this.activeEffects[i];
      const frac = Phaser.Math.Clamp((eff.endTime - now) / eff.duration, 0, 1);
      eff.bar.width = 34 * this.s * frac;
      if (frac <= 0) {
        this.expireEffect(eff);
        this.activeEffects.splice(i, 1);
        changed = true;
      }
    }
    if (changed) this.layoutEffects();
  }

  /** Stack Overflow Paste: a slot-machine spin between salvation and disaster. */
  private openPasteSpinner() {
    this.frozen = true;
    const fixAll = Math.random() < 0.5;

    const overlay: Phaser.GameObjects.GameObject[] = [];
    const dim = this.add.rectangle(this.W / 2, this.H / 2, this.W, this.H, 0x000000, 0.72).setDepth(2000);
    const title = this.add
      .text(this.W / 2, this.H * 0.33, '📋 PASTING FROM\nSTACK OVERFLOW…', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: `${Math.round(22 * this.s)}px`,
        color: '#f48024',
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(2001);
    const glyph = this.add
      .text(this.W / 2, this.H * 0.5, '❓', { fontSize: `${Math.round(96 * this.s)}px` })
      .setOrigin(0.5)
      .setDepth(2001);
    const sub = this.add
      .text(this.W / 2, this.H * 0.63, '', {
        fontFamily: 'system-ui, sans-serif',
        fontSize: `${Math.round(26 * this.s)}px`,
        color: '#ffffff',
        fontStyle: 'bold',
        align: 'center',
      })
      .setOrigin(0.5)
      .setDepth(2001);
    overlay.push(dim, title, glyph, sub);

    const faces = ['✅', '💀', '✅', '💀', '🍀', '🔥', '🎲'];
    const intervals = [50, 55, 65, 80, 100, 130, 170, 230, 320];
    let i = 0;

    const tick = () => {
      if (i >= intervals.length) {
        // Land on the outcome with a punch.
        glyph.setText(fixAll ? '✅' : '💀');
        this.tweens.add({ targets: glyph, scale: { from: 1.6, to: 1 }, duration: 220, ease: 'Back.Out' });
        sub.setText(fixAll ? 'FIX-ALL!' : 'DEBT DUMP!').setColor(fixAll ? '#33d17a' : '#ff3344');
        flash(this, fixAll ? 0x33d17a : 0xff3344, 200);
        if (fixAll) sound.spinWin();
        else {
          sound.spinLose();
          shake(this, 0.6, 300);
        }
        this.time.delayedCall(550, () => {
          overlay.forEach((o) => o.destroy());
          this.applyPasteOutcome(fixAll);
          this.frozen = false;
        });
        return;
      }
      glyph.setText(Phaser.Utils.Array.GetRandom(faces));
      sound.tick();
      this.time.delayedCall(intervals[i++], tick);
    };
    tick();
  }

  private applyPasteOutcome(fixAll: boolean) {
    if (fixAll) {
      (this.bugs.getChildren() as Bug[]).forEach((b) => b.isAlive() && b.squash());
      this.engine.relievePressure(0.6);
      this.engine.reduceDebt(this.engine.debt * 0.3);
      flash(this, 0x33d17a, 160);
      this.juice.pop(this.W / 2, this.H * 0.45, 'CTRL+V SAVES THE DAY', '#33d17a', 20);
    } else {
      this.engine.addDebt(this.engine.sustainableDebt * 0.55);
      this.engine.addPressure(0.32);
      shake(this, 0.8, 350);
      flash(this, 0xff3344, 200);
      this.juice.pop(this.W / 2, this.H * 0.45, 'IT WAS PYTHON 2 CODE', '#ff3344', 20);
    }
  }

  update(_time: number, deltaMs: number) {
    if (this.gameOver || this.frozen) return;
    const dt = deltaMs / 1000;

    const collapsed = this.engine.update(dt);
    this.stats.peakDebt = Math.max(this.stats.peakDebt, this.engine.debt);
    this.hud.update(this.engine.snapshot(), this.engine.inSweetSpot);

    // Top-edge bar: boss HP during a fight, otherwise progress to next stage.
    if (this.bossPhase && this.boss) {
      this.hud.setTopBar(this.boss.hpFrac(), 0xff3344, 'BOSS HP', '#ff6b6b');
    } else {
      const goal = LEVELS[this.levelIndex].distanceGoal;
      const denom = Math.max(1, goal - this.prevGoal);
      const frac = (this.engine.canDistance - this.prevGoal) / denom;
      this.hud.setTopBar(frac, CAREER_BAR_COLOR, `▸ NEXT BOSS ${Math.round(frac * 100)}%`, '#ffd23f');
    }

    // Spawn incidents at a debt-scaled rate, but never past the cap — an
    // unbounded swarm tanks the frame rate and that's what eats taps.
    this.bugAccumulator += this.engine.bugRate * dt;
    while (this.bugAccumulator >= 1) {
      this.bugAccumulator -= 1;
      if (this.bugs.getLength() < TUNING.MAX_ACTIVE_BUGS) this.spawnBug();
    }
    // Don't let the accumulator bank a giant backlog while we're at the cap.
    if (this.bugAccumulator > 2) this.bugAccumulator = 2;

    // Tick fuses.
    (this.bugs.getChildren() as Bug[]).forEach((b) => b.tick(deltaMs));

    // Power-ups: spawn on a timer, tick lifespans, update active-effect HUD.
    this.powerupTimer -= dt;
    if (this.powerupTimer <= 0) {
      this.powerupTimer = Phaser.Math.Between(7, 12);
      this.spawnPowerUp();
    }
    (this.powerups.getChildren() as PowerUp[]).forEach((p) => p.tick(deltaMs));
    this.boss?.tick(deltaMs);
    this.updateEffects();

    // Occasional manager interruption.
    this.quipTimer -= dt;
    if (this.quipTimer <= 0) {
      this.quipTimer = Phaser.Math.Between(6, 12);
      this.floatToast(pick(MANAGER_QUIPS));
    }

    this.checkProgression();

    if (collapsed) this.endRun();
  }

  private endRun() {
    this.gameOver = true;
    sound.gameOver();
    shake(this, 1, 500);
    flash(this, 0xff0000, 400);
    this.time.delayedCall(500, () => {
      this.scene.start('GameOver', {
        distance: Math.floor(this.engine.canDistance),
        ...this.stats,
      });
    });
  }
}
