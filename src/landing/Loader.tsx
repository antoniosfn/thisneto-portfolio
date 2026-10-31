"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { loading } from "./loading";
import { bookStrokes } from "./loader-book";

gsap.registerPlugin(useGSAP);

const FRAGMENTS = 900;
const MIN_VISIBLE_MS = 1200;
const FAILSAFE_MS = 12000;
type Phase = "loading" | "compressing" | "revealing" | "gone";
type Fragment = {
  target: [number, number];
  start: [number, number];
  color: string;
  size: number;
  turn: number;
  phase: number;
  threshold: number;
};

function hash(i: number, salt: number) {
  const v = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

/** Point at arc-length fraction t of a polyline. */
function along(points: [number, number][], t: number): [number, number] {
  const lengths = points
    .slice(1)
    .map(([x, y], k) => Math.hypot(x - points[k][0], y - points[k][1]));
  let d = t * lengths.reduce((a, b) => a + b, 0);
  for (let k = 0; k < lengths.length; k++) {
    if (d <= lengths[k] || k === lengths.length - 1) {
      const u = lengths[k] ? Math.min(1, d / lengths[k]) : 0;
      const [ax, ay] = points[k],
        [bx, by] = points[k + 1];
      return [ax + (bx - ax) * u, ay + (by - ay) * u];
    }
    d -= lengths[k];
  }
  return points[points.length - 1];
}

function createFragments(): Fragment[] {
  const strokes = bookStrokes();
  const total = strokes.reduce((n, p) => n + p.weight, 0);
  return Array.from({ length: FRAGMENTS }, (_, i) => {
    let pick = hash(i, 1) * total,
      stroke = strokes[0];
    for (const p of strokes) {
      stroke = p;
      if ((pick -= p.weight) <= 0) break;
    }
    const [x, y] = along(stroke.points, hash(i, 2));
    const angle = hash(i, 6) * Math.PI * 2;
    const reach = 0.45 + 0.6 * hash(i, 7);
    return {
      target: [x, y],
      start: [Math.cos(angle) * reach, Math.sin(angle) * reach],
      color: stroke.color,
      size: 0.35 + 0.65 * hash(i, 8) ** 2,
      turn: hash(i, 9) * Math.PI * 2,
      phase: hash(i, 10) * Math.PI * 2,
      // The spine forms first, then pages and their outer edges.
      threshold: Math.min(
        0.9,
        (Math.abs(x - 12) / 12) * 0.7 + hash(i, 11) * 0.2,
      ),
    };
  });
}

const easeOut = (t: number) => 1 - (1 - t) ** 3;

export default function Loader() {
  const overlayRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const [phase, setPhase] = useState<Phase>("loading");

  useGSAP(
    (_context, contextSafe) => {
      const overlay = overlayRef.current;
      const canvas = canvasRef.current;
      if (!overlay || !canvas || !contextSafe) return;
      // The counter and exit also work if a 2D canvas is unavailable.
      const context = canvas.getContext("2d");
      const fragments = createFragments();
      const mounted = performance.now();
      document.documentElement.classList.add("is-loading");
      let target = 0,
        shown = 0,
        last = mounted;
      let finished = false,
        leaving = false,
        disposed = false,
        frame = 0;
      const unsubscribe = loading.subscribe((progress, done) => {
        target = progress;
        finished = done;
      });
      const failsafe = window.setTimeout(() => loading.finish(), FAILSAFE_MS);
      const beginExit = contextSafe(() => {
        leaving = true;
        setPhase("compressing");
        // Keep the black veil opaque until the book has collapsed to its centre.
        gsap
          .timeline({
            onComplete: () => {
              disposed = true;
              cancelAnimationFrame(frame);
              window.clearTimeout(failsafe);
              unsubscribe();
              document.documentElement.classList.remove("is-loading");
              setPhase("gone");
            },
          })
          .addLabel("compress", 0.15)
          .to(
            canvas,
            { scale: 0.012, opacity: 0, duration: 0.65, ease: "expo.inOut" },
            "compress",
          )
          .to(
            ".site-loader-name, .site-loader-count",
            { opacity: 0, duration: 0.25 },
            0,
          )
          .addLabel("reveal", 0.8)
          .call(() => setPhase("revealing"), [], "reveal")
          .to(
            overlay,
            { opacity: 0, duration: 0.95, ease: "power2.inOut" },
            "reveal",
          );
      });

      const draw = () => {
        if (disposed) return;
        const now = performance.now();
        // Follow real progress smoothly, independent of refresh rate.
        shown += (target - shown) * (1 - 0.92 ** ((now - last) / 16.667));
        last = now;
        if (target - shown < 0.002) shown = target;
        if (counterRef.current)
          counterRef.current.textContent = String(
            Math.round(shown * 100),
          ).padStart(3, "0");
        if (
          finished &&
          shown >= 0.999 &&
          now - mounted > MIN_VISIBLE_MS &&
          !leaving
        )
          beginExit();

        if (context) {
          const width = canvas.clientWidth,
            height = canvas.clientHeight;
          const ratio = Math.min(devicePixelRatio || 1, 2);
          if (
            canvas.width !== Math.round(width * ratio) ||
            canvas.height !== Math.round(height * ratio)
          ) {
            canvas.width = Math.round(width * ratio);
            canvas.height = Math.round(height * ratio);
          }
          context.setTransform(ratio, 0, 0, ratio, 0, 0);
          context.clearRect(0, 0, width, height);
          const bookSize = Math.min(340, width * 0.7, height * 0.48);
          const unit = bookSize / 24;
          const cx = (width - bookSize) / 2,
            cy = (height - bookSize) / 2;
          const span = Math.max(width, height),
            time = now / 1000;
          context.lineWidth = 0.8;
          for (const f of fragments) {
            const t = easeOut(
              Math.min(1, Math.max(0, (shown - f.threshold) / 0.1)),
            );
            if (t <= 0) continue;
            const tx =
              cx + f.target[0] * unit + Math.sin(time * 0.9 + f.phase) * 0.25;
            const ty =
              cy + f.target[1] * unit + Math.cos(time * 0.7 + f.phase) * 0.25;
            const sx = width / 2 + f.start[0] * span,
              sy = height / 2 + f.start[1] * span;
            const x = sx + (tx - sx) * t,
              y = sy + (ty - sy) * t;
            const size = (1.4 + 2.4 * f.size) * (1 - 0.35 * (1 - t));
            const angle = f.turn * (1 - t) + time * 0.15 * (1 - t * 0.8);
            context.globalAlpha = Math.min(1, t * 1.6);
            context.strokeStyle = f.color;
            context.beginPath();
            for (let k = 0; k < 3; k++) {
              const a = angle + (k * Math.PI * 2) / 3;
              const px = x + Math.cos(a) * size * 0.58,
                py = y + Math.sin(a) * size * 0.58;
              if (k) context.lineTo(px, py);
              else context.moveTo(px, py);
            }
            context.closePath();
            context.stroke();
          }
          context.globalAlpha = 1;
        }
        frame = requestAnimationFrame(draw);
      };
      frame = requestAnimationFrame(draw);
      return () => {
        disposed = true;
        cancelAnimationFrame(frame);
        window.clearTimeout(failsafe);
        unsubscribe();
        document.documentElement.classList.remove("is-loading");
      };
    },
    { scope: overlayRef },
  );

  if (phase === "gone") return null;
  return (
    <div
      ref={overlayRef}
      className="site-loader"
      data-phase={phase}
      role="status"
      aria-live="polite"
    >
      <canvas ref={canvasRef} aria-hidden="true" />
      <p className="site-loader-name" aria-hidden="true">
        Antonio Neto
      </p>
      <p className="site-loader-count" aria-hidden="true">
        <span ref={counterRef}>000</span>
      </p>
      <span className="visually-hidden">
        {phase === "loading" ? "Carregando o site" : "Conteúdo carregado"}
      </span>
    </div>
  );
}
