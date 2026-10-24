"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import { loadForms } from "./particle-forms-file";
import { createParticleRenderer } from "./particle-renderer";

export type ParticleController = {
  /** Section progress f: stage index + scrolled fraction of it. */
  progress: number;
};

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
    let dispose: (() => void) | undefined;
    // The precomputed forms arrive before the field starts; content never waits.
    loadForms(abort.signal)
      .then((forms) => {
        if (abort.signal.aborted) return;
        dispose = createParticleRenderer(
          canvas,
          () => controller.current,
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
