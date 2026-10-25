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
import ParticleField, { type ParticleController } from "./ParticleField";

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * Dala's ASScroll eases the page by 7.5% of the remaining distance per frame.
 * Lenis applies 1 − e^(−lerp·60·dt), so lerp = −ln(1 − 0.075) gives exactly
 * 0.075 per 60 Hz frame and the same time constant at any refresh rate.
 */
const SCROLL_LERP = -Math.log(1 - 0.075);

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}

function BrandMark() {
  return (
    <span className="brand-mark" aria-hidden="true">
      <i />
      <i />
      <i />
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
          const align = Number(section.dataset.particleAlign);
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
            <p className="kicker">Matemática · IA aplicada · Engenharia</p>
            <h1 id="hero-title">
              <span>Conecte</span>
              <span>o que sabe.</span>
              <span>Construa</span>
              <span>o que falta.</span>
            </h1>
          </div>
          <div className="hero-intro reveal">
            <p className="eyebrow">
              INFORMAÇÃO DISPERSA. POSSIBILIDADES CONECTADAS.
            </p>
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
          <div className="scroll-cue" aria-hidden="true">
            <span>Scroll para explorar</span>
            <i />
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
              <p className="eyebrow">01 / MANIFESTO</p>
              <p>
                Dados, documentos e sistemas contam partes da mesma história. Eu
                conecto essas partes, identifico o que trava o trabalho e
                transformo o problema em software que possa ser usado, avaliado
                e evoluído.
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
            <p className="eyebrow">02 / TRAJETÓRIA</p>
            <h2>Três perspectivas. Um mesmo raciocínio.</h2>
          </header>
          <div className="chapter-list">
            {chapters.map((chapter) => (
              <article
                className="chapter reveal"
                key={chapter.number}
                data-particle-stage={2 + Number(chapter.number)}
              >
                <span className="chapter-number">{chapter.number}</span>
                <div className="chapter-copy">
                  <p className="eyebrow">{chapter.label}</p>
                  <h3>{chapter.title}</h3>
                  <p>{chapter.body}</p>
                  <span className="chapter-note">{chapter.note}</span>
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
            <p className="eyebrow">03 / DESAFIOS</p>
            <h2>Tecnologia começa pelo problema.</h2>
          </header>
          <div className="challenge-layout reveal">
            <fieldset className="challenge-options">
              <legend>Escolha um ponto de partida</legend>
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
                  <span>{challenge.number}</span>
                  <span>{challenge.label}</span>
                </label>
              ))}
            </fieldset>
            <div className="challenge-response" aria-live="polite">
              <p className="eyebrow">UMA APLICAÇÃO POSSÍVEL</p>
              <h3>{selectedChallenge.title}</h3>
              <p>{selectedChallenge.body}</p>
              <p className="approach">
                <span>Abordagem</span>
                <strong>{selectedChallenge.approach}</strong>
              </p>
            </div>
          </div>
        </section>

        <section className="work scene" id="projetos" data-particle-stage="7">
          <header className="section-heading reveal">
            <p className="eyebrow">04 / TRABALHO SELECIONADO</p>
            <h2>Conhecimento que encontra uma forma útil.</h2>
          </header>
          <div className="project-list">
            {projects.map((project, index) => (
              <article
                className="project reveal"
                key={project.number}
                data-particle-stage={8 + index}
              >
                <div className="project-index">
                  <span>{project.number}</span>
                  <p>{project.kind}</p>
                </div>
                <div className="project-copy">
                  <h3>{project.title}</h3>
                  <p>{project.description}</p>
                  <p className="project-benefit">{project.benefit}</p>
                  <dl>
                    <div>
                      <dt>Contribuição</dt>
                      <dd>{project.contribution}</dd>
                    </div>
                    <div>
                      <dt>Tecnologias</dt>
                      <dd>{project.tags.join(" · ")}</dd>
                    </div>
                  </dl>
                  <details>
                    <summary>
                      Ver contexto do projeto <span aria-hidden="true">+</span>
                    </summary>
                    <p>{project.detail}</p>
                    <small>Projeto profissional · Código privado</small>
                  </details>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="method scene" id="processo" data-particle-stage="10">
          <header className="section-heading reveal">
            <p className="eyebrow">05 / PROCESSO</p>
            <h2>Do contexto à entrega.</h2>
          </header>
          <div className="method-steps">
            {steps.map((step) => (
              <article className="method-step reveal" key={step.number}>
                <span>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
                <small>{step.output}</small>
              </article>
            ))}
          </div>
        </section>

        <section className="profile scene" id="sobre" data-particle-stage="11">
          <figure className="profile-portrait reveal">
            <img src="/images/antonio-neto.jpg" alt="Retrato de Antonio Neto" />
            <figcaption>Antonio Neto · IA & Software</figcaption>
          </figure>
          <div className="profile-copy reveal">
            <p className="eyebrow">06 / QUEM CONSTRÓI</p>
            <h2>Matemática no raciocínio. Engenharia na execução.</h2>
            <p>
              Trabalho na interseção entre pesquisa aplicada, inteligência
              artificial e desenvolvimento de software — com curiosidade para
              investigar e disciplina para transformar ideias em sistemas reais.
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
            <p className="eyebrow">07 / PERGUNTAS</p>
            <h2>Clareza antes do compromisso.</h2>
          </header>
          <div className="faq-list reveal">
            {faqs.map((faq, index) => (
              <details key={faq.question}>
                <summary>
                  <span>{String(index + 1).padStart(2, "0")}</span>
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
              <p className="eyebrow">{lia.eyebrow}</p>
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
          <p className="eyebrow reveal">09 / PRÓXIMA CONVERSA</p>
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
        <p>IA aplicada e engenharia de software para problemas que importam.</p>
        <span>© {new Date().getFullYear()}</span>
      </footer>
    </div>
  );
}
