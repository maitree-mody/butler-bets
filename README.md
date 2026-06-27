# butler bets

Butler Bets is a Columbia campus prediction market built with Next.js App Router, TypeScript, Tailwind CSS, and Supabase.

Users can:

- browse open and resolved markets
- trade yes/no positions with play money
- create markets
- resolve markets
- view a leaderboard and profile

## Tech Stack

- Next.js 16 App Router
- React 19
- TypeScript
- Tailwind CSS v4
- Supabase SSR
- Recharts

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Available Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
npm test
```

## Environment Variables

Create a `.env.local` file with your Supabase credentials:

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## Main Routes

- `/` - market board
- `/login` - sign in
- `/onboarding` - profile setup
- `/markets/new` - create a market
- `/markets/[id]` - market detail and trading
- `/leaderboard` - ranked users
- `/profile` - display name profile page

## Data Model

The app expects Supabase tables for:

- `users`
- `markets`
- `trades`

The code uses those tables for auth, market pricing, trading, leaderboard ranking, and market detail views.

## Notes

- The app is styled through `app/globals.css` and Tailwind tokens.
- Market pricing uses the LMSR helpers in `lib/lmsr.ts`.
- Display names are derived from email local parts for privacy in public views.
