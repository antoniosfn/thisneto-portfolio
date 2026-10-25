"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { sectionProgress } from "./particles/timeline";
import { revealText } from "./text-reveal";
import {
  challenges,
  chapters,
  faqs,
  lia,
  profile,
  projects,
  steps,
} from "./content";
import Loader from "./Loader";
import ParticleField, { type ParticleController } from "./ParticleField";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Dala's ASScroll eases the page by 7.5% of the remaining distance per frame.
 * Lenis applies 1 − e^(−lerp·60·dt), so lerp = −ln(1 − 0.075) gives exactly
 * 0.075 per 60 Hz frame and the same time constant at any refresh rate.
 */
const SCROLL_LERP = -Math.log(1 - 0.075);
// Phones (same breakpoint as the layout CSS): the copy's top sits at 52% of the
// viewport, below the figure in the upper half.
const MOBILE_COPY_WIDTH = 680;
const MOBILE_COPY_ALIGN = 0.52;

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
  const [challengeId, setChallengeId] = useState(challenges[0].id);
  const selectedChallenge =
    challenges.find((challenge) => challenge.id === challengeId) ??
    challenges[0];

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
          // On phones every beat does: the figure owns the top half, the copy
          // the lower half, so text never sits on the complete figure.
          const align =
            Number(section.dataset.particleAlign) ||
            (window.innerWidth <= MOBILE_COPY_WIDTH ? MOBILE_COPY_ALIGN : 0);
          const first = section.firstElementChild as HTMLElement | null;
          if (align && first)
            return layoutTop(first) - window.innerHeight * align;
          // Otherwise the copy block is centered in the viewport.
          const content =
            section.querySelector<HTMLElement>(
              ".section-split, .section-heading",
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
      // Details, challenge copy, fonts and images can all move later sections.
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
          <a href="#manifesto">Manifesto</a>
          <a href="#projetos">Projetos</a>
          <a href="#processo">Processo</a>
        </nav>
        <a
          className="button button-primary header-cta"
          href="#contato"
          onClick={(event) => handleJump(event, "#contato")}
        >
          Vamos conversar <Arrow />
        </a>
      </header>

      <main id="conteudo">
        <section className="hero scene" id="inicio" data-particle-stage="0">
          <div className="hero-copy reveal">
            <h1 id="hero-title">
              <span>Conecte</span>
              <span>o que sabe.</span>
              <span>Construa</span>
              <span>o que falta.</span>
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
            <h2>Antes de construir, entender.</h2>
            <div>
              <p>
                Dados, documentos e sistemas contam partes da mesma história. Eu
                conecto essas partes e transformo o problema em software que
                pode ser usado e evoluído.
              </p>
            </div>
          </div>
          <p
            className="manifesto-line reveal"
            data-particle-stage="2"
            aria-label="Contexto, clareza e aplicação"
          >
            <span>contexto</span>
            <i>→</i>
            <span>clareza</span>
            <i>→</i>
            <span>aplicação</span>
          </p>
        </section>

        <section className="journey scene" id="trajetoria">
          <header className="section-heading reveal">
            <h2>Três perspectivas. Um mesmo raciocínio.</h2>
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

        <section
          className="business scene"
          id="solucoes"
          data-particle-stage="6"
        >
          <header className="section-heading reveal">
            <h2>Tecnologia começa pelo problema.</h2>
          </header>
          <div className="challenge-layout reveal">
            <fieldset className="challenge-options">
              <legend className="visually-hidden">
                Escolha um ponto de partida
              </legend>
              {challenges.map((challenge) => (
                <label
                  className={`challenge-option${challenge.id === challengeId ? " is-selected" : ""}`}
                  key={challenge.id}
                >
                  <input
                    type="radio"
                    name="challenge"
                    value={challenge.id}
                    checked={challenge.id === challengeId}
                    onChange={() => setChallengeId(challenge.id)}
                    suppressHydrationWarning
                  />
                  <span>{challenge.label}</span>
                </label>
              ))}
            </fieldset>
            <div className="challenge-response" aria-live="polite">
              <h3>{selectedChallenge.title}</h3>
              <p>{selectedChallenge.body}</p>
              <p className="approach">
                <strong>{selectedChallenge.approach}</strong>
              </p>
            </div>
          </div>
        </section>

        <section className="work scene" id="projetos" data-particle-stage="7">
          <header className="section-heading reveal">
            <h2>Conhecimento que encontra uma forma útil.</h2>
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

        <section className="method scene" id="processo" data-particle-stage="10">
          <header className="section-heading reveal">
            <h2>Do contexto à entrega.</h2>
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
            <h2>Matemática no raciocínio. Engenharia na execução.</h2>
            <p>
              Pesquisa aplicada, IA e software, com curiosidade para investigar
              e disciplina para entregar.
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
            <h2>Clareza antes do compromisso.</h2>
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

        <section className="lia scene" id="lia" data-particle-stage="13">
          <div className="section-split reveal">
            <div className="lia-copy">
              <h2>{lia.title}</h2>
              <p className="lia-tagline">{lia.tagline}</p>
              <p>{lia.body}</p>
              <a
                className="button button-primary"
                href="#contato"
                onClick={(event) => handleJump(event, "#contato")}
              >
                {lia.invitation} <Arrow />
              </a>
            </div>
          </div>
        </section>

        <section
          className="contact scene"
          id="contato"
          data-particle-stage="14"
          // The contact copy starts just below the middle of the screen.
          data-particle-align="0.56"
          tabIndex={-1}
        >
          <h2 className="reveal">O que você quer fazer funcionar?</h2>
          <div className="contact-actions reveal">
            <a
              className="button button-primary"
              href={profile.linkedin}
              target="_blank"
              rel="noreferrer"
            >
              Conversar no LinkedIn <Arrow />
            </a>
            <a
              className="text-link"
              href={profile.github}
              target="_blank"
              rel="noreferrer"
            >
              Explorar o GitHub <Arrow />
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
