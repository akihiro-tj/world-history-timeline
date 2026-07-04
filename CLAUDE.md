# CLAUDE.md

Timeline app that visualizes the synchronicity of world history: regional
lanes on a shared vertical time axis. Static SPA (Vite + React + TypeScript)
served from Cloudflare Workers static assets.

## Commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Dev server |
| `pnpm test` | Run all tests (Vitest) |
| `pnpm vitest run <path>` | Run a single test file |
| `pnpm typecheck` / `pnpm lint` / `pnpm format` | tsc / Biome check / Biome format |
| `pnpm validate-data` | Validate timeline data against schemas |
| `pnpm build` | validate-data + typecheck + vite build |
| `pnpm deploy` | Build and deploy to Cloudflare Workers |

## Architecture

- `src/domain/` — pure functions with no React dependency (scale, group
  packing, ticks, importance filtering, query parsing, contemporaries,
  zoom math). Start logic changes from the tests here.
- `src/components/` — SVG rendering and UI. All state is orchestrated in
  `TimelinePage`.
- `src/data/` — zod schemas (`schema.ts` is the single source of truth for
  types), cross-dataset validation, fetching.
- `public/data/*.json` — the timeline data itself. `scripts/validate-data.ts`
  validates it in CI and before every build.

## Conventions

- Years are integers only; BC years are negative (300 BC → `-300`). All
  display formatting goes through `src/domain/format.ts`.
- Entries: `ruler` / `person` require `end`; only `event` may omit it
  (point event). `group` requires `groupName`.
- Color ownership: region colors are data (`public/data/regions.json`);
  UI colors are design tokens (`DESIGN.md` → `@theme` in `src/index.css`).
  Do not blur this boundary.
- UI copy is Japanese; commit messages are English (conventional commits).
- Domain modules always get unit tests; UI is covered by RTL tests on the
  main flows.
