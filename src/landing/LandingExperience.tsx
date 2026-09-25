import { ArrowLeft, ArrowRight } from "lucide-react";
import { type CSSProperties, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LandingScene } from "./LandingScene";
import "./landing.css";

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function windowOpacity(progress: number, start: number, peakIn: number, peakOut: number, end: number) {
  const fadeIn = clamp((progress - start) / Math.max(peakIn - start, 0.001));
  const fadeOut = 1 - clamp((progress - peakOut) / Math.max(end - peakOut, 0.001));
  return Math.min(fadeIn, fadeOut);
}

function StoryBeat({ progress, range, children, className = "" }: { progress: number; range: [number, number, number, number]; children: ReactNode; className?: string }) {
  const opacity = windowOpacity(progress, ...range);
  return (
    <div className={`story-beat ${className}`} style={{ "--beat-opacity": opacity, "--beat-shift": `${(1 - opacity) * 22}px` } as CSSProperties}>
      {children}
    </div>
  );
}

const mobileProgressSteps = [0.025, 0.22, 0.34, 0.43, 0.655, 0.72, 0.9] as const;

function MobileStory({ step }: { step: number }) {
  return (
    <section key={step} className={`mobile-story-copy mobile-story-step-${step}`} aria-live="polite">
      {step === 0 ? <>
        <p className="story-kicker">A living map of purpose</p>
        <h1>What is your Ikigai?</h1>
        <p className="mobile-story-lead">Ikigai is a Japanese concept for the sense of purpose that makes life feel worth living.</p>
      </> : null}

      {step === 1 ? <p className="mobile-story-lead">It is often found somewhere between what you love, what you’re good at, what the world needs, and what can sustain you.</p> : null}

      {step === 2 ? <>
        <p className="mobile-story-lead">But your Ikigai is rarely one answer waiting to be found.</p>
        <p>Sometimes, it begins as scattered moments: the things you keep returning to, the work that makes you feel alive, and the ways others naturally turn to you.</p>
        <strong className="mobile-closing-line">Perhaps the pattern is already there.</strong>
      </> : null}

      {step === 3 ? <>
        <p className="story-kicker">Find where your energies meet</p>
        <h2>Locus</h2>
        <p className="mobile-story-lead">Find your Ikigai in your own world.</p>
        <p>Your life is not a four-circle diagram. It is a world of experiences, instincts, contradictions, and recurring signals.</p>
      </> : null}

      {step === 4 ? <>
        <p className="story-kicker">Illustrative reflections</p>
        <p className="mobile-story-lead">A thought becomes a signal, then finds its place.</p>
      </> : null}

      {step === 5 ? <>
        <p className="story-kicker">Patterns emerge</p>
        <p className="mobile-story-lead">Locus notices what keeps returning.</p>
        <strong className="mobile-closing-line">Not a test. A living map.</strong>
      </> : null}

      {step === 6 ? <>
        <p className="story-kicker">Your world begins here</p>
        <h2>Ready to find your Locus?</h2>
        <p className="mobile-story-lead">Start with what you know.<br />Let the pattern emerge from there.</p>
      </> : null}
    </section>
  );
}

export function LandingExperience() {
  const [progress, setProgress] = useState(0);
  const [entering, setEntering] = useState(false);
  const [mobileStep, setMobileStep] = useState(0);
  const [isMobile, setIsMobile] = useState(() => window.matchMedia("(max-width: 820px), (pointer: coarse)").matches);
  const reducedMotion = useMemo(() => window.matchMedia("(prefers-reduced-motion: reduce)").matches, []);
  const progressRef = useRef(0);

  useEffect(() => {
    const query = window.matchMedia("(max-width: 820px), (pointer: coarse)");
    const updateMode = () => setIsMobile(query.matches);
    query.addEventListener("change", updateMode);
    return () => query.removeEventListener("change", updateMode);
  }, []);

  useEffect(() => {
    document.body.classList.add("locus-landing-active");
    document.body.classList.toggle("locus-landing-mobile", isMobile);
    return () => {
      document.body.classList.remove("locus-landing-active", "locus-landing-mobile");
    };
  }, [isMobile]);

  useEffect(() => {
    if (isMobile) {
      window.scrollTo(0, 0);
      return;
    }

    let frame = 0;
    const update = () => {
      frame = 0;
      const distance = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const nextProgress = clamp(window.scrollY / distance);
      progressRef.current = nextProgress;
      setProgress(nextProgress);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile) return;
    const startProgress = progressRef.current;
    const targetProgress = mobileProgressSteps[mobileStep];
    const duration = reducedMotion ? 1 : mobileStep === 1 ? 1500 : 760;
    const startTime = performance.now();
    let frame = 0;

    const animate = (now: number) => {
      const elapsed = clamp((now - startTime) / duration);
      const eased = elapsed * elapsed * (3 - 2 * elapsed);
      const nextProgress = startProgress + (targetProgress - startProgress) * eased;
      progressRef.current = nextProgress;
      setProgress(nextProgress);
      if (elapsed < 1) frame = window.requestAnimationFrame(animate);
    };

    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, [isMobile, mobileStep, reducedMotion]);

  const enterWorld = useCallback(() => {
    if (entering) return;
    setEntering(true);
    window.setTimeout(() => {
      window.location.assign("/ikigai-alpha");
    }, reducedMotion ? 180 : 1050);
  }, [entering, reducedMotion]);

  const chapter = isMobile ? (mobileStep < 3 ? 1 : mobileStep < 6 ? 2 : 3) : progress < 0.39 ? 1 : progress < 0.77 ? 2 : 3;
  const isLastMobileStep = mobileStep === mobileProgressSteps.length - 1;
  const advanceMobileStory = () => {
    if (isLastMobileStep) enterWorld();
    else setMobileStep((step) => Math.min(step + 1, mobileProgressSteps.length - 1));
  };

  return (
    <main className={`landing-page chapter-${chapter}${isMobile ? " is-mobile-story" : ""}${entering ? " is-entering" : ""}`}>
      <LandingScene progress={progress} entering={entering} reducedMotion={reducedMotion} mobile={isMobile} />
      <header className="landing-header">
        <a href="/" aria-label="Locus home">Locus</a>
      </header>

      {!isMobile ? <div className="landing-story" aria-live="off">
        <StoryBeat progress={progress} range={[-0.01, 0, 0.05, 0.065]} className="opening-beat">
          <p className="story-kicker">A living map of purpose</p>
          <h1>What is your Ikigai?</h1>
        </StoryBeat>
        <StoryBeat progress={progress} range={[0.065, 0.075, 0.12, 0.13]}>
          <p className="story-lead">Ikigai is a Japanese concept for the sense of purpose that makes life feel worth living.</p>
        </StoryBeat>
        <StoryBeat progress={progress} range={[0.13, 0.14, 0.195, 0.205]}>
          <p className="story-lead">It is often found somewhere between <em>what you love</em>, <em>what you’re good at</em>, <em>what the world needs</em>, and <em>what can sustain you</em>.</p>
        </StoryBeat>
        <StoryBeat progress={progress} range={[0.205, 0.215, 0.29, 0.3]}>
          <p className="story-lead">But your Ikigai is rarely one answer waiting to be found.</p>
          <p>Sometimes, it begins as scattered moments —<br />the things you keep returning to,<br />the work that makes you feel alive,<br />the ways others naturally turn to you.</p>
        </StoryBeat>
        <StoryBeat progress={progress} range={[0.3, 0.315, 0.37, 0.39]} className="closing-line">
          <p>Perhaps the pattern is already there.</p>
        </StoryBeat>

        <StoryBeat progress={progress} range={[0.385, 0.4, 0.45, 0.465]} className="locus-beat">
          <p className="story-kicker">Find where your energies meet</p>
          <h2>Locus</h2>
          <p className="story-subhead">Find your Ikigai in your own world.</p>
          <p>Your life is not a four-circle diagram.<br />It is a world of experiences, instincts, contradictions, and recurring signals.</p>
          <p>Locus gives those signals somewhere to live.</p>
        </StoryBeat>
        <StoryBeat progress={progress} range={[0.465, 0.475, 0.52, 0.53]} className="example-beat">
          <span>Illustrative example · Good at</span>
          <strong>Making complicated things feel simple</strong>
        </StoryBeat>
        <StoryBeat progress={progress} range={[0.53, 0.54, 0.585, 0.595]} className="example-beat">
          <span>Illustrative example · World needs</span>
          <strong>Helping people feel less lost</strong>
        </StoryBeat>
        <StoryBeat progress={progress} range={[0.595, 0.605, 0.65, 0.66]} className="example-beat">
          <span>Illustrative example · Love</span>
          <strong>Building beautiful things</strong>
        </StoryBeat>
        <StoryBeat progress={progress} range={[0.66, 0.675, 0.745, 0.77]} className="chapter-two-close">
          <p>As your world fills, Locus looks for what keeps returning.</p>
          <div className="signal-list"><span>Recurring roles</span><span>Unexpected connections</span><span>Productive tensions</span><span>Directions worth exploring</span></div>
          <strong>Not a test.<br />Not a label.<br />A living map of what may be emerging.</strong>
        </StoryBeat>

        <StoryBeat progress={progress} range={[0.765, 0.805, 1, 1.01]} className="ready-beat">
          <p className="story-kicker">Your world begins here</p>
          <h2>Ready to find your Locus?</h2>
          <p>Start with what you know.<br />Let the pattern emerge from there.</p>
          <button type="button" onClick={enterWorld}>Enter your world <ArrowRight size={18} strokeWidth={1.5} /></button>
        </StoryBeat>
      </div> : <>
        <MobileStory step={mobileStep} />
        <nav className="mobile-story-controls" aria-label="Landing story controls">
          <button type="button" className="mobile-story-back" aria-label="Previous story moment" disabled={mobileStep === 0} onClick={() => setMobileStep((step) => Math.max(0, step - 1))}>
            <ArrowLeft size={18} strokeWidth={1.5} />
          </button>
          <button type="button" className="mobile-story-next" onClick={advanceMobileStory}>
            {isLastMobileStep ? "Enter your world" : "Continue"}<ArrowRight size={18} strokeWidth={1.5} />
          </button>
        </nav>
      </>}

      {!isMobile ? <><div className="scroll-meter" aria-hidden="true"><i style={{ transform: `scaleY(${Math.max(progress, 0.025)})` }} /></div><p className="scroll-cue" aria-hidden="true">Scroll to explore</p></> : null}
      <div className="entry-wash" aria-hidden="true" />
      <div className="landing-spacer" aria-hidden="true" />
    </main>
  );
}
