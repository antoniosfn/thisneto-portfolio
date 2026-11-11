/**
 * Loading progress of the particle field, shared by the field (which reports)
 * and the loading screen (which listens). Progress is honest: the forms file's
 * bytes as they arrive carry most of it, and the field's first frames the rest.
 */
type Listener = (progress: number, done: boolean) => void;

/** Share of the bar carried by the forms download; the first frames close it. */
export const DOWNLOAD_SHARE = 0.85;

/**
 * Integer label. The old counter was `String(n).padStart(3, "0")`, so 14%
 * was painted as 014 — easy to read as 0.14, and easy to mistake for a stall
 * when the number sat there.
 */
export function formatLoaderPercent(shown: number) {
  if (!Number.isFinite(shown)) return "1%";
  const value = Math.min(100, Math.max(1, Math.round(shown * 100)));
  return `${value}%`;
}

/** Monotonic. Unknown lengths (NaN) and backwards reports do not move the bar. */
export function nextDownloadProgress(current: number, fraction: number) {
  if (!Number.isFinite(fraction)) return current;
  const next = Math.min(1, Math.max(0, fraction)) * DOWNLOAD_SHARE;
  return Math.max(current, next);
}

let progress = 0;
let done = false;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener(progress, done));
}

export const loading = {
  /** Bytes of the forms file received, as a fraction (may be unknown: NaN). */
  download(fraction: number) {
    if (done) return;
    const next = nextDownloadProgress(progress, fraction);
    if (next === progress) return;
    progress = next;
    emit();
  },
  /** The field has drawn its first frames, or will never draw (no WebGL). */
  finish() {
    if (done) return;
    progress = 1;
    done = true;
    emit();
  },
  subscribe(listener: Listener) {
    listeners.add(listener);
    listener(progress, done);
    return () => {
      listeners.delete(listener);
    };
  },
};
