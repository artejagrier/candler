# Candler.dev

**The home for every software project.**

Candler is a secure developer workspace that connects your entire technology
stack — GitHub, Vercel, Supabase, Stripe, Cloudflare, API keys, environment
variables, credentials, domains, documentation, and more — and organizes
everything beneath a project. It bridges the services you already use; it does
not replace them.

> **Status:** Phase 1A (foundation) complete. This is an interface prototype.
> Data is mock, and no production cryptography is implemented yet — see
> [Security](#security-honesty).

## Tech stack

- **Next.js 16** (App Router, Turbopack, React 19.2) — TypeScript, strict mode
- **Tailwind CSS v4** (configured via `@theme` in `app/globals.css`)
- **lucide-react** for icons
- Planned: Supabase (auth, Postgres, RLS), Zod, React Hook Form, Stripe

> ⚠️ This project runs a modified Next.js with breaking changes from stock v15.
> Read the guides in `node_modules/next/dist/docs/` before writing framework
> code. Key differences already handled: async `params`/`searchParams`,
> `middleware` → `proxy`, Turbopack by default, `next lint` removed (ESLint CLI),
> `next.config` `turbopack` is top-level.

## Getting started

```bash
npm run dev     # start the dev server (Turbopack)
npm run build   # production build
npm run lint    # ESLint (flat config)
```

Open http://localhost:3000. The workspace lives at `/dashboard`; press
`⌘K` / `Ctrl+K` anywhere in the workspace to open the command palette.

## Project structure

```
app/
  layout.tsx            Root layout — fonts, metadata, ThemeProvider, optional sky
  page.tsx              Phase 1A foundation landing (marketing landing → 1B)
  globals.css           Design tokens (@theme), base styles, glass utils, sky
  (workspace)/          Route group (no URL segment) sharing the AppShell
    layout.tsx          Command palette + floating dock
    dashboard/          /dashboard  (Home)
    projects/           /projects and /projects/[projectId]
    vault/  integrations/  activity/  team/  security/  settings/
components/
  ui/                   Reusable primitives: Surface, Button, Input, Badge,
                        Modal, Kbd
  sky/                  SkyBackground (opt-in environment modes only)
  navigation/           Dock, CommandPalette, CommandPaletteProvider
  providers/            SkyProvider (explicit environment override)
  layout/               AppShell (workspace chrome)
  workspace/            WorkspacePlaceholder, Greeting
  marketing/            FoundationPreview (design-system tour)
config/                 navigation, commands, site metadata
lib/
  utilities/            cn (classnames), time (sky periods)
  mock/                 Prototype mock data (example projects)
hooks/                  useMediaQuery, usePrefersReducedMotion
types/                  Shared TypeScript types
```

## Design language

Black glass surfaces, purple borders and glow, white typography. Colors are
defined once as tokens in `app/globals.css` (`--color-ink`, `--color-purple`,
`--color-lavender`, …) and consumed as Tailwind utilities (`bg-ink`,
`text-lavender`). Green/yellow/red appear **only** as restrained status colors,
never decoration.

### Workspace appearance

Default Burgundy is a stable, Vercel-like workspace: solid sidebar, clean
surfaces, burgundy identity, neon-green actions. Optional **Special
Environments** (Sunrise, Day, Sunset, Night) live in the Mode dropdown and
apply only when chosen. They are not driven by local time. Night keeps the
protected star field and flying star while that mode is active.

## Accessibility

Semantic HTML, visible focus rings, keyboard-navigable dock and command palette,
a focus-trapped modal, ARIA labels on icon-only controls, status conveyed by
icon **and** text (never color alone), and reduced-motion support.

## <a id="security-honesty"></a>Security honesty

This phase is an **interface prototype**. There is no `encrypt()` function
pretending to be secure, and no real secrets are stored. The UI and data
abstractions are intentionally shaped so real, production-grade security
(client-side/envelope encryption, Supabase RLS, MFA, audit trails) can be added
correctly in later phases — see `AGENTS.md` and the build plan.
