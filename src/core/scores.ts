/** Local best-score persistence (localStorage). No backend needed. */

export interface BestScore {
  distance: number;
  stage: number;
}

const KEY = 'tds_best';

export function loadBest(): BestScore {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const v = JSON.parse(raw) as Partial<BestScore>;
      return { distance: Math.max(0, v.distance ?? 0), stage: Math.max(0, v.stage ?? 0) };
    }
  } catch {
    /* ignore */
  }
  return { distance: 0, stage: 0 };
}

/**
 * Record a finished run. Returns the (possibly updated) best and whether this
 * run set a new distance record.
 */
export function submitScore(distance: number, stage: number): { best: BestScore; isRecord: boolean } {
  const prev = loadBest();
  const isRecord = distance > prev.distance;
  const best = isRecord ? { distance, stage } : prev;
  if (isRecord) {
    try {
      localStorage.setItem(KEY, JSON.stringify(best));
    } catch {
      /* ignore */
    }
  }
  return { best, isRecord };
}
