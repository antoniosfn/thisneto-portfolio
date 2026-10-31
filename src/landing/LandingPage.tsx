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
              ".section-split, .section-heading, .solution-copy, .stage-copy",
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
          <a href="#processo">Como funciona</a>
          <a href="#projetos">Na prática</a>
          <a href="#sobre">Sobre</a>
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
        <section
          className="hero tone-light"
          id="inicio"
          data-particle-stage="0"
        >
          <p className="eyebrow reveal">IA · automação · software sob medida</p>
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
              <a
                className="button button-secondary"
                href="#projetos"
                onClick={(event) => handleJump(event, "#projetos")}
              >
                Ver projetos <Arrow />
              </a>
            </div>
          </div>
        </section>

        <section
          className="journey tone-dark"
          id="trajetoria"
          data-particle-stage="1"
        >
          <div className="stage">
            <div className="stage-copy reveal">
              <p className="eyebrow">01 — Do problema à solução</p>
              <ol className="chapter-list">
                {chapters.map((chapter) => (
                  <li className="chapter" key={chapter.title}>
                    <h3>{chapter.title}</h3>
                    <p>{chapter.body}</p>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section
          className="manifesto tone-light"
          id="manifesto"
          data-particle-stage="2"
        >
          <div className="section-split reveal">
            <p className="eyebrow">02 — Manifesto</p>
            <h2>Resolva o que trava sua equipe</h2>
            <p>
              Identifico gargalos e conecto dados e sistemas para simplificar o
              trabalho
            </p>
          </div>
          <p
            className="manifesto-line reveal"
            aria-label="Entender, conectar e resolver"
          >
            <span>entender</span>
            <i>→</i>
            <span>conectar</span>
            <i>→</i>
            <span>resolver</span>
          </p>
        </section>

        <section
          className="business tone-dark"
          id="solucoes"
          aria-label="Soluções"
        >
          <div className="stage">
            {solutions.map((solution, index) => (
              <article
                className="solution"
                key={solution.title}
                data-particle-stage={3 + index}
              >
                <div className="solution-copy reveal">
                  <p className="eyebrow">
                    03 — Solução {String(index + 1).padStart(2, "0")}
                  </p>
                  <h2>{solution.title}</h2>
                  <p>{solution.body}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section
          className="method tone-light"
          id="processo"
          data-particle-stage="6"
        >
          <header className="section-heading reveal">
            <p className="eyebrow">04 — Como funciona</p>
            <h2>Do objetivo à entrega</h2>
          </header>
          <ol className="method-steps">
            {steps.map((step, index) => (
              <li className="method-step reveal" key={step.title}>
                <span className="method-number" aria-hidden="true">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section
          className="work tone-dark"
          id="projetos"
          data-particle-stage="7"
        >
          <div className="stage">
            <div className="stage-copy reveal">
              <p className="eyebrow">05 — Na prática</p>
              <h2>Veja na prática</h2>
              <div className="project-list">
                {projects.map((project) => (
                  <article className="project" key={project.title}>
                    <h3>{project.title}</h3>
                    <p>{project.description}</p>
                    <p className="project-tags">{project.tags.join(" · ")}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section
          className="profile tone-light"
          id="sobre"
          data-particle-stage="8"
        >
          <figure className="profile-portrait reveal">
            <img src="/images/antonio-neto.jpg" alt="Retrato de Antonio Neto" />
          </figure>
          <div className="profile-copy section-split reveal">
            <p className="eyebrow">06 — Sobre</p>
            <h2>Quem constrói com você</h2>
            <p>
              Sou Antonio Neto e uno matemática, engenharia e IA para resolver
              problemas de negócio
            </p>
            <div className="profile-links">
              <a
                className="button button-secondary"
                href={profile.linkedin}
                target="_blank"
                rel="noopener noreferrer"
              >
                LinkedIn <Arrow />
              </a>
              <a
                className="button button-secondary"
                href={profile.github}
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub <Arrow />
              </a>
            </div>
          </div>
        </section>

        <section
          className="faq tone-dark"
          id="perguntas"
          data-particle-stage="9"
        >
          <div className="stage">
            <div className="stage-copy">
              <header className="reveal">
                <p className="eyebrow">07 — Perguntas</p>
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
            </div>
          </div>
        </section>

        <section
          className="contact tone-light"
          id="contato"
          data-particle-stage="10"
          tabIndex={-1}
        >
          <div className="section-split reveal">
            <p className="eyebrow">08 — Contato</p>
            <h2>Conte seu desafio</h2>
          </div>
          <div className="contact-actions reveal">
            <a
              className="button button-primary"
              href={profile.linkedin}
              target="_blank"
              rel="noopener noreferrer"
            >
              Falar no LinkedIn <Arrow />
            </a>
            <a
              className="button button-secondary"
              href={profile.github}
              target="_blank"
              rel="noopener noreferrer"
            >
              Ver estudos no GitHub <Arrow />
            </a>
          </div>
        </section>

        <section
          className="closing tone-dark"
          id="fechamento"
          aria-label="Encerramento"
          data-particle-stage="11"
        >
          <div className="stage">
            <footer className="site-footer">
              <a
                className="wordmark"
                href="#inicio"
                onClick={(event) => handleJump(event, "#inicio")}
              >
                <BrandMark />
                <span>Antonio Neto</span>
              </a>
              <span>
                IA, automação e software · © {new Date().getFullYear()}
              </span>
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
}
