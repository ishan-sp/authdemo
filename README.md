# authdemo

Hands-on examples of web authentication concepts. Each folder is a self-contained project with its own dependencies and database.

| Project | Topic | Stack |
|---|---|---|
| [`01-authn-vs-authz`](01-authn-vs-authz) | Authentication vs authorization, password hashing, role-based access | React · Express · PostgreSQL |
| [`02-session-auth`](02-session-auth) | Server-side sessions, revocation, idle timeouts | React · Express · MongoDB |

Assignments: [`assignments/auth-assignments.pdf`](assignments/auth-assignments.pdf)

## Requirements

- Node.js 20+
- Docker Desktop

## Getting started

Every project runs the same way: start its database, then the API and the frontend in separate terminals.

```bash
cd 01-authn-vs-authz            # or 02-session-auth
docker compose up -d --build    # database

cd backend
cp .env.example .env
npm install
npm run seed                    # 02-session-auth only
npm run dev

cd ../frontend                  # in a new terminal
npm install
npm run dev
```

| Project | App | API | Database |
|---|---|---|---|
| 01-authn-vs-authz | http://localhost:5173 | :4000 | PostgreSQL on :5433 |
| 02-session-auth | http://localhost:5174 | :4001 | MongoDB on :27017 |

See each project's README for demo accounts and details.
