"use client";

import { useEffect, useRef, useState } from "react";
import { loading } from "./loading";

/**
 * Loading screen. The portfolio's mark — three right-pointing triangles —
 * assembles from small triangle fragments in step with the real download, on
 * the same black void as the field; at 100% the fragments scatter outwards as
 * the field flies in. Direction (Refero): Active Theory's void and peripheral
 * micro-UI, Regisgrumberg's single central emblem, Midjourney's image that
 * renders itself while you wait.
 */
const FRAGMENTS = 240;
// The mark's three triangles in its 24-unit box (see .brand-mark): left, top.
const MARK = [
  { left: 6, top: 0, color: "#8052ff" },
  { left: 0, top: 6, color: "#ffffff" },
  { left: 12, top: 12, color: "#ffb829" },
] as const;
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

/** Fragments on the outline and inside of the mark's triangles. */
function createFragments(): Fragment[] {
  return Array.from({ length: FRAGMENTS }, (_, i) => {
    const triangle = MARK[i % 3];
    const corners = [
      [triangle.left, triangle.top],
      [triangle.left + 12, triangle.top + 6],
      [triangle.left, triangle.top + 12],
    ];
    let a = hash(i, 1),
      b = hash(i, 2);
    if (hash(i, 3) < 0.72) {
      // On an edge: the outline reads first, as the reference's wireframe.
      const edge = Math.floor(hash(i, 4) * 3);
      a = edge === 0 ? hash(i, 5) : edge === 1 ? 1 - hash(i, 5) : 0;
      b = edge === 0 ? 0 : edge === 1 ? hash(i, 5) : 1 - hash(i, 5);
    } else if (a + b > 1) {
      a = 1 - a;
      b = 1 - b;
    }
    const [p0, p1, p2] = corners;
    const x = p0[0] + (p1[0] - p0[0]) * a + (p2[0] - p0[0]) * b;
    const y = p0[1] + (p1[1] - p0[1]) * a + (p2[1] - p0[1]) * b;
    const angle = hash(i, 6) * Math.PI * 2;
    const reach = 0.45 + 0.6 * hash(i, 7);
    return {
      target: [x, y],
      start: [Math.cos(angle) * reach, Math.sin(angle) * reach],
      color: triangle.color,
      size: 0.35 + 0.65 * hash(i, 8) ** 2,
      turn: hash(i, 9) * Math.PI * 2,
      phase: hash(i, 10) * Math.PI * 2,
      threshold: hash(i, 11) * 0.92,
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
      shown += (target - shown) * 0.08;
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
