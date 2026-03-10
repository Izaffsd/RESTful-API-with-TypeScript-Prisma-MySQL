# Monash API – Installation, init & setup (Prisma 7)

Use these commands in order. Run everything from the project root: `c:\Users\iskandar.i\Desktop\ts-prisma`.

---

## 1. Install dependencies

```bash
npm install
```

This installs **Prisma 7** (`@prisma/client` and `prisma` ^7.4.1) and the rest of the project dependencies.

---

## 2. Environment (init env file)

Create a `.env` file (copy from example):

```bash
cp .env.example .env
```

Then edit `.env` and set your MySQL URL:

```env
PORT=4000
NODE_ENV=development
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/monash"
```

Replace `USER`, `PASSWORD`, and `monash` with your MySQL user, password, and database name.

---

## 3. Prisma setup

### Generate Prisma Client (required after clone / after schema changes)

```bash
npm run db:generate
```

Or with npx:

```bash
npx prisma generate
```

This reads `prisma/schema.prisma` and generates the TypeScript client in `node_modules/.prisma/client`. Your code imports `@prisma/client` and uses this client.

---

## 4. Database setup (choose one)

### Option A – Push schema (no migration history, good for local / fresh DB)

Creates or updates tables to match `prisma/schema.prisma` without creating migration files:

```bash
npm run db:push
```

Or:

```bash
npx prisma db push
```

### Option B – Migrations (recommended for production / team)

Create and apply a first migration:

```bash
npm run db:migrate
```

Or:

```bash
npx prisma migrate dev --name init
```

When prompted, choose to create the database if it doesn’t exist. This creates the `monash` DB (if your URL uses that name), then applies the migration.

---

## 5. (Optional) Open Prisma Studio

```bash
npm run db:studio
```

Or:

```bash
npx prisma studio
```

Opens a UI at `http://localhost:5555` to view and edit data.

---

## 6. Run the API

Development (with watch):

```bash
npm run dev
```

Production (build then run):

```bash
npm run build
npm start
```

---

## Command summary

| Step              | Command                | Purpose                          |
|-------------------|------------------------|----------------------------------|
| Install           | `npm install`          | Install deps (incl. Prisma 7)    |
| Env               | `cp .env.example .env` | Create `.env` and set `DATABASE_URL` |
| Generate client   | `npm run db:generate`  | Generate Prisma Client           |
| DB schema (push)  | `npm run db:push`      | Sync DB to schema (no migrations) |
| DB schema (migrate) | `npm run db:migrate` | Create/apply migrations          |
| DB UI             | `npm run db:studio`    | Open Prisma Studio               |
| Dev server        | `npm run dev`          | Run API with tsx watch           |
| Build             | `npm run build`        | Compile TypeScript               |
| Start             | `npm start`            | Run compiled app                  |

---

## One-time full setup (copy-paste)

From project root, with MySQL running and database `monash` created (or let Prisma create it):

```bash
npm install
cp .env.example .env
# Edit .env and set DATABASE_URL
npm run db:generate
npm run db:push
npm run dev
```

For production-style workflow with migrations:

```bash
npm install
cp .env.example .env
# Edit .env and set DATABASE_URL
npm run db:generate
npm run db:migrate
npm run dev
```

You’re using **Prisma 7** (`@prisma/client` and `prisma` ^7.4.1) for all of the above.
