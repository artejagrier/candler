import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const tour = readFileSync(new URL("../components/workspace/CandlerTour.tsx", import.meta.url), "utf8");
const shell = readFileSync(new URL("../components/product/ProductShell.tsx", import.meta.url), "utf8");
const menu = readFileSync(new URL("../components/product/AccountMenu.tsx", import.meta.url), "utf8");
const settings = readFileSync(new URL("../app/(product)/app/settings/page.tsx", import.meta.url), "utf8");
const replay = readFileSync(new URL("../components/workspace/ReplayTutorial.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

// ── Persistence ──────────────────────────────────────────────────────────────

test("TOUR_KEY is candler-tour-v1", () => {
  assert.ok(tour.includes('TOUR_KEY = "candler-tour-v1"'), "TOUR_KEY constant must equal candler-tour-v1");
});

test("tour marks skipped in localStorage when user skips", () => {
  assert.ok(
    tour.includes('localStorage.setItem(TOUR_KEY, "skipped")'),
    "Skip must write 'skipped' to localStorage",
  );
});

test("tour marks completed in localStorage when user finishes", () => {
  assert.ok(
    tour.includes('localStorage.setItem(TOUR_KEY, "completed")'),
    "Done must write 'completed' to localStorage",
  );
});

test("tour auto-shows only for new users (localStorage check on mount)", () => {
  assert.ok(
    tour.includes('localStorage.getItem(TOUR_KEY)'),
    "Must check localStorage on mount before auto-showing",
  );
});

test("auto-show is delayed (setTimeout) to let workspace render first", () => {
  assert.ok(tour.includes("setTimeout"), "Auto-show must use setTimeout to delay");
});

// ── Replay ───────────────────────────────────────────────────────────────────

test("replay event name is candler:tour:replay", () => {
  assert.ok(tour.includes('"candler:tour:replay"'), "Replay event constant must be candler:tour:replay");
});

test("AccountMenu dispatches replay event from Take a Tour button", () => {
  assert.ok(menu.includes("replayCandlerTour"), "AccountMenu must dispatch the shared replay helper");
  assert.ok(menu.includes("Take a tour"), "AccountMenu must render 'Take a tour' label");
  assert.ok(menu.includes("Compass"), "AccountMenu must use Compass icon for tour entry");
});

test("CandlerTour listens for replay event and resets to welcome", () => {
  assert.ok(
    tour.includes("addEventListener") && tour.includes('"candler:tour:replay"'),
    "CandlerTour must listen for the replay event",
  );
  assert.ok(tour.includes('setPhase("welcome")'), "Replay handler must set phase to welcome");
});

// ── Step count and content ───────────────────────────────────────────────────

test("tour has exactly 9 content steps", () => {
  // Count step objects in STEPS array by counting { id: entries
  const matches = tour.match(/\{\s*\n?\s*id:\s*"/g);
  assert.ok(matches, "STEPS array must contain step objects with id fields");
  assert.equal(matches.length, 9, "Must have exactly 9 steps");
});

test("Vault tutorial explains Vault Phrase as the second lock", () => {
  const vaultBlock = tour.slice(tour.indexOf('id: "vault"'), tour.indexOf('id: "authenticator"'));
  assert.ok(vaultBlock.includes("Your Vault Phrase is the second lock"));
  assert.ok(vaultBlock.includes("You only need one Vault Phrase"));
  assert.ok(vaultBlock.includes("12 and 128"));
  assert.ok(vaultBlock.includes("Write your Vault Phrase down"));
  assert.ok(vaultBlock.includes("five minutes"));
  assert.ok(vaultBlock.includes("remaining unlock time"));
  assert.ok(vaultBlock.includes("lock your Vault immediately"));
  assert.ok(vaultBlock.includes("Candler support will never ask you to send us your Vault Phrase"));
  assert.ok(vaultBlock.includes("Candler will never display your Vault Phrase"));
  assert.ok(vaultBlock.includes("What's Your Favorite Scary Movie Sydney?"));
  assert.equal(vaultBlock.includes("Recovery Phrase"), false);
});

test("Vault tutorial keeps Recovery codes distinct from Vault Phrase", () => {
  const recoveryBlock = tour.slice(tour.indexOf('id: "recovery"'), tour.indexOf('id: "cloud"'));
  assert.ok(recoveryBlock.includes("recovery codes"));
  assert.equal(recoveryBlock.includes("Vault Phrase"), false);
});

test("all expected step IDs are present", () => {
  const expected = ["appearance", "projects", "vault", "authenticator", "recovery", "cloud", "agent", "activity", "command-palette"];
  for (const id of expected) {
    assert.ok(tour.includes(`id: "${id}"`), `Step id '${id}' must be present in STEPS`);
  }
});

test("recovery step has no selector (it has no sidebar link)", () => {
  const recoveryBlock = tour.slice(
    tour.indexOf('id: "recovery"'),
    tour.indexOf('id: "recovery"') + 300,
  );
  assert.ok(recoveryBlock.includes("selector: undefined"), "Recovery step must have selector: undefined");
});

test("command-palette step targets the topbar search button", () => {
  assert.ok(
    tour.includes('[aria-label="Search and commands"]'),
    "Command palette step must target the search button",
  );
  assert.ok(tour.includes("useModShortcutLabel"), "Tour must use the shared shortcut helper");
});

// ── Progress tracking ────────────────────────────────────────────────────────

test("CandlerProgress is used in determinate mode for step progress", () => {
  assert.ok(tour.includes("CandlerProgress"), "Must import CandlerProgress");
  assert.ok(
    tour.includes("stepIndex + 1") && tour.includes("STEPS.length"),
    "CandlerProgress must receive value={stepIndex+1} max={STEPS.length}",
  );
});

// ── Accessibility ────────────────────────────────────────────────────────────

test("tour card is a proper dialog with aria-modal and aria-labelledby", () => {
  assert.ok(tour.includes('role="dialog"'), "Card must have role=dialog");
  assert.ok(tour.includes('aria-modal="true"'), "Card must have aria-modal=true");
  assert.ok(tour.includes("aria-labelledby={titleId}"), "Card must be labelled by its title");
});

test("tour card has tabIndex for focus fallback", () => {
  assert.ok(tour.includes("tabIndex={-1}"), "Card must have tabIndex=-1 for focus fallback");
});

test("Escape key closes the tour", () => {
  assert.ok(tour.includes('"Escape"'), "Must handle Escape key");
});

test("ArrowRight advances the tour", () => {
  assert.ok(tour.includes('"ArrowRight"'), "Must handle ArrowRight key");
});

test("data-autofocus is used to set initial focus on primary action", () => {
  assert.ok(tour.includes("data-autofocus"), "Primary action buttons must have data-autofocus for initial focus");
});

// ── Mounting / integration ────────────────────────────────────────────────────

test("CandlerTour is mounted in ProductShell", () => {
  assert.ok(shell.includes("CandlerTour"), "ProductShell must import and mount CandlerTour");
  assert.ok(shell.includes("<CandlerTour />"), "ProductShell must render <CandlerTour />");
});

test("CandlerTour uses createPortal into document.body", () => {
  assert.ok(tour.includes("createPortal"), "Must use createPortal");
  assert.ok(tour.includes("document.body"), "Portal target must be document.body");
});

test("tour delays portal rendering until mounted (SSR safety)", () => {
  assert.ok(tour.includes("mounted"), "Must gate portal on mounted state for SSR safety");
});

// ── CSS ───────────────────────────────────────────────────────────────────────

test("tour-card animation is defined in globals.css", () => {
  assert.ok(css.includes("tour-fade-in"), "globals.css must define tour-fade-in keyframe");
  assert.ok(css.includes("tour-slide-up"), "globals.css must define tour-slide-up for mobile");
  assert.ok(css.includes(".tour-card"), "globals.css must have .tour-card class");
  assert.ok(css.includes(".tour-spotlight"), "globals.css must have .tour-spotlight class");
  assert.ok(css.includes(".tour-scrim"), "globals.css must have .tour-scrim class");
});

test("tour CSS respects prefers-reduced-motion", () => {
  const reducedBlock = css.slice(
    css.indexOf("prefers-reduced-motion"),
    css.indexOf("prefers-reduced-motion") + 500,
  );
  assert.ok(reducedBlock.includes("tour-card") || css.match(/@media\(prefers-reduced-motion:reduce\)[^}]+tour-card/),
    "Tour card animation must be disabled under prefers-reduced-motion");
});

test("tour CSS includes light mode overrides", () => {
  assert.ok(
    css.includes('html[data-scheme="light"] .tour-spotlight'),
    "globals.css must override spotlight shadow for light mode",
  );
});

// ── Missing target graceful handling ─────────────────────────────────────────

test("useTourTarget returns null gracefully when selector finds no element", () => {
  assert.ok(
    tour.includes("setRect(null)") || tour.includes("setRect(el ? el.getBoundingClientRect() : null)"),
    "useTourTarget must return null when no element matches selector",
  );
});

test("card renders viewport-aware when rect is null (no target found)", () => {
  assert.ok(
    tour.includes("translateX(-50%)"),
    "cardStyle must horizontally-center the card when rect is null",
  );
  assert.ok(
    tour.includes("viewH * 0.30") || tour.includes("viewH * 0.3"),
    "cardStyle must position the card above centre to avoid bottom-clip on compact viewports",
  );
});

// ── Phases ───────────────────────────────────────────────────────────────────

test("tour has welcome, step, done, and hidden phases", () => {
  assert.ok(tour.includes('"welcome"'), "Tour must have welcome phase");
  assert.ok(tour.includes('"step"'), "Tour must have step phase");
  assert.ok(tour.includes('"done"'), "Tour must have done phase");
  assert.ok(tour.includes('"hidden"'), "Tour must have hidden phase");
});

test("WelcomeCard renders start and skip actions", () => {
  assert.ok(tour.includes("Start tour"), "Welcome card must have 'Start tour' button");
  assert.ok(tour.includes("Skip for now"), "Welcome card must have 'Skip for now' option");
});

test("DoneCard renders finish and replay actions", () => {
  assert.ok(tour.includes("Get started"), "Done card must have 'Get started' (finish) button");
  assert.ok(tour.includes("Replay tour"), "Done card must have 'Replay tour' option");
});

test("appearance step reuses live theme controls", () => {
  assert.ok(tour.includes('id: "appearance"'), "Appearance step must exist");
  assert.ok(tour.includes('interactive: "appearance"'), "Appearance step must be interactive");
  assert.ok(tour.includes("AppearanceToggle"), "Appearance step must reuse AppearanceToggle");
  assert.ok(tour.includes("AccentSwatches"), "Appearance step must reuse AccentSwatches");
  assert.ok(tour.includes("Make Candler yours."), "Appearance step title must match copy");
});

test("done card tells users they can replay from Settings", () => {
  assert.ok(
    tour.includes("You can replay this tutorial anytime from Settings."),
    "Completion copy must mention Settings replay",
  );
});

test("replay starts the same tour without resetting stored completion", () => {
  const start = tour.indexOf("const handler = () => {");
  const handler = tour.slice(start, start + 160);
  assert.ok(handler.includes('setPhase("welcome")'), "Replay must restart at welcome");
  assert.equal(handler.includes("localStorage.setItem"), false, "Replay must not write tour storage");
  assert.equal(handler.includes("localStorage.removeItem"), false, "Replay must not clear tour storage");
});

test("Settings exposes Replay Tutorial using the same tour", () => {
  assert.ok(settings.includes("ReplayTutorial"), "Settings page must render ReplayTutorial");
  assert.ok(replay.includes("Replay Tutorial"), "Settings must offer Replay Tutorial");
  assert.ok(replay.includes("replayCandlerTour"), "Replay must use the shared tour helper");
  assert.ok(replay.includes("Take the Candler tour again anytime."), "Replay copy must match");
});

test("light/dark toggle is rendered above Settings in account navigation", () => {
  const footer = shell.slice(shell.indexOf('aria-label="Account"'));
  const toggleAt = footer.indexOf("<AppearanceToggle compact />");
  const settingsAt = footer.indexOf("SIDEBAR_FOOTER");
  assert.ok(toggleAt >= 0, "Account nav must include the appearance toggle");
  assert.ok(settingsAt > toggleAt, "Appearance toggle must appear above Settings");
});
