# ManagedAgentUI — Self-Hosted Control Panel for Anthropic Managed Agents

Deploy, monitor, and chat with autonomous Claude agents — end-to-end encrypted, fully Dockerized.

## Features

- **Agent Management** — Create, configure, and version your managed agents
- **Environment Control** — Manage sandbox environments with networking and package settings
- **Session Tracking** — Monitor active and past agent sessions
- **Real-time Chat** — Stream agent responses via SSE with a live chat interface
- **Multi-user Auth** — First user becomes admin; each user manages their own API keys
- **Encrypted API Keys** — AES-256-GCM encryption at rest, decrypted server-side only
- **Dashboard Overview** — At-a-glance summary of agents, environments, and sessions
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

- **Frontend**: SvelteKit 5, SCSS
- **Backend**: SvelteKit server routes, Drizzle ORM
- **Database**: PostgreSQL 16
- **Auth**: bcrypt passwords, in-memory sessions, AES-256-GCM encrypted API keys
- **API**: Anthropic Claude API proxy with SSE streaming

## License

[MIT](LICENSE)
