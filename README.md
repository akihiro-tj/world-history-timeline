# World History Timeline

A timeline app for grasping the "who, when, where" of world history at a glance.
Regional lanes share a single vertical time axis, so you can see what was
happening across the world at the same moment — rulers, notable figures, and
events side by side.

## Development

```bash
pnpm install
pnpm dev
```

| Command | Description |
| --- | --- |
| `pnpm dev` | Start the dev server |
| `pnpm test` | Run tests |
| `pnpm validate-data` | Validate timeline data |
| `pnpm build` | Validate data, type-check, and build |
| `pnpm deploy` | Build and deploy to Cloudflare Workers |

## Adding data

Add entries to `public/data/entries.json` and run `pnpm validate-data`.
The schema lives in `src/data/schema.ts`. Years are integers; BC years are
negative (300 BC → `-300`). Design docs are under `docs/superpowers/specs/`.

## Deployment

Deployed to Cloudflare Workers as an assets-only Worker. All deploy
configuration lives in `wrangler.jsonc`; CI deploys on every push to `main`
via `cloudflare/wrangler-action` (requires `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID` in GitHub Secrets).
