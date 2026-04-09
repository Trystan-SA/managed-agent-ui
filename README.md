# Managed Agents

A self-hosted dashboard for orchestrating autonomous Claude agents. Monitor, control, and deploy AI agents with end-to-end encryption and real-time streaming.

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

| Variable | Required | Default | Description |
|---|---|---|---|
| `POSTGRES_PASSWORD` | Yes | — | PostgreSQL password |
| `POSTGRES_USER` | No | `managed_agents` | PostgreSQL user |
| `POSTGRES_DB` | No | `managed_agents` | PostgreSQL database name |
| `ENCRYPTION_KEY` | Yes | — | 64-char hex string for AES-256-GCM API key encryption |
| `SESSION_SECRET` | Yes | — | Random string for session signing |
| `SETUP_PASSWORD` | Yes* | — | One-time password for initial admin account creation |
| `PORT` | No | `3000` | Port to expose the app on |

*`SETUP_PASSWORD` is only needed until the admin account is created. It can be removed from `.env` afterwards.

## Development

### Docker (recommended)

```sh
docker compose -f docker-compose.dev.yml up --build
```

Open `http://localhost:5173`. Source files are volume-mounted — edits to `src/`, `static/`, config files, and migrations trigger live reload automatically.

### Local (no Docker for the app)

```sh
# Start PostgreSQL
docker compose -f docker-compose.dev.yml up postgres -d

# Install dependencies and run dev server
npm install
npm run dev
```

## Architecture

- **Frontend**: SvelteKit 5, SCSS
- **Backend**: SvelteKit server routes, Drizzle ORM
- **Database**: PostgreSQL 16
- **Auth**: bcrypt passwords, in-memory sessions, AES-256-GCM encrypted API keys
- **API**: Anthropic Claude API proxy with SSE streaming
