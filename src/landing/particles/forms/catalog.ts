import { random } from "./hash";

/**
 * What the builders and the shaders must agree on. Kept free of geometry code
 * so the runtime bundle can import it without the samplers.
 */

/** Atlas order: progress k of the choreography shows form k. */
export const FORM = {
  lorenz: 0,
  cube: 1,
  bookAtom: 2,
  saturn: 3,
  finale: 4,
} as const;
export const FORM_COUNT = Object.keys(FORM).length;

/**
 * Per-form particle size and line strength. Fine figures (the tree, bulb) need
 * smaller particles so their features resolve, and carry their shape in the
 * lines of light, as the references' wireframe mesh does.
 */
export const FORM_LOOK: { size: number; lines: number }[] = [
  { size: 1, lines: 1 }, // lorenz
  { size: 1, lines: 1 }, // cube
  { size: 0.82, lines: 1.3 }, // book and atom
  { size: 0.62, lines: 1.6 }, // Saturn: fine facets and concentric rings
  // The closing scene: each region scales this (motion.w), from the couple's
  // fine strokes to the leaves' large triangles.
  { size: 0.8, lines: 1.2 }, // finale
];

/**
 * Per-particle motion, read by the simulation shader (see shaders/motion.ts).
 * Values are part of the forms file: append, never renumber.
 */
export const MOTION = {
  NONE: 0,
  BOOK: 1,
  PAGE: 2,
  SPARK: 3,
  NUCLEUS: 4,
  ORBIT: 5,
  ELECTRON: 6,
  // 7 and 8 belonged to the retired forked stream; keep later ids stable.
  SEPHIRA: 9,
  LEAF: 10,
  HAIR: 11,
  CHAKRA: 12,
  RING: 13,
  // The closing scene (finale/regions.ts).
  WATER: 14,
  RIVER: 15,
  SMOKE: 16,
  CLOUD: 17,
  GLOW: 18,
  // Turns about the axis in yzw at |yzw| radians per second (Saturn).
  SPIN: 19,
  // A cubie of the puzzle: yzw is its grid cell, scrambled by CUBE_SCRAMBLE.
  CUBIE: 20,
} as const;

/**
 * The puzzle's scramble, applied in order to the solved cube: [axis (0 x,
 * 1 y, 2 z), layer (−1, 0, 1), quarter turns]. Solving undoes the last move
 * first. R U F' D2 L B' U' R2 F.
 */
export const CUBE_SCRAMBLE: readonly (readonly [number, number, number])[] = [
  [0, 1, 1],
  [1, 1, 1],
  [2, 1, -1],
  [1, -1, 2],
  [0, -1, -1],
  [2, -1, 1],
  [1, 1, -1],
  [0, 1, 2],
  [2, 1, 1],
];

/** Particles per side of the simulation texture: 128² = 16 384 particles. */
export const SIDE = 128;
export const COUNT = SIDE * SIDE;

/**
 * Warm particles (amber, red) become the book; cool ones (blue, violet) the
 * atom. Decided by hash, so any prefix of the indices keeps the same share.
 */
export const BOOK_SHARE = 0.42;
export const isBook = (i: number) => random(i, 77) < BOOK_SHARE;

/** Book frame: spine along z through the origin, pages towards ±x. */
export const BOOK = {
  width: 0.5, // spine to fore-edge
  depth: 0.66, // head to tail of a page
  open: 0.4, // rise of each half above the horizontal, radians
  // Tilt that shows the open pages to the camera from the front, above.
  tilt: [0.72, -0.2, 0.12] as const, // Euler XYZ
  gutter: [0, 0.03, 0] as const, // where the plume of sparks leaves the book
} as const;

/** The seed the tree grows from: the top of the roots, in the field frame. */
export const TREE_SCALE = 0.82;
export const TREE_SEED = [0, -0.58 * TREE_SCALE, 0] as const;
