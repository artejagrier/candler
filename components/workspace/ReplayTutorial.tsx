"use client";

import { replayCandlerTour } from "@/components/workspace/CandlerTour";

export function ReplayTutorial() {
  return (
    <section className="tour-replay" aria-labelledby="tour-replay-heading">
      <h2 id="tour-replay-heading">Tutorial</h2>
      <p>Take the Candler tour again anytime.</p>
      <button type="button" className="tour-replay-btn" onClick={replayCandlerTour}>
        Replay Tutorial
      </button>
    </section>
  );
}
