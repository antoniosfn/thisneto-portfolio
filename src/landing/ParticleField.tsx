"use client";

import { useEffect, useRef, type MutableRefObject } from "react";
import { createParticleRenderer } from "./particle-renderer";

export type ParticleController = {
  /** Dala's section progress f: section index + scrolled fraction of it. */
  progress: number;
};
export type MotionPreference = "system" | "full" | "reduced";

export default function ParticleField({
  controller,
  motionPreference = "system",
}: {
  controller: MutableRefObject<ParticleController>;
  motionPreference?: MotionPreference;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!canvasRef.current) return;
    return createParticleRenderer(
      canvasRef.current,
      () => controller.current,
      motionPreference,
    );
  }, [controller, motionPreference]);
  return (
    <canvas className="particle-field" ref={canvasRef} aria-hidden="true" />
  );
}
