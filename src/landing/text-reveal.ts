import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

/**
 * Dala's `splitTextRotateIn`, read from its animate-from attributes: each line
 * rises 120% from behind a clipping mask, pivoting on its top-left corner,
 * when the block's top reaches the bottom of the viewport.
 */
const LINE = {
  yPercent: 120,
  transformOrigin: "0 0",
  ease: "power3.out",
  stagger: { each: 0.1, ease: "power1.in" },
} as const;
type Timing = { rotate: number; duration: number; delay: number };
const HEADING: Timing = { rotate: 0, duration: 1.5, delay: 0 };
const BODY: Timing = { rotate: 7, duration: 0.8, delay: 0.5 };
const HERO: { heading: Timing; body: Timing; action: gsap.TweenVars } = {
  heading: { rotate: 0, duration: 1, delay: 0 },
  body: { rotate: 7, duration: 1, delay: 1 },
  action: {
    yPercent: 120,
    rotate: 2,
    ease: "expo.out",
    duration: 1,
    delay: 1.5,
  },
};
const START = "top bottom";
const HEADINGS = "h1, h2, h3";
const TEXT = `${HEADINGS}, p, dt, figcaption, .eyebrow`;
const DYNAMIC = "details, .challenge-layout";

function textBlocks(blocks: HTMLElement[]) {
  const found = new Set<HTMLElement>();
  for (const block of blocks) {
    const candidates = block.matches(TEXT)
      ? [block]
      : [...block.querySelectorAll<HTMLElement>(TEXT)];
    for (const element of candidates) {
      // Leaves only. Text React rewrites (FAQ answers, the challenge copy) is
      // left whole: splitting it would detach the nodes React updates.
      if (element.querySelector(TEXT) || element.closest(DYNAMIC)) continue;
      // Line wrappers would collapse a flex or grid layout into one block.
      if (/^(inline-)?(flex|grid)$/.test(getComputedStyle(element).display))
        continue;
      found.add(element);
    }
  }
  return [...found];
}

function splitReveal(element: HTMLElement, timing: Timing) {
  return SplitText.create(element, {
    type: "lines",
    mask: "lines",
    // Keep the authored text and aria-label; lines are only presentation.
    aria: "none",
    autoSplit: true,
    onSplit: (self) =>
      gsap.from(self.lines, {
        ...LINE,
        ...timing,
        scrollTrigger: { trigger: element, start: START },
      }),
  });
}

/** Animate every text leaf of the given blocks; returns the splits to revert. */
export function revealText(blocks: HTMLElement[], hero: HTMLElement | null) {
  const splits = textBlocks(blocks).map((element) => {
    const inHero = !!hero?.contains(element);
    const heading = element.matches(HEADINGS);
    const timing = inHero
      ? heading
        ? HERO.heading
        : HERO.body
      : heading
        ? HEADING
        : BODY;
    return splitReveal(element, timing);
  });
  // .hero-action clips the button like Dala's CTA wrapper.
  // The button's CSS transform transition is paused while the tween runs, and
  // both inline styles are cleared after so the hover lift works again.
  hero
    ?.querySelectorAll<HTMLElement>(".hero-action > .button")
    .forEach((button) => {
      gsap.set(button, { transition: "none" });
      gsap.from(button, {
        ...HERO.action,
        onComplete: () => {
          gsap.set(button, { clearProps: "transform,transition" });
        },
      });
    });
  return () => splits.forEach((split) => split.revert());
}
