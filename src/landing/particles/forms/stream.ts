import { Vector3 } from "three";
import { STREAM, isBook } from "./catalog";
import { MOTION, emptyForm, fill } from "./compose";
import { random } from "./hash";
import { AMBER, BLUE, GOLD, RED, SKY, VIOLET, WHITE, ramp } from "./palette";

/**
 * After the cube bursts, the fragments line up in single file towards the
 * centre, two strands twisted together, and fork there: warm to the book, cool
 * to the atom. The path is evaluated in the shader (motion STREAM_*), because
 * its ends follow the book and atom wherever the layout places them; the baked
 * points here are only a straight-line fallback.
 */
export function stream(count: number, seed: number) {
  const form = emptyForm("stream", count);
  const groups = [
    { warm: true, slots: [] as number[] },
    { warm: false, slots: [] as number[] },
  ];
  for (let i = 0; i < count; i++) groups[isBook(i) ? 0 : 1].slots.push(i);
  const start = new Vector3(...STREAM.start);
  // Canonical desktop ends, in the field frame.
  const ends = [new Vector3(0.92, 0.44, 0), new Vector3(-0.85, -0.39, 0)];
  groups.forEach(({ warm, slots }, g) => {
    const n = slots.length;
    const points = new Float32Array(n * 3);
    const s = Array.from({ length: n }, (_, j) => (j + 0.5) / n);
    s.forEach((t, j) => {
      const p =
        t < STREAM.forkAt
          ? start.clone().lerp(new Vector3(), t / STREAM.forkAt)
          : new Vector3().lerp(
              ends[g],
              (t - STREAM.forkAt) / (1 - STREAM.forkAt),
            );
      p.toArray(points, j * 3);
    });
    fill(
      form,
      slots,
      [
        {
          points,
          color: (j, _p, out) => {
            if (random(j, 3 + g) < 0.1) return out.copy(WHITE);
            ramp(warm ? [AMBER, GOLD, RED] : [SKY, BLUE, VIOLET], random(j, 5 + g), out);
          },
          emission: (j) => (random(j, 3 + g) < 0.1 ? 0.8 : 0.35),
          // The line draws itself from the cube to the fork, then outwards.
          rank: (j) => s[j],
          motion: (j) => [
            warm ? MOTION.STREAM_WARM : MOTION.STREAM_COOL,
            s[j],
            gaussian(j * 2 + g),
            gaussian(j * 2 + g + 7919),
          ],
        },
      ],
      seed + g,
    );
  });
  return form;
}

/** Approximately normal in [−1, 1]: a thin core with a soft edge. */
function gaussian(i: number) {
  return (random(i, 61) + random(i, 62) + random(i, 63) - 1.5) / 1.5;
}
