import { useRef } from "react";
import { useGSAP } from "@gsap/react";
import { gsap } from "@/lib/gsap";

const REVEAL_DISTANCE = 64;
const REVEAL_DURATION = 0.8;

/**
 * Entrada padrão de seção: slide de baixo para cima + fade-in,
 * disparada quando a seção entra na viewport.
 * Respeita prefers-reduced-motion.
 */
export function useSectionReveal<T extends HTMLElement = HTMLElement>() {
  const ref = useRef<T>(null);

  useGSAP(
    () => {
      if (!ref.current) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.from(ref.current, {
          y: REVEAL_DISTANCE,
          opacity: 0,
          duration: REVEAL_DURATION,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ref.current,
            start: "top 82%",
            toggleActions: "play none none none",
          },
        });
      });
    },
    { scope: ref },
  );

  return ref;
}
