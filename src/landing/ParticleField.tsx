"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import { loadForms } from "./particles/forms-file";
import { createParticleRenderer } from "./particles/renderer";

export type ParticleController = {
  /** Section progress f: stage index + scrolled fraction of it. */
  progress: number;
};

/** Review aid: `?f=10.5` pins the field at that section progress. */
function pinnedProgress() {
  const value = Number(new URLSearchParams(location.search).get("f"));
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

export default function ParticleField({
  controller,
}: {
  controller: MutableRefObject<ParticleController>;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const abort = new AbortController();
    const pinned = pinnedProgress();
    let dispose: (() => void) | undefined;
    // The precomputed forms arrive before the field starts; content never waits.
    loadForms(abort.signal)
      .then((forms) => {
        if (abort.signal.aborted) return;
        dispose = createParticleRenderer(
          canvas,
          () => (pinned === undefined ? controller.current : { progress: pinned }),
          forms,
        );
      })
      .catch((error: unknown) => {
        if (abort.signal.aborted) return;
        canvas.dataset.renderer = "unavailable";
        console.error("Particle forms could not be loaded", error);
      });
    return () => {
      abort.abort();
      dispose?.();
    };
  }, [controller]);
  return (
    <canvas className="particle-field" ref={canvasRef} aria-hidden="true" />
  );
}
