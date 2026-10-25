/**
 * The closing scene, read from docs/reference/finale/reference.webp
 * (1024 × 765): a waterfall under a polygonal moon, three trees, a house with
 * lit windows and a smoking chimney, and a couple with a cat and a dog. Each
 * region says how deep it sits, how it moves and how much of the particle
 * budget it deserves; coordinates are reference pixels, read off a 50 px grid.
 */
export const REFERENCE = { width: 1024, height: 765 } as const;

/**
 * Motion types of the closing scene, appended after the forms' MOTION table
 * (forms/catalog.ts on the v6 branch ends at RING = 13).
 */
export const SCENE_MOTION = {
  STILL: 0,
  LEAF: 10, // shared with the tree: a slow sway
  WATER: 14, // falls down its strand and recycles
  RIVER: 15, // drifts down-left with the current
  SMOKE: 16, // rises from the chimney and fades
  CLOUD: 17, // drifts sideways and back
  GLOW: 18, // still, breathing light (moon, windows, the couple)
} as const;

export type Region = {
  name: string;
  /** Inside test in reference pixels. */
  contains: (x: number, y: number) => boolean;
  /** Depth in the field frame: negative is further from the camera. */
  depth: (x: number, y: number) => number;
  motion: number;
  /** Sampling weight multiplier: small, meaningful things get more particles. */
  boost: number;
  /** Extra emission on top of the pixel's own brightness. */
  glow: number;
  /** Particle size multiplier: fine for the figures, large for the leaves. */
  size: number;
  /**
   * Lines of light (the reference's wireframe): true joins all neighbours;
   * "strokes" joins only particles on drawn edges (trunks, branches).
   */
  lines: boolean | "strokes";
};

const box = (x0: number, y0: number, x1: number, y1: number) => (x: number, y: number) =>
  x >= x0 && x <= x1 && y >= y0 && y <= y1;
const ellipse = (cx: number, cy: number, rx: number, ry: number) => (x: number, y: number) =>
  ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
const flat = (z: number) => () => z;
/** Within `width` of a polyline: the trunks and branches, traced by hand. */
const stroke = (width: number, ...points: [number, number][]) => (x: number, y: number) =>
  points.slice(1).some(([bx, by], k) => {
    const [ax, ay] = points[k];
    const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)));
    return Math.hypot(x - ax - t * (bx - ax), y - ay - t * (by - ay)) <= width;
  });
const TRUNKS = [
  stroke(6, [25, 170], [40, 330], [60, 480], [75, 640]), // left tree
  stroke(6, [75, 170], [82, 330], [96, 480], [115, 640]),
  stroke(6, [130, 230], [90, 330]),
  stroke(7, [598, 400], [602, 500], [606, 612]), // centre tree
  stroke(4, [545, 385], [600, 470]),
  stroke(4, [655, 385], [606, 470]),
  stroke(7, [870, 250], [920, 330], [955, 450], [970, 640]), // right tree
  stroke(6, [1000, 240], [996, 420], [995, 640]),
  stroke(4, [830, 300], [905, 360]),
];
/** The ground tilts towards the camera from its horizon (y 600) down. */
const ground = (x: number, y: number) => -0.2 + 0.55 * Math.max(0, (y - 590) / 175) + 0.02 * Math.sin(x * 0.05);

/** First match wins: specific things before the areas that surround them. */
export const REGIONS: Region[] = [
  { name: "man", contains: box(598, 592, 634, 698), depth: flat(0.16), motion: SCENE_MOTION.GLOW, boost: 5, glow: 0.3, size: 0.55, lines: true },
  { name: "woman", contains: box(638, 588, 678, 698), depth: flat(0.16), motion: SCENE_MOTION.GLOW, boost: 5, glow: 0.3, size: 0.55, lines: true },
  { name: "cat", contains: box(540, 660, 582, 702), depth: flat(0.18), motion: SCENE_MOTION.STILL, boost: 5, glow: 0.2, size: 0.55, lines: true },
  { name: "dog", contains: box(708, 652, 782, 710), depth: flat(0.2), motion: SCENE_MOTION.STILL, boost: 4, glow: 0.2, size: 0.55, lines: true },
  { name: "moon", contains: ellipse(432, 82, 42, 42), depth: flat(-0.55), motion: SCENE_MOTION.GLOW, boost: 3, glow: 0.7, size: 0.9, lines: true },
  { name: "windows", contains: (x, y) => ellipse(723, 492, 13, 13)(x, y) || box(680, 560, 700, 588)(x, y) || box(760, 560, 784, 590)(x, y) || box(824, 560, 846, 590)(x, y) || box(868, 560, 890, 590)(x, y), depth: flat(0.02), motion: SCENE_MOTION.GLOW, boost: 3, glow: 0.8, size: 0.8, lines: false },
  { name: "smoke", contains: box(822, 320, 862, 412), depth: flat(0.0), motion: SCENE_MOTION.SMOKE, boost: 3, glow: 0.1, size: 0.8, lines: false },
  { name: "house", contains: (x, y) => box(650, 530, 925, 610)(x, y) || (y >= 405 && y <= 545 && x >= 630 && x <= 940 && Math.abs(x - 785) <= 150 + (y - 405) * 0.2), depth: (x) => 0.02 - (x - 785) * 0.00025, motion: SCENE_MOTION.STILL, boost: 2.4, glow: 0.05, size: 0.75, lines: true },
  { name: "clouds", contains: (x, y) => ellipse(360, 120, 100, 34)(x, y) || ellipse(565, 148, 95, 40)(x, y) || ellipse(540, 85, 60, 18)(x, y), depth: flat(-0.45), motion: SCENE_MOTION.CLOUD, boost: 1.6, glow: 0.05, size: 0.8, lines: true },
  { name: "falls", contains: (x, y) => y >= 245 && y <= 640 && x >= 210 - (y - 245) * 0.05 && x <= 448 + (y - 245) * 0.06, depth: (_x, y) => -0.18 + 0.12 * ((y - 245) / 395), motion: SCENE_MOTION.WATER, boost: 0.85, glow: 0.5, size: 1, lines: false },
  { name: "splash", contains: ellipse(335, 615, 175, 55), depth: flat(-0.02), motion: SCENE_MOTION.RIVER, boost: 0.8, glow: 0.3, size: 0.9, lines: false },
  { name: "river", contains: (x, y) => y >= 620 && x >= 150 - (y - 620) * 0.4 && x <= 560 - (y - 620) * 0.6, depth: ground, motion: SCENE_MOTION.RIVER, boost: 1.2, glow: 0.15, size: 0.9, lines: false },
  { name: "trunks", contains: (x, y) => TRUNKS.some((trunk) => trunk(x, y)), depth: (x) => (x < 300 ? 0.2 : x > 800 ? 0.26 : -0.03), motion: SCENE_MOTION.STILL, boost: 7, glow: 0.12, size: 0.7, lines: true },
  { name: "pines", contains: box(390, 195, 565, 315), depth: flat(-0.36), motion: SCENE_MOTION.LEAF, boost: 1, glow: 0, size: 1.0, lines: "strokes" },
  { name: "centre tree", contains: (x, y) => ellipse(588, 330, 125, 140)(x, y) || box(578, 440, 615, 615)(x, y), depth: (x, y) => -0.04 + 0.04 * Math.sin(x * 0.07 + y * 0.05), motion: SCENE_MOTION.LEAF, boost: 1.4, glow: 0.05, size: 1.3, lines: "strokes" },
  { name: "left tree", contains: (x, y) => x <= 250 && y <= 700, depth: (x, y) => 0.22 - x * 0.0005 + 0.05 * Math.sin(x * 0.06 + y * 0.04), motion: SCENE_MOTION.LEAF, boost: 1.35, glow: 0.05, size: 1.35, lines: "strokes" },
  { name: "right tree", contains: (x, y) => x >= 700 && y <= 640, depth: (x, y) => 0.26 + (x - 700) * 0.0004 + 0.05 * Math.sin(x * 0.05 + y * 0.06), motion: SCENE_MOTION.LEAF, boost: 1.35, glow: 0.05, size: 1.35, lines: "strokes" },
  { name: "ground", contains: (_x, y) => y > 590, depth: ground, motion: SCENE_MOTION.STILL, boost: 1.2, glow: 0.04, size: 1.1, lines: "strokes" },
  { name: "sky", contains: () => true, depth: (x, y) => -0.5 + 0.1 * Math.sin(x * 0.03 + y * 0.02), motion: SCENE_MOTION.CLOUD, boost: 0.5, glow: 0.05, size: 1.0, lines: false },
];

export function regionAt(x: number, y: number) {
  return REGIONS.findIndex((region) => region.contains(x, y));
}

/** Points of the scene that motions need: the chimney top, the couple. */
export const ANCHORS = {
  chimney: [842, 412] as const,
  couple: [638, 650] as const,
  fallsTop: 250,
  fallsBottom: 640,
} as const;
