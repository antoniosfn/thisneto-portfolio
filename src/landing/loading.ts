/**
 * Loading progress of the particle field, shared by the field (which reports)
 * and the loading screen (which listens). Progress is honest: the forms file's
 * bytes as they arrive carry most of it, and the field's first frames the rest.
 */
type Listener = (progress: number, done: boolean) => void;

/** Share of the bar carried by the forms download; the first frames close it. */
const DOWNLOAD_SHARE = 0.85;

let progress = 0;
let done = false;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener(progress, done));
}

export const loading = {
  /** Bytes of the forms file received, as a fraction (may be unknown: NaN). */
  download(fraction: number) {
    if (done || !Number.isFinite(fraction)) return;
    progress = Math.max(progress, Math.min(1, fraction) * DOWNLOAD_SHARE);
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
