# Take Care Patient (Platform)

Take Care Patient là nền tảng hỗ trợ bệnh nhân quản lý đơn thuốc, nhắc uống thuốc và theo dõi lịch tái khám. Sản phẩm ưu tiên web trước (Next.js SSR) và thiết kế để mở rộng sang mobile app sau.

Tài liệu chi tiết về MVP/UX/flow/kiến trúc đang nằm trong `c:\Honguyen\Patient\.trae\documents\`.

## Main Features

- Upload prescription image/PDF
- OCR + parse prescription data
- Review and confirm prescription details
- Search prescription history by disease name
- Family access with invite → accept → revoke flow
- Patient calendar sync
- Family export to family Google Calendar

## Tech Stack

- Frontend: Next.js + React + TypeScript
- Backend: NestJS
- Database: PostgreSQL + Prisma
- Local infra: Docker Compose, LocalStack
- OCR: currently local/dev implementation may differ by environment
- Auth in local: `local_jwt`

## Local Setup

### 1. Clone the repository

### 2. Install dependencies
If you are using Docker for all services, local `npm i` is optional.


## Run the Project
From the project root:

```bash
docker compose up --build
```

Or run in background:

```bash
docker compose up -d --build
```

### Start only infrastructure first

```bash
docker compose up -d postgres localstack
```

### Stop services

```bash
docker compose down
```

### Reset containers and volumes

Use this if you need a clean local database:

```bash
docker compose down -v
```

## Default Local URLs

- Web: `http://localhost:3000`
- Core API: `http://localhost:4000`
- Workflow: `http://localhost:4001`
- LocalStack: `http://localhost:4566`

## Local Environment Notes

Current Docker setup uses:

- local auth mode: `AUTH_MODE=local_jwt`
- PostgreSQL database: `takecare`
- PostgreSQL username: `takecare`
- PostgreSQL password: `takecare`

Inside Docker, services connect to Postgres using:

```text
postgresql://takecare:takecare@postgres:5432/takecare?schema=public
```

Do not change `@postgres:5432` for container-to-container communication unless you also change the internal service config.

## Database Setup

`core-api` runs Prisma push on startup with:

```bash
npm run db:push
```

You can also run it manually:

```bash
docker compose run --rm core-api npm run db:push
```

## Inspect the Database

### Option 1: psql inside Docker

```bash
docker compose exec postgres psql -U takecare -d takecare
```

Useful commands inside `psql`:

```sql
\dt
SELECT * FROM "User";
SELECT * FROM "Prescription";
SELECT * FROM "FamilyInvite";
\q
```

### Option 2: pgAdmin / TablePlus / DBeaver

Use these connection settings:

- Host: `127.0.0.1`
- Port: `5432` or your remapped host port
- Database: `takecare`
- Username: `takecare`
- Password: `takecare`

### If port `5432` is already used on your machine

If you already have another local PostgreSQL service, GUI tools may connect to the wrong server.

In that case, change the Postgres host port in `docker-compose.yml`:

```yml
ports:
  - "5433:5432"
```

Then restart Postgres:

```bash
docker compose down
docker compose up -d postgres
```

Then connect GUI tools.
Important: this only changes host access. Keep the internal Docker `DATABASE_URL` as:

```text
postgresql://takecare:takecare@postgres:5432/takecare?schema=public
```

### Option 3: Prisma Studio

From `services/core-api`:

```bash
DATABASE_URL="postgresql://takecare:takecare@127.0.0.1:5432/takecare?schema=public" npx prisma studio
```

On PowerShell:

```powershell
$env:DATABASE_URL="postgresql://takecare:takecare@127.0.0.1:5432/takecare?schema=public"
npx prisma studio
```

Then open:

```text
http://localhost:5555
```

## Common Developer Workflow

### Boot project

```bash
docker compose up -d postgres localstack
docker compose up --build core-api workflow web
```

### Check service status

```bash
docker compose ps
```

### Watch logs

```bash
docker compose logs -f
docker compose logs -f core-api
docker compose logs -f workflow
docker compose logs -f web
```

## Common Issues

### 1. `prisma generate` fails in workflow build

Typical error:

```text
Could not find Prisma Schema that is required for this command
```

Cause:

- `services/workflow/prisma/schema.prisma` is missing, or
- the workflow Dockerfile runs `npm ci` before copying `prisma/`

Fix:

- ensure `services/workflow/prisma/schema.prisma` exists
- ensure the workflow Dockerfile copies `prisma/` before `npm ci` if `postinstall` runs `prisma generate`

### 2. Password authentication failed in pgAdmin

Cause is often not the database itself, but one of these:

- pgAdmin connected to another PostgreSQL server on the same port
- old/stale saved connection in GUI tool
- host port conflict with another project

Fix:

- verify Docker Postgres is running
- test login from inside Docker:

```bash
docker compose exec postgres psql -U takecare -d takecare
```

- if needed, reset password inside psql:

```sql
ALTER USER takecare WITH PASSWORD 'takecare';
```

- if host port conflicts exist, remap Docker host port to `5433`

### 3. Another PostgreSQL is already using port 5432

Check on Windows PowerShell:

```powershell
netstat -ano | findstr :5432
```

If more than one process is listening, GUI tools may hit the wrong DB.

## Suggested First Verification

After the project boots:

1. Open `http://localhost:3000`
2. Open pgAdmin/TablePlus/Prisma Studio
3. Confirm the `takecare` database is reachable
4. Verify the tables exist
5. Upload a test file in the app
6. Check whether a row is created in `Prescription`

## Useful Commands Reference

```bash
# Start everything
docker compose up --build

# Start in background
docker compose up -d --build

# Stop everything
docker compose down

# Reset all volumes
docker compose down -v

# Show running services
docker compose ps

# View all logs
docker compose logs -f

# View one service logs
docker compose logs -f core-api
docker compose logs -f workflow
docker compose logs -f web

# Open Postgres shell
docker compose exec postgres psql -U takecare -d takecare

# Apply Prisma schema
docker compose run --rm core-api npm run db:push
```

## Notes for Future Improvements

Once the project is stable locally, consider improving:

- Prisma relations and constraints for family access flow
- calendar event mapping tables
- workflow startup and Prisma generation consistency
- auth parity between local and production
- seed script for local test users and sample prescriptions

---

If you are cloning this project for the first time, start with:

```bash
docker compose up --build
```

If something fails, check:

```bash
docker compose logs -f core-api
docker compose logs -f workflow
docker compose logs -f web
```
