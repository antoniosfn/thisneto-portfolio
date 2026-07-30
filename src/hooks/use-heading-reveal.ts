import { useGSAP } from "@gsap/react";
import { gsap, SplitText } from "@/lib/gsap";

interface HeadingRevealOptions {
  /** "chars" faz mask-reveal letra a letra; "words" faz blur-in por palavra. */
  type?: "chars" | "words";
  /** Valores que devem recriar a animação (ex.: idioma). */
  deps?: unknown[];
}

/**
 * Reveal do heading de uma seção via SplitText, disparado ao entrar na viewport.
 *
 * O split só pode ser criado depois de `document.fonts.ready` (a Fira Code precisa
 * estar carregada para as medidas dos caracteres saírem certas). Como esse `.then()`
 * é assíncrono, o cleanup do matchMedia pode rodar antes dele — por isso a flag
 * `cancelled`: sem ela o split nasce órfão após o cleanup, nunca é revertido, e o
 * `gsap.from` deixa os caracteres presos em opacity 0 (heading invisível).
 */
export function useHeadingReveal(
  scope: React.RefObject<HTMLElement>,
  selector: string,
  { type = "chars", deps = [] }: HeadingRevealOptions = {},
) {
  useGSAP(
    () => {
      if (!scope.current) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        let cancelled = false;
        let split: SplitText | undefined;

        document.fonts.ready.then(() => {
          if (cancelled || !scope.current) return;

          const heading = scope.current.querySelector<HTMLElement>(selector);
          if (!heading) return;

          split = new SplitText(heading, { type });

          const fromVars =
            type === "chars"
              ? { yPercent: 110, duration: 0.7, stagger: 0.03, ease: "power4.out" }
              : {
                  opacity: 0,
                  y: 12,
                  filter: "blur(6px)",
                  duration: 0.6,
                  stagger: 0.04,
                  ease: "power2.out",
                };

          gsap.from(type === "chars" ? split.chars : split.words, {
            ...fromVars,
            scrollTrigger: { trigger: scope.current, start: "top 82%" },
          });
        });

        return () => {
          cancelled = true;
          split?.revert();
        };
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        const heading = scope.current?.querySelector<HTMLElement>(selector);
        if (heading) gsap.set(heading, { opacity: 1, yPercent: 0, clearProps: "all" });
      });
    },
    { scope, dependencies: deps, revertOnUpdate: true },
  );
}
