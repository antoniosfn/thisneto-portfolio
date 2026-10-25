"use client";

import { useEffect, useRef, useState } from "react";
import { loading } from "./loading";

/**
 * Loading screen. The portfolio's mark — a seed growing into a tree — draws
 * itself from small triangle fragments in step with the real download, on the
 * same black void as the field; at 100% the fragments scatter outwards as the
 * field flies in. Direction (Refero): Active Theory's void and peripheral
 * micro-UI, Regisgrumberg's single central emblem, Midjourney's image that
 * renders itself while you wait.
 */
const FRAGMENTS = 240;
/** The mark in its 24-unit box (see BrandMark): strokes as polylines. */
const MARK_PATHS: { points: [number, number][]; color: string; weight: number }[] = [
  { points: [[12, 17.4], [12, 11.2], [12, 3.6]], color: "#ffffff", weight: 3 },
  { points: [[12, 11.2], [11.6, 9.2], [10.2, 8.1], [8.3, 6.9], [6.4, 5.6]], color: "#ffffff", weight: 2.4 },
  { points: [[12, 11.2], [12.4, 9.2], [13.8, 8.1], [15.7, 6.9], [17.6, 5.6]], color: "#ffffff", weight: 2.4 },
];
const MARK_DOTS: { at: [number, number]; r: number; color: string; weight: number }[] = [
  { at: [12, 19.8], r: 2.5, color: "#ffb829", weight: 2.6 },
  { at: [6.4, 5.6], r: 1.6, color: "#8052ff", weight: 1 },
  { at: [17.6, 5.6], r: 1.6, color: "#8052ff", weight: 1 },
  { at: [12, 3.6], r: 1.6, color: "#8052ff", weight: 1 },
];
const MIN_VISIBLE_MS = 900; // a cached visit still sees the mark form
const FAILSAFE_MS = 12000; // content never waits longer than this
const EXIT_MS = 1100;

type Fragment = {
  target: [number, number]; // in mark units
  start: [number, number]; // in viewport units, from the centre
  color: string;
  size: number;
  turn: number;
  phase: number;
  threshold: number; // progress at which it sets off
};

function hash(i: number, salt: number) {
  const v = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

/** Point at arc-length fraction t of a polyline. */
function along(points: [number, number][], t: number): [number, number] {
  const lengths = points.slice(1).map(([x, y], k) => Math.hypot(x - points[k][0], y - points[k][1]));
  const total = lengths.reduce((a, b) => a + b, 0);
  let d = t * total;
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

/**
 * Fragments along the strokes (weighted by length) and filling the dots; the
 * seed sets off first and the tree grows upwards from it, so the drawing
 * reads as growth, not as random fill.
 */
function createFragments(): Fragment[] {
  const pieces = [
    ...MARK_PATHS.map((p) => ({ ...p, kind: "path" as const })),
    ...MARK_DOTS.map((d) => ({ ...d, kind: "dot" as const })),
  ];
  const total = pieces.reduce((n, p) => n + p.weight, 0);
  return Array.from({ length: FRAGMENTS }, (_, i) => {
    // Pick a piece by weight.
    let pick = hash(i, 1) * total,
      piece = pieces[0];
    for (const p of pieces) {
      piece = p;
      if ((pick -= p.weight) <= 0) break;
    }
    let x: number, y: number;
    if (piece.kind === "path") {
      [x, y] = along(piece.points, hash(i, 2));
      // A little width, so the stroke is a swarm and not a hairline.
      x += (hash(i, 3) - 0.5) * 1.1;
      y += (hash(i, 4) - 0.5) * 0.6;
    } else {
      const a = hash(i, 2) * Math.PI * 2,
        r = piece.r * Math.sqrt(hash(i, 3));
      x = piece.at[0] + Math.cos(a) * r;
      y = piece.at[1] + Math.sin(a) * r;
    }
    const angle = hash(i, 6) * Math.PI * 2;
    const reach = 0.45 + 0.6 * hash(i, 7);
    // Growth order: bottom (seed, y ~ 20) first, top (nodes, y ~ 4) last.
    const growth = 1 - (y - 3) / 18;
    return {
      target: [x, y],
      start: [Math.cos(angle) * reach, Math.sin(angle) * reach],
      color: piece.color,
      size: 0.35 + 0.65 * hash(i, 8) ** 2,
      turn: hash(i, 9) * Math.PI * 2,
      phase: hash(i, 10) * Math.PI * 2,
      // Travel takes 0.1 of progress: a threshold of 0.9 arrives exactly at 100%.
      threshold: Math.min(0.9, Math.max(0, growth * 0.76 + hash(i, 11) * 0.14)),
    };
  });
}

const easeOut = (t: number) => 1 - (1 - t) ** 3;

export default function Loader() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const counterRef = useRef<HTMLSpanElement>(null);
  const [phase, setPhase] = useState<"loading" | "leaving" | "gone">("loading");

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    const fragments = createFragments();
    const mounted = performance.now();
    document.documentElement.classList.add("is-loading");
    let target = 0,
      shown = 0,
      last = performance.now(),
      finished = false,
      leaving = 0,
      frame = 0;
    const unsubscribe = loading.subscribe((progress, done) => {
      target = progress;
      finished = done;
    });
    const failsafe = window.setTimeout(() => loading.finish(), FAILSAFE_MS);

    const draw = () => {
      // Wall-clock time, not the frame timestamp: the exit must run even when
      // a page (or a test) pins the animation clock.
      const now = performance.now();
      const ratio = Math.min(devicePixelRatio || 1, 2);
      const width = canvas.clientWidth,
        height = canvas.clientHeight;
      if (canvas.width !== Math.round(width * ratio)) {
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
      }
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      // The bar never jumps: it eases towards the real progress.
      // 8% of the gap per 60 Hz frame, whatever the refresh rate.
      shown += (target - shown) * (1 - 0.92 ** ((now - last) / 16.667));
      last = now;
      if (target - shown < 0.002) shown = target;
      const percent = Math.round(shown * 100);
      if (counterRef.current) counterRef.current.textContent = String(percent).padStart(3, "0");
      const ready = finished && shown >= 0.999 && now - mounted > MIN_VISIBLE_MS;
      if (ready && !leaving) {
        leaving = now;
        setPhase("leaving");
      }
      const exit = leaving ? Math.min(1, (now - leaving) / EXIT_MS) : 0;
      const markSize = Math.min(220, Math.max(132, Math.min(width, height) * 0.24));
      const unit = markSize / 24;
      const cx = width / 2 - markSize / 2,
        cy = height / 2 - markSize / 2;
      const span = Math.max(width, height);
      const time = now / 1000;
      context.lineWidth = 1.15;
      for (const f of fragments) {
        const t = easeOut(Math.min(1, Math.max(0, (shown - f.threshold) / 0.1)));
        if (t <= 0 && !exit) continue;
        // Vacuum: every placed fragment keeps a slow, involuntary float.
        const drift = Math.sin(time * 0.9 + f.phase) * 0.6;
        const tx = cx + f.target[0] * unit + drift,
          ty = cy + f.target[1] * unit + Math.cos(time * 0.7 + f.phase) * 0.6;
        const sx = width / 2 + f.start[0] * span,
          sy = height / 2 + f.start[1] * span;
        let x = sx + (tx - sx) * t,
          y = sy + (ty - sy) * t;
        let alpha = Math.min(1, t * 1.6);
        if (exit) {
          // Scatter outwards from the centre and fade as the field arrives.
          const push = easeOut(exit) * span * (0.25 + 0.35 * f.size);
          const dx = tx - width / 2,
            dy = ty - height / 2,
            length = Math.hypot(dx, dy) || 1;
          x += (dx / length) * push;
          y += (dy / length) * push;
          alpha *= 1 - exit;
        }
        if (alpha <= 0.01) continue;
        const size = (4 + 7 * f.size) * (1 - 0.35 * (1 - t));
        const angle = f.turn * (1 - t) + time * 0.25 * (1 - t * 0.8);
        context.globalAlpha = alpha;
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
      if (exit >= 1) {
        document.documentElement.classList.remove("is-loading");
        setPhase("gone");
        return;
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(failsafe);
      unsubscribe();
      document.documentElement.classList.remove("is-loading");
    };
  }, []);

  if (phase === "gone") return null;
  return (
    <div className={`site-loader${phase === "leaving" ? " is-leaving" : ""}`} role="status" aria-live="polite">
      <canvas ref={canvasRef} aria-hidden="true" />
      <p className="site-loader-name" aria-hidden="true">
        Antonio Neto
      </p>
      <p className="site-loader-count" aria-hidden="true">
        <span ref={counterRef}>000</span>
      </p>
      <span className="visually-hidden">
        {phase === "leaving" ? "Conteúdo carregado." : "Carregando o site."}
      </span>
    </div>
  );
}
