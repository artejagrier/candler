# Protected environment sky

Audited 2026-09-01 before the Candler product reset. These files are protected
and must not be rewritten except for the smallest possible application-shell
integration:

- `components/sky/SkyBackground.tsx` — cloud, star, and shooting-star layers.
  Mounted only while an environment Mode is explicitly selected or previewed.
- `components/providers/SkyProvider.tsx` — explicit override only. No local-time
  auto period, no boundary timer, no default night/morning from the clock.
- `lib/utilities/time.ts` — period names and 05:00, 12:00, 17:00, and 20:00
  timing boundaries (used by greeting copy and environment palette mapping).
- `app/globals.css` lines under **Protected environment sky** — all gradients,
  clouds, stars, shooting-star animation, timings, transitions, and
  reduced-motion behavior.
- `app/layout.tsx` — root integration that mounts the provider and background.

The former development hover strip (`SkyPreviewControl`) was removed. Sunrise,
Day, Sunset, and Night are selected only from the Mode dropdown under
**Special Environments**. Color modes (Burgundy, White, Dark, …) use a solid
workspace background and never inherit a time-of-day sky.

Protected visual baseline (when an environment mode is active):

- Morning (sunrise): 05:00–11:59 palette
- Afternoon (daytime): 12:00–16:59 palette
- Evening (sunset): 17:00–19:59 palette
- Night: 20:00–04:59 palette, stars, flying star
- Background/star transition: 1200ms ease
- Cloud drift: 90s linear infinite
- Star twinkle: 6s ease-in-out infinite
- Flying/shooting star: 11s cycle, 3s delay

Do not restore automatic local-time switching. Environment modes stay opt-in.
