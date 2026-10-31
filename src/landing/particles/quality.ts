/**
 * Pixel ratio that keeps the field fluid. It starts at 1.5 at most, on every
 * screen: with 4× multisampling the soft particles look the same as at 2, for
 * ~44% fewer pixels through the bloom chain. It steps down while the
 * average frame stays above budget. It never steps back up, so the field
 * does not oscillate between sharp and soft.
 */
const STEPS = [2, 1.5, 1.25, 1] as const;
const BUDGET_MS = 19; // ~52 fps
const WINDOW = 90; // frames averaged before deciding
// A 50 Hz screen or a 30 fps power saver is slow by design, not by load:
// only step down when frames run this much slower than the best seen.
const SLOWDOWN = 1.3;

export class AdaptiveQuality {
  private samples = 0;
  private total = 0;
  private index: number;
  private best = Infinity;

  constructor(devicePixelRatio: number) {
    const start = Math.min(devicePixelRatio, 1.5);
    this.index = STEPS.findIndex((step) => step <= start + 1e-6);
    if (this.index < 0) this.index = STEPS.length - 1;
  }

  get ratio() {
    return STEPS[this.index];
  }

  /** Record one frame; true when the ratio just dropped. */
  sample(milliseconds: number) {
    // Long gaps are tab switches or hitches, not rendering cost.
    if (milliseconds > 100) return false;
    this.total += milliseconds;
    if (++this.samples < WINDOW) return false;
    const average = this.total / this.samples;
    this.samples = this.total = 0;
    this.best = Math.min(this.best, average);
    // `best` only counts as the display's cadence when it is itself near
    // budget; a GPU bound at 33 ms from the first frame is load, not cadence.
    const cadence = this.best <= BUDGET_MS * 1.15 ? this.best : BUDGET_MS;
    const budget = Math.max(BUDGET_MS, cadence * SLOWDOWN);
    if (average <= budget || this.index >= STEPS.length - 1) return false;
    this.index++;
    return true;
  }
}
