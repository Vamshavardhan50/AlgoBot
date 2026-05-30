# AlgoBot

AlgoBot is a production-ready Competitive Programming Discord bot that delivers daily contest alerts, POTD posts, resource sharing, and custom embed creation with persistent SQLite storage.

## Features

- Daily contest alerts + 30-minute reminders
- Daily POTD posting
- Resource sharing + editing + listing
- Custom embed builder with preview
- Role-based notifications
- Slash command architecture
- SQLite persistence
- Scheduler auto-start on boot

## Tech Stack

- Node.js + Discord.js v14 (ESM)
- SQLite (better-sqlite3)
- axios, node-cron, dotenv
- Express health endpoint
- Sharp (optional dependency for future image workflows)

## Setup

> Recommended Node.js: 18, 20, or 22 (LTS).

1. Install dependencies

```bash
npm install
```

2. Configure environment

```bash
cp .env.example .env
```

Fill in `DISCORD_TOKEN` and `DISCORD_CLIENT_ID`. Add `DISCORD_GUILD_ID` for faster guild-only command deploys.

3. Deploy commands

```bash
npm run deploy-commands
```

4. Start the bot

```bash
npm run dev
```

## Core Commands

### Admin

- `/setup` - Create default channels and roles.
- `/contest-channel`, `/contest-role`
- `/potd-channel`, `/potd-role`
- `/resource-channel`

### Contests

- `/contest-add`
- `/contest-remove`
- `/contest-list`
- `/contest-send`
- `/contest-fetch`

### POTD

- `/potd-add`
- `/potd-remove`
- `/potd-list`
- `/potd-send`

### Resources

- `/resource-share`
- `/resource-edit`
- `/resource-delete`
- `/resource-list`

### Embed Builder

- `/embed-create`
- `/embed-preview`
- `/embed-send`
- `/embed-clear`

## Scheduler

- Contest alerts: `CONTEST_ALERT_TIME` (default 08:00 IST)
- POTD alerts: `POTD_ALERT_TIME` (default 09:00 IST)
- Contest reminders: every 5 minutes for contests within the reminder window

## Deployment

Build and run with Docker:

```bash
docker build -t algobot .
docker run -e DISCORD_TOKEN=... -e DISCORD_CLIENT_ID=... algobot
```

## Health Endpoint

If `HEALTH_ENDPOINT=true`, AlgoBot serves `GET /health` on port `PORT`.
