# Docker Setup & Testing Guide

This branch contains the Docker containerisation for the NYSI INSMS application.
All three services (Frontend, Backend, Python Services) are containerised and orchestrated with Docker Compose.

## Prerequisites

Make sure **Docker Desktop** is installed and running before proceeding.

```bash
docker --version
docker compose version
```

---

## Step 1 — Create your `.env` file

```bash
cp .env.example .env
```

Then open `.env` and fill in the real values. You can copy them from `Backend/.env`:

| `.env` key | Where to find it |
|---|---|
| `PGHOST` | Your RDS/database host |
| `PGDATABASE`, `PGUSER`, `PGPASSWORD` | Your database credentials |
| `PGSSLMODE` | `require` for AWS RDS, `disable` for local Postgres |
| `JWT_SECRET` | Your JWT secret key |
| `EMAIL_USER`, `EMAIL_PASSWORD` | Your Gmail address and app password |
| `OPENAI_API_KEY` | Your OpenAI API key |

---

## Step 2 — Build and start everything

```bash
docker compose up --build
```

> **Note:** The first build takes **20–40 minutes** because Docker has to download and install PyTorch, PaddleOCR, and Playwright inside the Python container. This only happens once — after that it uses the layer cache and starts in seconds.

Watch the logs. Services start in order: `backend` → `python` → `frontend`.

---

## Step 3 — Verify each service is running

Open these in your browser:

| Service | URL | Expected |
|---|---|---|
| Frontend app | http://localhost:3000 | Login page |
| Backend Swagger docs | http://localhost:8000/docs | Interactive API docs |
| Python Services docs | http://localhost:8001/docs | FastAPI docs |
| Backend health check | http://localhost:8000/api/health | `{"status":"healthy"}` |
| Python health check | http://localhost:8001/health | `{"status":"healthy"}` |

---

## Step 4 — Smoke test

Try logging in through the frontend at `http://localhost:3000`. If the 2FA email comes through and you land on the dashboard, everything is working — database, backend, auth, and frontend are all connected.

---

## Useful commands

```bash
# Live logs for all services
docker compose logs -f

# Logs for a specific service
docker compose logs -f backend
docker compose logs -f python
docker compose logs -f frontend

# Stop all containers
docker compose down

# Rebuild and restart a single service after a code change
docker compose up --build backend

# Check status of all containers
docker compose ps
```

---

## Common Issues

| Symptom | Likely cause |
|---|---|
| Frontend can't reach the API | `BACKEND_URL` env var incorrect, or backend container not healthy yet — wait a moment and refresh |
| Python service crashes on startup | Missing `OPENAI_API_KEY` or database credentials in `.env` |
| Database connection refused | Wrong `PGHOST`/`PGPASSWORD`, or `PGSSLMODE` mismatch (use `disable` for local Postgres) |
| Port already in use | Another process is running on port 3000, 8000, or 8001 — stop it before running Docker |

---

## Using a Local Database (optional)

By default this setup connects to an external database (e.g. AWS RDS). If you want a fully self-contained local setup, open `docker-compose.yml` and uncomment the `db:` service block at the bottom, then set `PGSSLMODE=disable` in your `.env`.
