import { Color, LinearSRGBColorSpace } from "three";

export { random, seeded } from "./hash";

/**
 * Raw sRGB tones (the field is composed in display space). The first six are
 * Dala's observed palette; red, amber, cyan and pink come from the book, atom
 * and figure references.
 */
const tone = (hex: string) => new Color().setStyle(hex, LinearSRGBColorSpace);
export const GOLD = tone("#F5B820"),
  VIOLET = tone("#8B4DFF"),
  WHITE = tone("#F4E6F5"),
  TEAL = tone("#2FBF9B"),
  BLUE = tone("#3F6BFF"),
  MAGENTA = tone("#D94DE0"),
  RED = tone("#FF3B30"),
  AMBER = tone("#FFD23F"),
  CYAN = tone("#45D8FF"),
  SKY = tone("#4FA3FF"),
  PINK = tone("#FF5FA8");

/** Linear blend through a list of colours, t in [0, 1]. */
export function ramp(stops: Color[], t: number, out: Color) {
  const x = Math.max(0, Math.min(0.9999, t)) * (stops.length - 1);
  const i = Math.floor(x);
  return out.copy(stops[i]).lerp(stops[i + 1], x - i);
}
