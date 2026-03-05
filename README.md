# signal-watcher-ui

[![CI](https://github.com/simomerendi/signal-watcher-ui/actions/workflows/ci.yml/badge.svg)](https://github.com/simomerendi/signal-watcher-ui/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Astro SSR dashboard for [cloudflare-signal-watcher](https://github.com/simomerendi/cloudflare-signal-watcher). Provides sign-up/sign-in with Better Auth on Cloudflare D1, API key management, a live signal feed, and a browser-based CLI auth flow.

Single-tenant edition — one deployment per cloudflare-signal-watcher instance.

## Prerequisites

- [cloudflare-signal-watcher](https://github.com/simomerendi/cloudflare-signal-watcher) deployed and running
- A Cloudflare account with D1 available
- `pnpm` and `wrangler` installed

## Quick start

```bash
git clone https://github.com/simomerendi/signal-watcher-ui
cd signal-watcher-ui
cp .dev.vars.example .dev.vars
# fill in values in .dev.vars (see Environment variables below)
pnpm install
pnpm run dev    # starts Astro dev server at http://localhost:4321
```

## Environment variables

Copy `.dev.vars.example` to `.dev.vars` for local development. For production, set these as Wrangler secrets or in your `wrangler.jsonc`.

| Variable | Description |
|---|---|
| `BETTER_AUTH_SECRET` | Any 32+ character random string for session signing (`openssl rand -hex 32`) |
| `BETTER_AUTH_URL` | Full URL of this app (e.g. `https://ui.example.workers.dev`) |
| `SIGNAL_WATCHER_URL` | Base URL of your cloudflare-signal-watcher worker |
| `SIGNAL_WATCHER_TOKEN` | Bearer token matching the worker's `API_TOKEN` |
| `ADMIN_TOKEN` | Admin token for creating invitation links |

See `.dev.vars.example` for the full reference.

## Deployment

```bash
# 1. Create D1 database (first time only)
wrangler d1 create signal-watcher-auth

# 2. Apply migrations
pnpm run migrate:apply:remote

# 3. Set secrets
wrangler secret put BETTER_AUTH_SECRET    # openssl rand -hex 32
wrangler secret put SIGNAL_WATCHER_TOKEN
wrangler secret put ADMIN_TOKEN

# 4. Deploy
pnpm run deploy    # runs astro build && wrangler deploy
```

## Tech stack

| Layer | Technology |
|---|---|
| Framework | [Astro](https://astro.build) (SSR, Cloudflare adapter) |
| UI components | React 19 islands |
| Auth | [Better Auth](https://better-auth.com) with API key plugin |
| Database | Cloudflare D1 (SQLite) via Drizzle ORM |
| Styling | Tailwind CSS |
| Runtime | Cloudflare Workers |

## License

[MIT](LICENSE)
