"use client";

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { AccentSwatches } from "@/components/theme/AccentSwatches";
import { AppearanceToggle } from "@/components/theme/AppearanceToggle";
import { CandlerProgress } from "@/components/ui/CandlerProgress";
import { useModShortcutLabel } from "@/components/ui/ModShortcut";
import { VaultPhraseSetup, type VaultPhraseSetupStatus } from "@/components/vault/VaultPhraseSetup";
import {
  VAULT_PHRASE_SETUP_COPY,
  VAULT_PHRASE_SETUP_TITLE,
} from "@/lib/vault/recovery-phrase-copy";

export const TOUR_KEY = "candler-tour-v1";
export const TOUR_REPLAY_EVENT = "candler:tour:replay";

export function replayCandlerTour() {
  window.dispatchEvent(new Event(TOUR_REPLAY_EVENT));
}

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

type Phase = "hidden" | "welcome" | "step" | "done";

interface TourStep {
  id: string;
  title: string;
  body: string;
  selector?: string;
  interactive?: "appearance" | "vault-phrase";
  preferAbove?: boolean;
}

const STEPS: TourStep[] = [
  {
    id: "appearance",
    title: "Make Candler yours.",
    body: "Choose Light or Dark mode and pick an accent color that fits your workspace. You can change it anytime in Settings.",
    selector: ".appearance-panel",
    interactive: "appearance",
    preferAbove: true,
  },
  {
    id: "projects",
    title: "Projects",
    body: "Group every secret, token, and cloud config by project. Each project gets its own scoped environments — dev, staging, and prod.",
    selector: '[href="/app/projects"]',
  },
  {
    id: "vault",
    title: VAULT_PHRASE_SETUP_TITLE,
    body: VAULT_PHRASE_SETUP_COPY,
    selector: '[href="/app/vault"]',
    interactive: "vault-phrase",
  },
  {
    id: "authenticator",
    title: "Authenticator",
    body: "TOTP codes for every service — no separate app required. Scan a QR code or paste a secret directly.",
    selector: '[href="/app/vault/authenticator"]',
  },
  {
    id: "recovery",
    title: "Recovery Codes",
    body: "If you ever lose access to your authenticator, recovery codes get you back in. Store them somewhere safe — Vault is a good start.",
    selector: undefined,
  },
  {
    id: "cloud",
    title: "Your projects don’t have to live on your laptop.",
    body: "Back up complete project folders to Candler Cloud, clear them from your computer when you need the space, and bring them back whenever you’re ready to work.",
    selector: '[href="/app/cloud"]',
  },
  {
    id: "agent",
    title: "Agent",
    body: "Ask questions about your secrets, let Candler audit your environment, or automate routine vault operations.",
    selector: '[href="/app/agent"]',
  },
  {
    id: "activity",
    title: "Activity Log",
    body: "Every read, write, import, and export — timestamped and searchable. Know exactly who did what and when.",
    selector: '[href="/app/activity"]',
  },
  {
    id: "command-palette",
    title: "Command Palette",
    body: "Press {modK} to jump anywhere, search secrets, or run actions — all without lifting your hands from the keyboard.",
    selector: '[aria-label="Search and commands"]',
  },
];

function useTourTarget(selector: string | undefined, phase: Phase) {
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    function update() {
      if (phase === "hidden" || !selector) {
        setRect(null);
        return;
      }
      const el = document.querySelector(selector);
      setRect(el ? el.getBoundingClientRect() : null);
    }

    update();
    if (phase === "hidden" || !selector) return;

    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [selector, phase]);

  return rect;
}

function cardStyle(rect: DOMRect | null, tall = false, preferAbove = false): React.CSSProperties {
  const CARD_W = tall ? 384 : 352;
  const CARD_H_EST = tall ? 560 : 320;
  const GAP = 20;
  const viewW = window.innerWidth;
  const viewH = window.innerHeight;

  if (viewW < 640) {
    return { bottom: 0, left: 0, right: 0 };
  }

  if (!rect) {
    // Sit at ~30 % from the top (above centre) so the card clears the viewport
    // bottom on compact Windows laptops (1366×768 at 125–150 % display scaling).
    const topBias = tall ? 0.12 : 0.30;
    const top = Math.max(GAP, Math.min(Math.round(viewH * topBias), viewH - CARD_H_EST - GAP));
    return { top, left: "50%", transform: "translateX(-50%)" };
  }

  // Prefer-above: position the card above the target with a gap.
  // If the ideal position would clip the card above the viewport, clamp to GAP
  // from the top — the card may overlap the target's top edge, but this is
  // better than dropping the card below the target on compact displays.
  if (preferAbove) {
    const left = Math.max(GAP, Math.min(
      Math.round(rect.left + rect.width / 2 - CARD_W / 2),
      viewW - CARD_W - GAP,
    ));
    const aboveTop = rect.top - GAP - CARD_H_EST;
    return { top: Math.max(GAP, aboveTop), left };
  }

  const centerY = Math.round(rect.top + rect.height / 2);

  if (rect.right + GAP + CARD_W <= viewW) {
    const top = Math.max(GAP, Math.min(centerY - CARD_H_EST / 2, viewH - CARD_H_EST - GAP));
    return { top, left: rect.right + GAP };
  }

  if (rect.left - GAP - CARD_W >= 0) {
    const top = Math.max(GAP, Math.min(centerY - CARD_H_EST / 2, viewH - CARD_H_EST - GAP));
    return { top, right: viewW - rect.left + GAP };
  }

  const left = Math.max(GAP, Math.min(rect.left + rect.width / 2 - CARD_W / 2, viewW - CARD_W - GAP));
  return { top: Math.min(rect.bottom + GAP, viewH - CARD_H_EST - GAP), left };
}

function useIsMounted() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function CandlerTour() {
  const mounted = useIsMounted();
  const [phase, setPhase] = useState<Phase>("hidden");
  const [stepIndex, setStepIndex] = useState(0);
  const [vaultPhraseStatus, setVaultPhraseStatus] = useState<VaultPhraseSetupStatus>("needed");
  const cardRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!mounted) return;
    const stored = localStorage.getItem(TOUR_KEY);
    if (!stored) {
      const t = setTimeout(() => setPhase("welcome"), 800);
      return () => clearTimeout(t);
    }
  }, [mounted]);

  useEffect(() => {
    const handler = () => {
      setStepIndex(0);
      setPhase("welcome");
    };
    window.addEventListener(TOUR_REPLAY_EVENT, handler);
    return () => window.removeEventListener(TOUR_REPLAY_EVENT, handler);
  }, []);

  const currentStep = phase === "step" ? STEPS[stepIndex] : undefined;
  const rect = useTourTarget(currentStep?.selector, phase);

  const handleStart = useCallback(() => {
    setStepIndex(0);
    setPhase("step");
  }, []);

  const handleNext = useCallback(() => {
    setStepIndex((i) => {
      if (STEPS[i]?.interactive === "vault-phrase" && vaultPhraseStatus === "needed") return i;
      if (i < STEPS.length - 1) {
        setPhase("step");
        return i + 1;
      }
      setPhase("done");
      return i;
    });
  }, [vaultPhraseStatus]);

  const handleBack = useCallback(() => {
    setStepIndex((i) => {
      if (i === 0) {
        setPhase("welcome");
        return i;
      }
      setPhase("step");
      return i - 1;
    });
  }, []);

  const handleSkip = useCallback(() => {
    localStorage.setItem(TOUR_KEY, "skipped");
    setPhase("hidden");
  }, []);

  const handleDone = useCallback(() => {
    localStorage.setItem(TOUR_KEY, "completed");
    setPhase("hidden");
  }, []);

  // Focus trap + keyboard navigation
  useEffect(() => {
    if (phase === "hidden") return;
    const card = cardRef.current;
    if (!card) return;

    const prev = document.activeElement as HTMLElement | null;
    const first = card.querySelector<HTMLElement>("[data-autofocus]") ?? card.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? card).focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        if (phase === "done") handleDone();
        else handleSkip();
        return;
      }
      const inAppearance = (e.target as HTMLElement | null)?.closest(".tour-appearance");
      const inPhrase = (e.target as HTMLElement | null)?.closest(".vault-phrase-setup");
      if (e.key === "ArrowRight" && (phase === "welcome" || phase === "step") && !inAppearance && !inPhrase) {
        e.preventDefault();
        if (phase === "welcome") handleStart();
        else handleNext();
        return;
      }
      if (e.key === "ArrowLeft" && phase === "step" && !inAppearance && !inPhrase) {
        e.preventDefault();
        handleBack();
        return;
      }

      if (e.key !== "Tab") return;
      const focusable = Array.from(card.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (el) => el.offsetParent !== null,
      );
      if (!focusable.length) {
        e.preventDefault();
        card.focus();
        return;
      }
      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && active === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && active === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      prev?.focus?.();
    };
  }, [phase, stepIndex, handleStart, handleNext, handleBack, handleSkip, handleDone]);

  if (!mounted || phase === "hidden") return null;

  const spotlightStyle: React.CSSProperties | undefined = rect
    ? {
        position: "fixed",
        top: rect.top - 5,
        left: rect.left - 5,
        width: rect.width + 10,
        height: rect.height + 10,
      }
    : undefined;

  // Scroll the appearance panel into view if the user had scrolled away before
  // the tour fired. On standard first-load it is already visible, so this is
  // usually a no-op. Only runs on step entry.
  useEffect(() => {
    if (phase !== "step" || currentStep?.id !== "appearance") return;
    const el = document.querySelector(".appearance-panel");
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.top >= 0 && r.bottom <= window.innerHeight) return;
    el.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [phase, currentStep?.id]);

  const computedCardStyle = cardStyle(
    rect,
    currentStep?.interactive === "vault-phrase",
    currentStep?.preferAbove ?? false,
  );
  const isNoTarget = phase === "welcome" || phase === "done" || !currentStep?.selector;
  const isFullDim = isNoTarget || !rect;

  return createPortal(
    <>
      {/* Scrim — blocks workspace interaction */}
      <div
        className={`tour-scrim${isFullDim ? " tour-scrim--dim" : ""}`}
        aria-hidden="true"
        onClick={undefined}
      />

      {/* Spotlight (only when target exists) */}
      {spotlightStyle && <div className="tour-spotlight" style={spotlightStyle} aria-hidden="true" />}

      {/* Tour card */}
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={`tour-card${!rect && phase === "step" && !currentStep?.selector ? " tour-card--centered" : ""}${currentStep?.interactive === "appearance" ? " tour-card--appearance" : ""}${currentStep?.interactive === "vault-phrase" ? " tour-card--vault-phrase" : ""}`}
        style={computedCardStyle}
        key={`${phase}-${stepIndex}`}
      >
        {phase === "welcome" && (
          <WelcomeCard titleId={titleId} onStart={handleStart} onSkip={handleSkip} />
        )}
        {phase === "step" && currentStep && (
          <StepCard
            titleId={titleId}
            step={currentStep}
            stepIndex={stepIndex}
            total={STEPS.length}
            onNext={handleNext}
            onBack={handleBack}
            onSkip={handleSkip}
            phraseStatus={vaultPhraseStatus}
            onPhraseStatus={setVaultPhraseStatus}
          />
        )}
        {phase === "done" && (
          <DoneCard titleId={titleId} onDone={handleDone} onReplay={handleStart} />
        )}
      </div>
    </>,
    document.body,
  );
}

function WelcomeCard({
  titleId,
  onStart,
  onSkip,
}: {
  titleId: string;
  onStart: () => void;
  onSkip: () => void;
}) {
  return (
    <>
      <div className="tour-welcome-badge" aria-hidden="true">
        <span>✦</span> New to Candler
      </div>
      <h2 id={titleId} className="tour-welcome-headline">
        {"Welcome. Let’s show you around."}
      </h2>
      <p className="tour-welcome-sub">
        A quick tour of appearance, projects, Vault, and the rest of your workspace. Takes under a minute.
      </p>
      <div className="tour-welcome-actions">
        <button type="button" className="tour-welcome-start" data-autofocus onClick={onStart}>
          Start tour
        </button>
        <button type="button" className="tour-welcome-skip" onClick={onSkip}>
          Skip for now
        </button>
      </div>
    </>
  );
}

function StepCard({
  titleId,
  step,
  stepIndex,
  total,
  onNext,
  onBack,
  onSkip,
  phraseStatus,
  onPhraseStatus,
}: {
  titleId: string;
  step: TourStep;
  stepIndex: number;
  total: number;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  phraseStatus: VaultPhraseSetupStatus;
  onPhraseStatus: (status: VaultPhraseSetupStatus) => void;
}) {
  const modK = useModShortcutLabel("K");
  const body = step.body.replaceAll("{modK}", modK);
  const modeLabel = useId();
  const accentLabel = useId();
  const phraseBlocksNext = step.interactive === "vault-phrase" && phraseStatus === "needed";
  return (
    <>
      <p className="tour-card-eyebrow" aria-hidden="true">
        Step {stepIndex + 1} of {total}
      </p>
      {step.interactive === "vault-phrase" ? (
        <VaultPhraseSetup variant="tour" titleId={titleId} onStatus={onPhraseStatus} />
      ) : (
        <>
          <h2 id={titleId} className="tour-card-h2">
            {step.title}
          </h2>
          <p className="tour-card-body">{body}</p>
        </>
      )}
      {step.interactive === "appearance" ? (
        <div className="tour-appearance">
          <div className="appearance-field">
            <span id={modeLabel}>Mode</span>
            <AppearanceToggle labelledBy={modeLabel} />
          </div>
          <div className="appearance-field">
            <span id={accentLabel}>Accent color</span>
            <AccentSwatches labelledBy={accentLabel} />
          </div>
        </div>
      ) : null}
      <div className="tour-card-progress">
        <CandlerProgress value={stepIndex + 1} max={total} />
      </div>
      <div className="tour-card-actions">
        <button type="button" className="tour-btn-skip" onClick={onSkip}>
          Skip tour
        </button>
        {stepIndex > 0 && (
          <button type="button" className="tour-btn-back" onClick={onBack}>
            Back
          </button>
        )}
        <button
          type="button"
          className="tour-btn-next"
          data-autofocus={step.interactive === "vault-phrase" ? undefined : true}
          onClick={onNext}
          disabled={phraseBlocksNext}
        >
          {stepIndex < total - 1 ? "Next" : "Finish"}
        </button>
      </div>
    </>
  );
}

function DoneCard({
  titleId,
  onDone,
  onReplay,
}: {
  titleId: string;
  onDone: () => void;
  onReplay: () => void;
}) {
  return (
    <>
      <div className="tour-done-glyph" aria-hidden="true">✦</div>
      <h2 id={titleId} className="tour-done-headline">
        {"You're all set."}
      </h2>
      <p className="tour-done-sub">
        You’re all set. Need a refresher later? You can replay this tutorial anytime from Settings.
      </p>
      <div className="tour-done-actions">
        <button type="button" className="tour-btn-back" onClick={onReplay}>
          Replay tour
        </button>
        <button type="button" className="tour-btn-done" data-autofocus onClick={onDone}>
          Get started
        </button>
      </div>
    </>
  );
}
