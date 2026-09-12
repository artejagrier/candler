# Protected time-of-day system

Audited 2026-09-01 before the Candler product reset. These files are protected
and must not be changed except for the smallest possible application-shell
integration:

- `components/sky/SkyBackground.tsx` — mounted cloud, star, and shooting-star layers.
- `components/providers/SkyProvider.tsx` — local-time state, exact-boundary timer, overrides, and transitions.
- `components/sky/SkyPreviewControl.tsx` — development-only four-period verification control.
- `lib/utilities/time.ts` — period names and 05:00, 12:00, 17:00, and 20:00 timing boundaries.
- `app/globals.css` lines under **Dynamic time-of-day sky** — all gradients, clouds, stars, shooting-star animation, timings, transitions, and reduced-motion behavior.
- `app/layout.tsx` — root integration that mounts the provider, background, and development preview.

Protected behavior baseline:

- Morning (sunrise): 05:00–11:59
- Afternoon (daytime): 12:00–16:59
- Evening (sunset): 17:00–19:59
- Night: 20:00–04:59
- Background/star transition: 1200ms ease
- Cloud drift: 90s linear infinite
- Star twinkle: 6s ease-in-out infinite
- Flying/shooting star: 11s cycle, 3s delay

The reset adds foreground UI only. Theme verification should use the existing
development preview control and confirm all four states plus night animations.
