"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { formatLoaderPercent, loading } from "./loading";
import { bookStrokes } from "./loader-book";

gsap.registerPlugin(useGSAP);

const FRAGMENTS = 900;
const MIN_VISIBLE_MS = 1200;
const FAILSAFE_MS = 12000;
/** If the integer has not moved, say so. The veil still lifts on its own. */
const STALL_MS = 4000;
const FORCE_REVEAL_MS = FAILSAFE_MS + 2000;
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
  const stallRef = useRef<HTMLParagraphElement>(null);
  const closed = useRef(false);
  const [phase, setPhase] = useState<Phase>("loading");

  useGSAP(
    (_context, contextSafe) => {
      const overlay = overlayRef.current;
      const canvas = canvasRef.current;
      if (!overlay || !canvas || !contextSafe) return;
      // Default lag smoothing treats a slow frame as a hitch and advances the
      // exit by ~33ms. On a software GPU that freezes the loader past any
      // reasonable wait. Real elapsed time is the clock this timeline needs.
      gsap.ticker.lagSmoothing(0);
      // The counter and exit also work if a 2D canvas is unavailable.
      const context = canvas.getContext("2d");
      const fragments = createFragments();
      // Centre the drawing on its own bounds, not on the projection origin.
      const xs = fragments.map((f) => f.target[0]),
        ys = fragments.map((f) => f.target[1]);
      const minX = Math.min(...xs),
        minY = Math.min(...ys);
      const bookW = Math.max(...xs) - minX,
        bookH = Math.max(...ys) - minY;
      const extent = Math.max(bookW, bookH);
      const mounted = performance.now();
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      overlay.dataset.motion = reduced ? "reduced" : "full";
      document.documentElement.classList.add("is-loading");
      let target = 0,
        shown = 0,
        last = mounted,
        lastLabel = "1%",
        lastAdvance = mounted;
      let finished = false,
        leaving = false,
        disposed = false,
        frame = 0;
      const unsubscribe = loading.subscribe((progress, done) => {
        target = Math.max(target, progress);
        finished = done;
      });
      let failsafe = 0;
      let forceReveal = 0;
      const lift = () => {
        // A late GSAP call can set the phase back to "revealing" after this
        // and leave the veil mounted. The ref wins over that state update.
        closed.current = true;
        if (disposed) return;
        disposed = true;
        cancelAnimationFrame(frame);
        window.clearTimeout(failsafe);
        window.clearTimeout(forceReveal);
        unsubscribe();
        document.documentElement.classList.remove("is-loading");
        setPhase("gone");
      };
      failsafe = window.setTimeout(() => loading.finish(), FAILSAFE_MS);
      // finish() only raises the target. If the draw loop has died, the veil
      // would stay up on the last percent, so a later timer removes it.
      forceReveal = window.setTimeout(lift, FORCE_REVEAL_MS);
      const beginExit = contextSafe(() => {
        leaving = true;
        setPhase("compressing");
        // Reduced motion keeps the book, then fades. Full motion collapses
        // it to the centre before the page appears.
        const compressAt = reduced ? 0.01 : 0.15;
        const revealAt = reduced ? 0.08 : 0.8;
        gsap
          .timeline({ onComplete: lift })
          .addLabel("compress", compressAt)
          .to(
            canvas,
            {
              scale: reduced ? 1 : 0.012,
              opacity: 0,
              duration: reduced ? 0.2 : 0.65,
              ease: "expo.inOut",
            },
            "compress",
          )
          .to(".site-loader-meta", { opacity: 0, duration: reduced ? 0.15 : 0.25 }, 0)
          .addLabel("reveal", revealAt)
          .call(() => {
            if (!closed.current) setPhase("revealing");
          }, [], "reveal")
          .to(
            overlay,
            {
              opacity: 0,
              duration: reduced ? 0.2 : 0.95,
              ease: "power2.inOut",
            },
            "reveal",
          );
      });

      const draw = () => {
        if (disposed) return;
        const now = performance.now();
        // Follow real progress smoothly, independent of refresh rate.
        // Never step backwards if a late report arrives out of order.
        const follow = 1 - 0.92 ** ((now - last) / 16.667);
        shown = Math.max(shown, shown + (target - shown) * follow);
        last = now;
        if (target >= shown && target - shown < 0.002) shown = target;
        const label = formatLoaderPercent(shown);
        if (counterRef.current && counterRef.current.textContent !== label)
          counterRef.current.textContent = label;
        const value = label.slice(0, -1);
        if (overlay.getAttribute("aria-valuenow") !== value)
          overlay.setAttribute("aria-valuenow", value);
        if (label !== lastLabel) {
          lastLabel = label;
          lastAdvance = now;
          if (stallRef.current) stallRef.current.hidden = true;
        } else if (
          stallRef.current &&
          !finished &&
          now - lastAdvance >= STALL_MS
        ) {
          stallRef.current.hidden = false;
        }
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
          const unit = bookSize / extent;
          // Optical centre slightly above the middle, leaving room for the counter.
          const cx = (width - bookW * unit) / 2 - minX * unit,
            cy = height * 0.46 - (bookH * unit) / 2 - minY * unit;
          overlay.style.setProperty(
            "--book-bottom",
            `${Math.round(height * 0.46 + (bookH * unit) / 2)}px`,
          );
          const span = Math.max(width, height),
            time = reduced ? 0 : now / 1000;
          context.lineWidth = 0.8;
          for (const f of fragments) {
            const t = easeOut(
              Math.min(1, Math.max(0, (shown - f.threshold) / 0.1)),
            );
            const tx =
              cx + f.target[0] * unit + Math.sin(time * 0.9 + f.phase) * 0.25;
            const ty =
              cy + f.target[1] * unit + Math.cos(time * 0.7 + f.phase) * 0.25;
            const sx = width / 2 + f.start[0] * span,
              sy = height / 2 + f.start[1] * span;
            // Unformed fragments wait in place as the ghost outline.
            const x = t > 0 ? sx + (tx - sx) * t : tx,
              y = t > 0 ? sy + (ty - sy) * t : ty;
            const size = (1.4 + 2.4 * f.size) * (1 - 0.35 * (1 - t));
            const angle = f.turn * (1 - t) + (reduced ? 0 : time * 0.15 * (1 - t * 0.8));
            // A faint outline of the book is there from the first frame.
            context.globalAlpha = t > 0 ? Math.min(1, 0.1 + t * 1.6) : 0.1;
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
        window.clearTimeout(forceReveal);
        unsubscribe();
        document.documentElement.classList.remove("is-loading");
      };
    },
    { scope: overlayRef },
  );

  if (closed.current || phase === "gone") return null;
  return (
    <div
      ref={overlayRef}
      className="site-loader"
      data-phase={phase}
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={100}
      aria-valuenow={1}
      aria-labelledby="loader-status"
    >
      <canvas ref={canvasRef} aria-hidden="true" />
      <div className="site-loader-meta">
        <p id="loader-status" className="site-loader-status">
          Carregando experiência…
        </p>
        <div className="site-loader-row">
          <p className="site-loader-name">Antonio Neto</p>
          <p className="site-loader-count" aria-hidden="true">
            <span ref={counterRef}>1%</span>
          </p>
        </div>
        <p ref={stallRef} className="site-loader-stall" hidden aria-live="polite">
          Ainda carregando…
        </p>
      </div>
    </div>
  );
}
