import { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";
import { useGSAP } from "@gsap/react";
import { gsap, SplitText } from "@/lib/gsap";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useContent } from "@/hooks/use-language";
import profile from "@/assets/profile.jpg";

const MENU_PANEL_ID = "hero-menu-panel";

const scrollToTarget = (target: string) => {
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReducedMotion) {
    document.querySelector(target)?.scrollIntoView();
    return;
  }
  gsap.to(window, {
    scrollTo: target === "#home" ? 0 : { y: target, offsetY: 0 },
    duration: 1,
    ease: "power2.inOut",
  });
};

export const Hero = () => {
  const scope = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { hero, nav } = useContent();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isMenuOpen &&
        menuRef.current &&
        menuButtonRef.current &&
        !menuRef.current.contains(event.target as Node) &&
        !menuButtonRef.current.contains(event.target as Node)
      ) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setIsMenuOpen(false);
      menuButtonRef.current?.focus();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isMenuOpen]);

  useGSAP(
    () => {
      if (!scope.current) return;

      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const splits: SplitText[] = [];
        // Sem esta flag, o cleanup pode rodar antes do fonts.ready resolver e os splits
        // nascem órfãos — nunca revertidos, com os chars presos em opacity 0.
        let cancelled = false;

        document.fonts.ready.then(() => {
          if (cancelled || !scope.current) return;

          const lines = gsap.utils.toArray<HTMLElement>("[data-hero='line']");
          const tagline = scope.current.querySelector<HTMLElement>("[data-hero='tagline']");
          const chevron = scope.current.querySelector<HTMLElement>("[data-hero='chevron']");

          const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

          tl.from(
            "[data-hero='topbar'] > *",
            { opacity: 0, y: -12, filter: "blur(6px)", duration: 0.6, stagger: 0.1 },
            0,
          );

          // Blur-in letra a letra, como na referência
          lines.forEach((line, i) => {
            const split = new SplitText(line, { type: "chars" });
            splits.push(split);
            gsap.set(line, { opacity: 1 });
            tl.from(
              split.chars,
              {
                opacity: 0,
                y: -20,
                filter: "blur(10px)",
                duration: 0.55,
                stagger: 0.09,
                ease: "power2.out",
              },
              0.2 + i * 0.35,
            );
          });

          tl.from(
            "[data-hero='photo']",
            { scale: 0, opacity: 0, duration: 0.8, ease: "back.out(1.6)" },
            1.1,
          );

          if (tagline) {
            const taglineSplit = new SplitText(tagline, { type: "words" });
            splits.push(taglineSplit);
            gsap.set(tagline, { opacity: 1 });
            tl.from(
              taglineSplit.words,
              {
                opacity: 0,
                y: -14,
                filter: "blur(8px)",
                duration: 0.6,
                stagger: 0.12,
                ease: "power2.out",
              },
              1.4,
            );
          }

          if (chevron) {
            tl.from(chevron, { opacity: 0, y: -8, duration: 0.4 }, 2.1).add(() => {
              gsap.to(chevron, {
                y: 8,
                duration: 0.9,
                ease: "sine.inOut",
                repeat: -1,
                yoyo: true,
              });
            });
          }

          // Saída parallax: hero recua e esmaece enquanto o conteúdo sobe por cima
          gsap.to("[data-hero='inner']", {
            yPercent: -25,
            opacity: 0.15,
            ease: "none",
            scrollTrigger: {
              trigger: scope.current,
              start: "top top",
              end: "bottom top",
              scrub: true,
            },
          });
          gsap.to("[data-hero='photo']", {
            yPercent: -40,
            ease: "none",
            scrollTrigger: {
              trigger: scope.current,
              start: "top top",
              end: "bottom top",
              scrub: true,
            },
          });
        });

        return () => {
          cancelled = true;
          splits.forEach((s) => s.revert());
        };
      });

      mm.add("(prefers-reduced-motion: reduce)", () => {
        gsap.set("[data-hero='line'], [data-hero='tagline']", { opacity: 1 });
      });
    },
    { scope },
  );

  return (
    <section
      ref={scope}
      id="home"
      className="relative h-[100svh] bg-black overflow-hidden"
      aria-label={hero.sectionAriaLabel}
    >
      {/* Backdrop: separa o menu do texto gigante do hero */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm"
          onClick={() => setIsMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Topbar: menu + assinatura */}
      <header
        data-hero="topbar"
        className="absolute top-0 left-0 right-0 z-40 px-6 py-6 flex items-center justify-between"
      >
        <div className="relative z-[100]">
          <button
            ref={menuButtonRef}
            type="button"
            className="p-2 text-neutral-500 hover:text-white transition-colors duration-300"
            aria-label={isMenuOpen ? nav.close : nav.open}
            aria-expanded={isMenuOpen}
            aria-controls={MENU_PANEL_ID}
            onClick={() => setIsMenuOpen((open) => !open)}
          >
            {isMenuOpen ? (
              <X className="w-8 h-8" strokeWidth={2} />
            ) : (
              <Menu className="w-8 h-8" strokeWidth={2} />
            )}
          </button>

          {isMenuOpen && (
            <nav
              ref={menuRef}
              id={MENU_PANEL_ID}
              aria-label={nav.label}
              className="absolute top-full left-0 w-[200px] md:w-[240px] bg-black border border-border shadow-2xl mt-2 ml-4 p-4 rounded-lg z-[100]"
            >
              {nav.items.map((item) => (
                <a
                  key={item.label}
                  href={item.target}
                  className={`block text-lg md:text-xl font-bold tracking-tight py-1.5 px-2 cursor-pointer transition-colors duration-300 hover:text-accent ${
                    item.highlight ? "text-accent" : "text-white"
                  }`}
                  onClick={(event) => {
                    event.preventDefault();
                    setIsMenuOpen(false);
                    scrollToTarget(item.target);
                  }}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          )}
        </div>

        <span
          className="text-4xl text-white select-none"
          style={{ fontFamily: "'Brush Script MT', 'Lucida Handwriting', cursive" }}
          aria-hidden="true"
        >
          A
        </span>

        {/* Toggle de idioma — ocupa o slot que mantém a assinatura opticamente centralizada */}
        <div className="flex min-w-12 justify-end">
          <LanguageToggle />
        </div>
      </header>

      <div data-hero="inner" className="absolute inset-0">
        {/* Nome gigante centralizado */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full px-4">
          <div className="relative text-center">
            <h1
              aria-label={hero.nameAriaLabel}
              className="font-mono font-bold uppercase tracking-tighter leading-[0.8] whitespace-nowrap text-accent text-[clamp(3.5rem,17vw,16rem)]"
            >
              {hero.nameLines.map((line) => (
                <span key={line} data-hero="line" className="block opacity-0" aria-hidden="true">
                  {line}
                </span>
              ))}
            </h1>

            {/* Foto oval sobre a costura das duas linhas.
                O deslocamento horizontal usa `left` (não translate) porque o GSAP escreve
                transform inline neste mesmo elemento durante o parallax. */}
            <div
              data-hero="photo"
              className="absolute top-1/2 left-[46%] -translate-x-1/2 -translate-y-1/2 z-10"
            >
              <div className="w-[84px] h-[142px] sm:w-[112px] sm:h-[190px] md:w-[138px] md:h-[234px] lg:w-[164px] lg:h-[276px] rounded-full overflow-hidden shadow-2xl transition-transform duration-500 ease-out hover:scale-[1.35] cursor-pointer">
                <img
                  src={profile}
                  alt={hero.photoAlt}
                  width={129}
                  height={218}
                  loading="eager"
                  decoding="async"
                  className="w-full h-full object-cover object-top"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tagline próxima ao rodapé */}
        <div className="absolute bottom-16 sm:bottom-20 md:bottom-24 lg:bottom-32 left-1/2 -translate-x-1/2 w-full px-6">
          <p
            data-hero="tagline"
            className="font-antic text-center text-neutral-500 hover:text-white transition-colors duration-300 text-[15px] sm:text-[18px] md:text-[20px] lg:text-[22px] opacity-0"
          >
            {hero.tagline}
          </p>
        </div>
      </div>

      <button
        data-hero="chevron"
        type="button"
        onClick={() => scrollToTarget("#conteudo")}
        aria-label={hero.scrollToContent}
        className="absolute bottom-6 md:bottom-10 left-1/2 -translate-x-1/2 z-30 text-neutral-500 hover:text-white transition-colors duration-300"
      >
        <ChevronDown className="w-5 h-5 md:w-8 md:h-8" />
      </button>
    </section>
  );
};
