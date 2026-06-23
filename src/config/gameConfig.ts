/** Global tuning knobs. Tweak these to balance the whole game. */
export const TUNING = {
  // Design resolution (portrait, iPhone-ish). Scale.FIT handles the rest.
  WIDTH: 414,
  HEIGHT: 896,

  // --- Velocity & the can ---
  // Debt literally makes you faster — that's the whole joke. You ship on borrowed time.
  BASE_VELOCITY: 18, // can-distance/sec with zero debt (a crawl)
  VELOCITY_PER_DEBT: 0.9, // each $ of debt adds this much velocity

  // --- SHIP IT ---
  SHIP_DEBT: 6, // debt added per ship
  SHIP_BURST: 14, // instant can-distance kick per ship

  // --- PAY IT DOWN ---
  PAY_AMOUNT: 9, // debt removed per tap (slow, no distance gained)
  PAY_PRESSURE_RELIEF: 0.12, // collapse pressure drained per paydown

  // --- Bugs (incidents spawned by debt) ---
  BUG_RATE_PER_DEBT: 0.012, // extra bugs/sec per $ of debt
  MAX_ACTIVE_BUGS: 12, // hard cap so chaos can't drown the frame rate (and your taps)
  BUG_FUSE_MS: 3200, // time before an un-squashed bug detonates
  BUG_EXPLODE_DEBT: 5, // debt added when a bug detonates
  BUG_EXPLODE_PRESSURE: 0.18, // collapse pressure added when a bug detonates
  BUG_SQUASH_RELIEF: 0.04, // pressure drained per squash

  // --- Collapse pressure ---
  // Rises when debt exceeds the stage's sustainable line (interest > what you can service).
  PRESSURE_GAIN: 0.22, // per sec, scaled by how far over the line you are
  PRESSURE_DECAY: 0.05, // per sec when debt is under the line

  // --- Sweet spot (for the leverage meter / scoring feel) ---
  // You're rewarded for living JUST under the collapse line, not for being clean.
  SWEET_SPOT_LOW: 0.55, // fraction of sustainableDebt where the bonus zone starts
} as const;
