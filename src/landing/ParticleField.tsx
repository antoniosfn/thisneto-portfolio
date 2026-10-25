"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import { loading } from "./loading";
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
    let firstFrames = 0;
    loadForms(abort.signal, loading.download)
      .then((forms) => {
        if (abort.signal.aborted) return;
        dispose = createParticleRenderer(
          canvas,
          () => (pinned === undefined ? controller.current : { progress: pinned }),
          forms,
        );
        // The loading screen lifts once the field has drawn (two frames: the
        // shaders are compiled and the first image is on screen).
        if (!dispose) return loading.finish();
        firstFrames = requestAnimationFrame(() => {
          firstFrames = requestAnimationFrame(() => loading.finish());
        });
      })
      .catch((error: unknown) => {
        if (abort.signal.aborted) return;
        canvas.dataset.renderer = "unavailable";
        console.error("Particle forms could not be loaded", error);
        // Content never waits on the field.
        loading.finish();
      });
    return () => {
      abort.abort();
      cancelAnimationFrame(firstFrames);
      dispose?.();
    };
  }, [controller]);
  return (
    <canvas className="particle-field" ref={canvasRef} aria-hidden="true" />
  );
}
