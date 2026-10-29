# 01 · Authentication vs Authorization

A small fitness app, **Pulse**, with three plans: Basic, Pro and Elite.

| | Question | Where in the code | Failure |
|---|---|---|---|
| **Authentication** | *Who are you?* | `backend/src/routes/auth.js` (login), `backend/src/middleware/authenticate.js` | `401 Unauthorized` |
| **Authorization** | *What are you allowed to do?* | `backend/src/middleware/authorize.js` | `403 Forbidden` |

## Stack

- **Postgres 16** in Docker (container `postgres-authn-authz`, host port **5433**)
- **Express 5** API: `bcrypt` for password hashing, `jsonwebtoken` for the session token, stored in an httpOnly cookie
- **React + Vite** frontend (`react-router-dom`, `lucide-react` icons, `sonner` toasts, Inter font)

```
01-authn-vs-authz/
├── docker-compose.yml        # runs the Postgres container
├── db/
│   ├── Dockerfile            # postgres:16-alpine + init.sql
│   └── init.sql              # users table + 3 demo members
├── backend/
│   ├── .env                  # PORT, DATABASE_URL, JWT_SECRET
│   └── src/
│       ├── server.js
│       ├── db.js
│       ├── middleware/
│       │   ├── authenticate.js   ← AUTHENTICATION
│       │   └── authorize.js      ← AUTHORIZATION (3 strategies)
│       └── routes/
│           ├── auth.js           # register / login / logout / me
│           ├── fitness.js        # the protected features
│           └── dbConsole.js      # demo-only SQL console for /db
└── frontend/
    └── src/pages/            # Login, Dashboard, Database
```

## Running it

You need Node 20+ and Docker Desktop (it must be running).

**1. Start the database** (from this folder)

```bash
docker compose up -d --build
```

The first start creates the `users` table and the three demo members.

**2. Start the API** (new terminal)

```bash
cd backend
npm install          # first time only
npm run dev          # http://localhost:4000, restarts on file changes
```

If `.env` is missing, copy `.env.example` to `.env`.

**3. Start the frontend** (another terminal)

```bash
cd frontend
npm install          # first time only
npm run dev          # http://localhost:5173
```

Open **http://localhost:5173**. The database view is at **http://localhost:5173/db**.

### Demo members

All passwords are `password123`. You can click one on the login page to fill it in.

| Email | Role | Can see |
|---|---|---|
| basic@pulse.fit | basic | Workout log |
| pro@pulse.fit | pro | + Training plans, Analytics |
| elite@pulse.fit | elite | + Personal coach |

### Stopping and resetting

```bash
docker compose stop        # stop the DB, keep the data
docker compose start       # start it again
docker compose down -v     # delete the container AND its data
docker compose up -d --build   # fresh DB with only the 3 demo members
```

Stop the API and frontend with `Ctrl + C` in their terminals.

### Connecting from another tool

```
host: localhost   port: 5433   db: authdemo   user: postgres   password: postgres
```

Or: `docker exec -it postgres-authn-authz psql -U postgres -d authdemo`

> **Note:** the `/db` SQL console runs any query as the Postgres superuser. It exists for local demonstration only. The API listens on 127.0.0.1 only, but never build an endpoint like this into a real app.
