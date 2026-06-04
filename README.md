# Oxford Debate Live Voting App

Real-time anonymous voting app for Oxford-style conference debates. Supports pre-debate, live, and final vote phases with a projected public screen.

## Stack

- **Next.js 16** (App Router) + TypeScript
- **Tailwind CSS** for styling
- **Socket.IO** for real-time updates (custom server)
- **PostgreSQL** + **Prisma** ORM
- **QRCode** for participant join QR codes

## Setup

### 1. Prerequisites

- Node.js 18+
- PostgreSQL running locally (or a hosted instance)

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env with your database connection string
```

### 4. Run database migrations

```bash
npm run db:migrate
# Enter a migration name e.g. "init"
```

### 5. (Optional) Seed demo data

```bash
npm run db:seed
```

### 6. Start development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — redirects to `/admin`.

## Pages

| URL | Purpose |
|-----|---------|
| `/admin` | Organizer dashboard — create and control debate rooms |
| `/vote/[roomId]` | Mobile participant voting page (share via QR code) |
| `/screen/[roomId]` | Public projector display with live aggregate results |
| `/results/[roomId]` | Read-only results summary across all phases |

## Voting Flow

1. **Organizer** creates a room at `/admin`, generates QR code
2. **Participants** scan QR → land on `/vote/[roomId]`
3. **Organizer** advances through phases: Pre-Debate → Live → Final → Closed
4. **Screen** at `/screen/[roomId]` shows live aggregate results
5. Results can be exported as JSON or CSV from the admin panel

## Deployment

For a simple event setup, deploy to [Railway](https://railway.app) or [Render](https://render.com) with a managed PostgreSQL add-on. Set `NEXT_PUBLIC_APP_URL` to your deployment URL so QR codes point to the right place.

```bash
npm run build
npm start
```

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
