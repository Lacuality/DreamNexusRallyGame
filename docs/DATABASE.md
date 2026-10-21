# Online leaderboard (Supabase)

The game saves scores, player stats and achievements in a free Supabase database.
It talks to Supabase straight from the browser, so it works on GitHub Pages.
Without a database it still works and keeps scores on the player's device.

## One-time setup

1. **Create a project** at https://supabase.com (free tier is fine).
2. **Create the tables**: in Supabase open **SQL Editor**, then paste and run each file in
   `supabase/migrations/` **in date order**:
   1. `20251114112546_create_leaderboard_table.sql`
   2. `20251114144826_create_achievements_system.sql`
   3. `20261021160000_secure_leaderboard_and_run_stats.sql`
3. **Copy two values** from **Project Settings → API**:
   - Project URL → `VITE_SUPABASE_URL`
   - `anon` `public` key → `VITE_SUPABASE_ANON_KEY`
   (Never use the `service_role` key here.)
4. **Add them to GitHub**: repo **Settings → Secrets and variables → Actions → New repository
   secret**, one for each name above.
5. **Redeploy**: **Actions → Deploy game to GitHub Pages → Run workflow** (or push to `main`).

## Is the anon key safe to put in a web page?

Yes — Supabase designs it to be public. What protects the data is row-level security:
visitors can only *read* the tables, scores can only be written through `submit_score`
(keeps each player's best, rejects silly numbers) and stats through `record_run`
(only adds one run). Achievements can only be inserted, not edited.

## Local development

Create a `.env` file in the repo root (it is git-ignored):

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```
