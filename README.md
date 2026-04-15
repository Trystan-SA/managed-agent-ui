# ManagedAgentUI — Self-Hosted Control Panel for Anthropic Managed Agents

Deploy, monitor, and chat with autonomous Claude agents — end-to-end encrypted, fully Dockerized.

## Features

- **Agent Management** — Create, configure, and version managed agents, with a sticky version-history panel on the edit page that restores any prior config in place
- **Scheduled Tasks (CRON)** — In-process cron scheduler runs agents on recurring triggers with rendered prompt templates; every run records its prompt, response, and duration
- **Multi-user Auth** — First user becomes admin; additional users onboarded via email or manual-URL invites (48h expiry)
- **Self-hosted** — Run everything with a single `docker compose up`

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- [Node.js](https://nodejs.org/) 22+ (for development)
- An [Anthropic API key](https://console.anthropic.com/) with Managed Agents access

## Quick Start (Docker)

1. Clone the repository and create your config:

```sh
git clone <repo-url> managed-agents
cd managed-agents
cp .env.example .env
```

2. Edit `.env` with your values:

```sh
# Required — change all of these
POSTGRES_PASSWORD=your-database-password
ENCRYPTION_KEY=<run: openssl rand -hex 32>
SESSION_SECRET=<run: openssl rand -hex 32>
SETUP_PASSWORD=your-one-time-setup-password
```

3. Start everything:

```sh
docker compose up -d
```

4. Open `http://localhost:3000` — you'll be redirected to the initial setup page. Enter your setup password and create your admin account.

That's it. After the admin account is created, the setup page is permanently disabled.

## Environment Variables

| Variable            | Required | Default          | Description                                           |
| ------------------- | -------- | ---------------- | ----------------------------------------------------- |
| `POSTGRES_PASSWORD` | Yes      | —                | PostgreSQL password                                   |
| `POSTGRES_USER`     | No       | `managed_agents` | PostgreSQL user                                       |
| `POSTGRES_DB`       | No       | `managed_agents` | PostgreSQL database name                              |
| `ENCRYPTION_KEY`    | Yes      | —                | 64-char hex string for AES-256-GCM API key encryption |
| `SESSION_SECRET`    | Yes      | —                | Random string for session signing                     |
| `SETUP_PASSWORD`    | Yes\*    | —                | One-time password for initial admin account creation  |
| `PORT`              | No       | `3000`           | Port to expose the app on                             |

\*`SETUP_PASSWORD` is only needed until the admin account is created. It can be removed from `.env` afterwards.

## Development

```sh
npm run dev
```

This starts the dev container (PostgreSQL + app) via Docker Compose. Open `http://localhost:5173`. Source files are volume-mounted — edits to `src/`, `static/`, config files, and migrations trigger live reload automatically.

## Contributing

Contributions are welcome! Please open an issue to discuss your idea before submitting a pull request.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Run `npm run dev` to start the dev environment
4. Make your changes and ensure `npm run check` and `npm run lint` pass
5. Commit your changes and open a pull request

## Architecture

- **Frontend**: Svelte 5 + SvelteKit 2.57, SCSS design tokens
- **Backend**: SvelteKit server routes (Node adapter), Drizzle ORM 0.45
- **Database**: PostgreSQL 16
- **Auth**: bcrypt passwords, DB-backed sessions, AES-256-GCM encrypted secrets
- **Anthropic API**: proxied through `/api/*`; SSE streaming for agent responses; `user.interrupt` for cancel
- **MCP credentials**: stored in per-user Anthropic vaults (static bearer or OAuth 2.0); client never sees tokens after they're submitted
- **Scheduler**: in-process `node-cron` with lock-based concurrency and stale-lock sweeping

For the full design, see [`spec/`](./spec) — chaptered domain specifications starting from [1.0.0 Architecture](./spec/1.0.0-architecture.md).

## License

[MIT](LICENSE)
