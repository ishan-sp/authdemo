# 02 · Session-based authentication

**Harbor**, a small banking app. Customers sign in with email and password. An admin watches every live session and can revoke sessions or ban users, and it takes effect instantly.

The idea in one line: **the browser holds a random id; the server holds the session.** Because the server looks the session up on every request, it can end it at any moment.

## Stack

- **MongoDB 7** in Docker (container `mongo-session-auth`, port **27017**). View it in **MongoDB Compass** at `mongodb://localhost:27017`, database `harborbank`.
- **Express 5** API with the official `mongodb` driver and `bcrypt`. Sessions are hand-written (no express-session), so every step is visible.
- **React + Vite** frontend on port **5174**.

```
02-session-auth/
├── docker-compose.yml           # MongoDB
├── backend/
│   ├── .env                     # PORT, MONGO_URL, IDLE_MINUTES, ABSOLUTE_HOURS
│   └── src/
│       ├── db.js                # collections + TTL index
│       ├── seed.js              # resets the demo data
│       ├── middleware/
│       │   └── session.js       ← create + check sessions (the core idea)
│       └── routes/
│           ├── auth.js          # login / logout / me
│           ├── account.js       # balances, "your devices", sign out other devices
│           └── admin.js         ← revoke one, revoke all, ban, unban
└── frontend/src/pages/          # Login, Account, Admin
```

## Collections

| Collection | What's in it |
|---|---|
| `users` | name, email, `passwordHash` (bcrypt), `role` (customer / admin), `status` (active / banned), accounts, transactions |
| `sessions` | `_id` = the session id in the cookie, `userId`, `createdAt`, `lastSeenAt`, `expiresAt`, `device`, `ip`, `revokedAt`, `revokedBy`, `revokedReason` |
| `audit_log` | every sign-in, failed sign-in, sign-out, revoke and ban |

## Running it

You need Node 20+ and Docker Desktop (running).

```bash
# 1. Database (from this folder)
docker compose up -d

# 2. API (new terminal)
cd backend
npm install        # first time only
npm run seed       # creates the demo users (run again any time to reset)
npm run dev        # http://localhost:4001

# 3. Frontend (another terminal)
cd frontend
npm install        # first time only
npm run dev        # http://localhost:5174
```

Open **http://localhost:5174**. In Compass, connect to `mongodb://localhost:27017` and open `harborbank`.

### Demo users (password `password123`)

| Email | Role |
|---|---|
| ananya@harbor.bank | customer |
| vikram@harbor.bank | customer |
| meera@harbor.bank | customer |
| admin@harbor.bank | admin |

> **One browser holds one session cookie.** To be a customer and the admin at the same time, use a normal window for one and an **incognito window** (or a different browser) for the other. Sign in as the same customer in both to see two devices.

### Stopping and resetting

```bash
npm run seed               # (in backend/) wipe and re-create the demo data
docker compose stop        # stop MongoDB, keep data
docker compose down -v     # delete the container and its data
```
