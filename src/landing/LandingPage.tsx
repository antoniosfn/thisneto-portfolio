"use client";

import { useEffect, useRef, type MouseEvent } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { sectionProgress } from "./particles/timeline";
import { revealText } from "./text-reveal";
import { solutions, chapters, faqs, profile, projects, steps } from "./content";
import Loader from "./Loader";
import ParticleField, { type ParticleController } from "./ParticleField";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Dala's ASScroll eases the page by 7.5% of the remaining distance per frame.
 * Lenis applies 1 − e^(−lerp·60·dt), so lerp = −ln(1 − 0.075) gives exactly
 * 0.075 per 60 Hz frame and the same time constant at any refresh rate.
 */
const SCROLL_LERP = -Math.log(1 - 0.075);
// Tablets and phones: copy enters above the figure's reserved lower area.
const STACKED_COPY_WIDTH = 1099;
const STACKED_COPY_ALIGN = 0.18;

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}

/**
 * The mark: a seed that grows into a tree. One stroke rises from the amber
 * seed and opens into three branches, each ending in a node, as the Tree of
 * Life of the particle field. Geometry shared with Loader.tsx (MARK_PATHS).
 */
function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d="M12 17.4V11.2M12 11.2C12 8.6 9.4 7.6 6.4 5.6M12 11.2C12 8.6 14.6 7.6 17.6 5.6M12 11.2V3.6"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle className="mark-seed" cx="12" cy="19.8" r="2.5" />
        <circle className="mark-node" cx="6.4" cy="5.6" r="1.6" />
        <circle className="mark-node" cx="17.6" cy="5.6" r="1.6" />
        <circle className="mark-node" cx="12" cy="3.6" r="1.6" />
      </svg>
    </span>
  );
}

export default function LandingPage() {
  const root = useRef<HTMLDivElement>(null);
  const progress = useRef<HTMLDivElement>(null);
  const particleController = useRef<ParticleController>({
    progress: 0,
  });
  const lenis = useRef<Lenis | null>(null);
  const headerBackdrop = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const sections = gsap.utils.toArray<HTMLElement>("[data-particle-stage]");
      let stops: number[] = [];
      let disposed = false;
      let refreshFrame = 0;
      // Layout position, not any transform an animation leaves on the block.
      const layoutTop = (element: HTMLElement) =>
        element.getBoundingClientRect().top -
        new DOMMatrixReadOnly(getComputedStyle(element).transform).m42 +
        window.scrollY;
      const measure = () => {
        stops = sections.map((section, index) => {
          if (index === 0) return 0;
          // data-particle-align: the copy's top sits at that viewport fraction.
          // On tablets and phones the copy owns the upper area, while the
          // complete figure settles below it.
          const align =
            Number(section.dataset.particleAlign) ||
            (window.innerWidth <= STACKED_COPY_WIDTH ? STACKED_COPY_ALIGN : 0);
          const first = section.firstElementChild as HTMLElement | null;
          if (align && first)
            return layoutTop(first) - window.innerHeight * align;
          // Otherwise the copy block is centered in the viewport.
          const content =
            section.querySelector<HTMLElement>(
              ".section-split, .section-heading, .solution-copy",
            ) ?? section;
          const height = content.getBoundingClientRect().height;
          return (
            layoutTop(content) +
            Math.min(height, window.innerHeight) / 2 -
            window.innerHeight / 2
          );
        });
      };
      const syncScroll = (self: ScrollTrigger) => {
        // Lenis writes the smoothed position to the window, so the pose follows
        // the eased scroll exactly as Dala's ASScroll.currentPos does.
        const position = self.scroll();
        particleController.current.progress = sectionProgress(position, stops);
        if (progress.current)
          progress.current.style.transform = `scaleX(${self.progress})`;
        compactHeader(position > 1);
      };
      // Dala's header: past 1 px of scroll its blurred band grows from the top
      // (scaleY 0 → 1, 1 s expo.out) and folds back at the top of the page.
      let compact: boolean | undefined;
      const compactHeader = (next: boolean) => {
        if (next === compact) return;
        compact = next;
        gsap.to(headerBackdrop.current, {
          scaleY: next ? 1 : 0,
          duration: 1,
          ease: "expo.out",
          overwrite: true,
        });
      };
      measure();

      ScrollTrigger.create({
        trigger: root.current,
        start: 0,
        end: "max",
        onUpdate: syncScroll,
        onRefresh: (self) => {
          measure();
          syncScroll(self);
        },
      });

      // useGSAP runs as a layout effect: lines are hidden before first paint.
      const revertText = revealText(
        gsap.utils.toArray<HTMLElement>(".reveal"),
        document.getElementById("inicio"),
      );

      const refresh = () => {
        if (disposed || refreshFrame) return;
        refreshFrame = requestAnimationFrame(() => {
          refreshFrame = 0;
          ScrollTrigger.refresh();
        });
      };
      // Details, fonts and images can all move later sections.
      const observer = new ResizeObserver(refresh);
      if (root.current) observer.observe(root.current);
      document.fonts.ready.then(refresh);
      return () => {
        disposed = true;
        cancelAnimationFrame(refreshFrame);
        observer.disconnect();
        revertText();
      };
    },
    { scope: root },
  );

  useEffect(() => {
    // Dala's ASScroll leaves touch screens native (touchScrollType "none").
    const touch = window.matchMedia("(hover: none) and (pointer: coarse)");
    if (touch.matches) return;
    const instance = new Lenis({
      lerp: SCROLL_LERP,
      smoothWheel: true,
      syncTouch: false,
      autoRaf: false,
      // The experience always runs in full motion, whatever the OS setting.
      respectReducedMotion: false,
    });
    lenis.current = instance;
    instance.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      gsap.ticker.lagSmoothing(500, 33);
      instance.destroy();
      lenis.current = null;
    };
  }, []);

  function handleJump(event: MouseEvent<HTMLAnchorElement>, selector: string) {
    event.preventDefault();
    const target = document.querySelector<HTMLElement>(selector);
    if (!target) return;
    // Jumps travel on the same 7.5%-per-frame curve as the wheel.
    if (lenis.current) lenis.current.scrollTo(target);
    else target.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => target.focus({ preventScroll: true }), 500);
  }

  return (
    <div className="dala-site" ref={root}>
      <a className="skip-link" href="#conteudo">
        Ir para o conteúdo
      </a>
      <div className="reading-progress" ref={progress} aria-hidden="true" />
      <ParticleField controller={particleController} />
      <Loader />

      <div className="header-backdrop" ref={headerBackdrop} aria-hidden="true">
        <div />
      </div>
      <header className="site-header">
        <a
          className="wordmark"
          href="#inicio"
          onClick={(event) => handleJump(event, "#inicio")}
        >
          <BrandMark />
          <span>Antonio Neto</span>
        </a>
        <nav aria-label="Navegação principal">
          <a href="#solucoes">Soluções</a>
          <a href="#projetos">Na prática</a>
          <a href="#processo">Como funciona</a>
        </nav>
        <a
          className="button button-primary header-cta"
          href="#contato"
          onClick={(event) => handleJump(event, "#contato")}
        >
          Falar do projeto <Arrow />
        </a>
      </header>

      <main id="conteudo">
        <section className="hero scene" id="inicio" data-particle-stage="0">
          <div className="hero-copy reveal">
            <h1 id="hero-title">
              {profile.headline.map((line) => (
                <span key={line}>{line}</span>
              ))}
            </h1>
          </div>
          <div className="hero-intro reveal">
            <p>{profile.intro}</p>
            <div className="hero-action">
              <a
                className="button button-primary"
                href="#contato"
                onClick={(event) => handleJump(event, "#contato")}
              >
                {profile.invitation} <Arrow />
              </a>
            </div>
          </div>
        </section>

        <section
          className="manifesto scene"
          id="manifesto"
          data-particle-stage="1"
        >
          <div className="section-split reveal">
            <h2>Resolva o que trava sua equipe</h2>
            <div>
              <p>
                Identifico gargalos e conecto dados e sistemas para simplificar
                o trabalho
              </p>
            </div>
          </div>
          <p
            className="manifesto-line reveal"
            data-particle-stage="2"
            aria-label="Entender, conectar e resolver"
          >
            <span>entender</span>
            <i>→</i>
            <span>conectar</span>
            <i>→</i>
            <span>resolver</span>
          </p>
        </section>

        <section className="journey scene" id="trajetoria">
          <header className="section-heading reveal">
            <h2>Do problema à solução</h2>
          </header>
          <div className="chapter-list">
            {chapters.map((chapter, index) => (
              <article
                className="chapter reveal"
                key={chapter.title}
                data-particle-stage={3 + index}
              >
                <div className="chapter-copy">
                  <h3>{chapter.title}</h3>
                  <p>{chapter.body}</p>
                </div>
                <span className="chapter-symbol" aria-hidden="true">
                  {chapter.symbol}
                </span>
              </article>
            ))}
          </div>
        </section>

        <section className="business scene" id="solucoes" aria-label="Soluções">
          {solutions.map((solution, index) => (
            <article
              className="solution"
              key={solution.title}
              data-particle-stage={6 + index * 0.2}
            >
              <div className="solution-copy reveal">
                <h2>{solution.title}</h2>
                <p>{solution.body}</p>
              </div>
            </article>
          ))}
        </section>

        <section className="work scene" id="projetos" data-particle-stage="7">
          <header className="section-heading reveal">
            <h2>Veja na prática</h2>
          </header>
          <div className="project-list">
            {projects.map((project, index) => (
              <article
                className="project reveal"
                key={project.title}
                data-particle-stage={8 + index}
              >
                <div className="project-copy">
                  <h3>{project.title}</h3>
                  <p>{project.description}</p>
                  <p className="project-tags">{project.tags.join(" · ")}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          className="method scene"
          id="processo"
          data-particle-stage="10"
        >
          <header className="section-heading reveal">
            <h2>Do objetivo à entrega</h2>
          </header>
          <div className="method-steps">
            {steps.map((step) => (
              <article className="method-step reveal" key={step.title}>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="profile scene" id="sobre" data-particle-stage="11">
          <figure className="profile-portrait reveal">
            <img src="/images/antonio-neto.jpg" alt="Retrato de Antonio Neto" />
          </figure>
          <div className="profile-copy reveal">
            <h2>Quem constrói com você</h2>
            <p>
              Sou Antonio Neto e uno matemática, engenharia e IA para resolver
              problemas de negócio
            </p>
            <div className="profile-links">
              <a href={profile.linkedin} target="_blank" rel="noreferrer">
                LinkedIn <Arrow />
              </a>
              <a href={profile.github} target="_blank" rel="noreferrer">
                GitHub <Arrow />
              </a>
            </div>
          </div>
        </section>

        <section className="faq scene" id="perguntas" data-particle-stage="12">
          <header className="section-heading reveal">
            <h2>Antes de começar</h2>
          </header>
          <div className="faq-list reveal">
            {faqs.map((faq) => (
              <details key={faq.question}>
                <summary>
                  {faq.question}
                  <i aria-hidden="true">+</i>
                </summary>
                <p>{faq.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section
          className="contact scene"
          id="contato"
          data-particle-stage="13"
          tabIndex={-1}
        >
          <h2 className="reveal">Conte seu desafio</h2>
          <div className="contact-actions reveal">
            <a
              className="button button-primary"
              href={profile.linkedin}
              target="_blank"
              rel="noreferrer"
            >
              Falar no LinkedIn <Arrow />
            </a>
            <a
              className="text-link"
              href={profile.github}
              target="_blank"
              rel="noreferrer"
            >
              Ver estudos no GitHub <Arrow />
            </a>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <a
          className="wordmark"
          href="#inicio"
          onClick={(event) => handleJump(event, "#inicio")}
        >
          <BrandMark />
          <span>Antonio Neto</span>
        </a>
        <span>© {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}
