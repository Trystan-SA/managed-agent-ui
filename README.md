# Self-Hosted Control Panel for Anthropic Managed Agents

Deploy, monitor, schedule and chat with autonomous Claude agents, fully Dockerized.

After the announcement by Anthropic of its Managed Agents API (8 April) I noticed their UI was difficult to use and lacking features like scheduling or automations.
So I decided to create my own open-source self-hosted UI wrapper. More feature are comming (better UX, MCP integration). I made this beta release available to start getting reviews and idea about this tool. Contributions are welcome !

![Dashboard chat view](static/repo_example_1.png)

## Features

- **Agent Management** — Create, configure, and version managed agents, with a sticky version-history panel on the edit page that restores any prior config in place
- **Scheduled Tasks (CRON)** — In-process cron scheduler runs agents on recurring triggers with rendered prompt templates; every run records its prompt, response, and duration
- **Multi-user Auth** — First user becomes admin; additional users onboarded via email or manual-URL invites (48h expiry)
- **Self-hosted** — Run everything with a single `docker compose up`

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose
- [Node.js](https://nodejs.org/) 22+ (for development)
- An [Anthropic API key](https://console.anthropic.com/) with Managed Agents access

## Docker Hub

```
trystansarrade/managed-agent-ui:latest
```

> **Pinning a version:** Replace `latest` with a specific tag (e.g. `trystansarrade/managed-agent-ui:0.1.0`) to lock to a release.

### Environment Variables

| Variable         | Required | Default       | Description                                                    |
| ---------------- | -------- | ------------- | -------------------------------------------------------------- |
| `DATABASE_URL`   | Yes      | —             | PostgreSQL connection string                                   |
| `ENCRYPTION_KEY` | Yes      | —             | 64-char hex string for AES-256-GCM (`openssl rand -hex 32`)    |
| `SESSION_SECRET` | Yes      | —             | Random hex string for session signing (`openssl rand -hex 32`) |
| `SETUP_PASSWORD` | Yes\*    | —             | One-time password for initial admin account creation           |
| `NODE_ENV`       | No       | `development` | Set to `production` for Docker deployments                     |
| `PORT`           | No       | `3000`        | Port the app listens on inside the container                   |

\*`SETUP_PASSWORD` is only needed until the admin account is created. It can be removed afterwards.

### Option A — Docker CLI

Start a PostgreSQL container and the app manually:

```sh
# 1. Create a network
docker network create managed-agents

# 2. Start PostgreSQL
docker run -d \
  --name managed-agents-db \
  --network managed-agents \
  -e POSTGRES_USER=managed_agents \
  -e POSTGRES_PASSWORD=change-me-to-a-strong-password \
  -e POSTGRES_DB=managed_agents \
  -v pgdata:/var/lib/postgresql/data \
  postgres:16-alpine

# 3. Start Managed Agent UI
docker run -d \
  --name managed-agents-app \
  --network managed-agents \
  -p 3000:3000 \
  -e DATABASE_URL=postgres://managed_agents:change-me-to-a-strong-password@managed-agents-db:5432/managed_agents \
  -e ENCRYPTION_KEY=$(openssl rand -hex 32) \
  -e SESSION_SECRET=$(openssl rand -hex 32) \
  -e SETUP_PASSWORD=change-me \
  -e NODE_ENV=production \
  trystansarrade/managed-agent-ui:latest
```

### Option B — Docker Compose

Create a `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: managed_agents
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: managed_agents
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U managed_agents"]
      interval: 5s
      timeout: 5s
      retries: 5

  app:
    image: trystansarrade/managed-agent-ui:latest
    restart: unless-stopped
    ports:
      - "${PORT:-3000}:3000"
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      DATABASE_URL: postgres://managed_agents:${POSTGRES_PASSWORD}@postgres:5432/managed_agents
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
      SESSION_SECRET: ${SESSION_SECRET}
      SETUP_PASSWORD: ${SETUP_PASSWORD}
      NODE_ENV: production

volumes:
  pgdata:
```

Create a `.env` file next to it:

```sh
POSTGRES_PASSWORD=change-me-to-a-strong-password
ENCRYPTION_KEY=<run: openssl rand -hex 32>
SESSION_SECRET=<run: openssl rand -hex 32>
SETUP_PASSWORD=change-me
```

Then start everything:

```sh
docker compose up -d
```

### First Launch

Open `http://localhost:3000` (or your VM address) - you'll be redirected to the initial setup page. Enter your setup password and create your admin account. After the admin account is created, the setup page is permanently disabled.

## Quick Start (Build from Source)

If you want to build the image yourself or contribute to the project:

1. Clone the repository and create your config:

```sh
git clone https://github.com/Trystan-SA/managed-agent-ui.git managed-agents
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
docker compose -f docker/docker-compose.yml up -d --build
```

4. Open `http://localhost:3000` — you'll be redirected to the initial setup page. Enter your setup password and create your admin account.

That's it. After the admin account is created, the setup page is permanently disabled.

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
