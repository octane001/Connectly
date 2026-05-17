# Connectly

Connectly is a full stack alumni management and networking platform for a single university. It is built as a production-ready Final Year Project using React, Vite, TypeScript, TailwindCSS, shadcn-style UI primitives, Supabase Auth/Postgres/Storage/Realtime-ready tables, TanStack Query, React Hook Form, Zod, Zustand, Recharts, and Vercel free tier.

The app is designed for alumni engagement, mentorship, networking, placement support, events, university announcements, role-based administration, and privacy-first communication.

## Features

- Google OAuth through Supabase Authentication.
- Role-based access for `STUDENT`, `ALUMNI`, `FACULTY`, `ADMIN`, and `SUPER_ADMIN`.
- Account lifecycle states: `INVITED`, `PENDING`, `ACTIVE`, `SUSPENDED`, `BANNED`.
- Pre-seeded alumni import flow with exact email merge on first Google login.
- Fallback onboarding for unmatched users with admin approval.
- Paginated alumni directory with server-side filters.
- Free custom mentor matching algorithm with weighted similarity scoring.
- Progressive profile system for students, alumni, and faculty.
- Privacy-first contact model with requests and message threads instead of public email exposure.
- Mentorship requests, job board, events with RSVP data model, content feed, notifications, and admin analytics.
- Supabase Row Level Security policies for user, role, ownership, and admin boundaries.
- Demo mode when Supabase environment variables are not configured.

## Tech Stack

- Frontend: React 18, Vite, TypeScript, React Router DOM.
- Styling: TailwindCSS with shadcn-style local components.
- State/data: TanStack Query, Zustand.
- Forms/validation: React Hook Form, Zod.
- Backend: Supabase Auth, PostgreSQL, Storage, Realtime-ready tables.
- Charts: Recharts.
- Deployment: Vercel free tier + Supabase free tier.

## Project Structure

```text
src/
  app/                 App bootstrap and route registration
  components/          Shared UI, error boundary, layout helpers
  features/            Product modules by domain
  lib/                 Supabase client, auth store, API layer, utilities
  routes/              Public/app layouts and protected route guards
  styles/              Tailwind global styles
  test/                Vitest setup
  types/               Domain and Supabase types
supabase/
  migrations/          Database schema, RLS, indexes, views, triggers
  seed.sql             Demo departments, users, skills, jobs, events, feed
```

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy environment variables:

```bash
cp .env.example .env.local
```

3. Add Supabase values:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key
```

4. Start the app:

```bash
npm run dev
```

If environment variables are missing, Connectly runs in demo mode with local sample data so the UI can still be reviewed.

## Supabase Setup

1. Create a free Supabase project.
2. In Authentication, enable Google provider.
3. Add the local redirect URL:

```text
http://localhost:5173/onboarding
```

4. Add the production redirect URL after Vercel deployment:

```text
https://your-vercel-app.vercel.app/onboarding
```

5. Run the SQL migration:

```text
supabase/migrations/0001_connectly_schema.sql
supabase/migrations/0002_admin_and_core_actions.sql
```

6. Run the seed file:

```text
supabase/seed.sql
```

The migration creates normalized tables, enums, indexes, storage buckets, RLS policies, a `profile_directory` view, and an auth trigger that merges invited alumni by Google email.

7. After signing in once with the Google account that should administer the project, run:

```text
supabase/admin-bootstrap.sql
```

Replace the placeholder email in that file first. The script verifies the linked profile and promotes it to `ACTIVE ADMIN`.

## Database Design

Core tables:

- `profiles`, `roles`, `privacy_settings`
- `mentorship_preferences`, `mentorship_requests`, `contact_requests`
- `message_threads`, `messages`, `notifications`
- `skills`, `user_skills`
- `jobs`, `job_applications`
- `events`, `event_registrations`
- `feed_posts`, `comments`, `post_likes`
- `matching_scores`, `analytics_events`, `alumni_imports`

Indexes are included for department/year lookup, role/status filtering, mentor filtering, jobs by deadline, skills arrays, notifications, messages, and imported email matching.

## Smart Matching

The mentor recommendation system is fully local and free. It does not use paid AI APIs. It scores mentors using:

- mentor availability and capacity
- same department
- common skills
- similar technology stack
- aligned interests and career goals
- preferred industry
- same city
- profile completeness

The UI displays compatibility percentages and reason chips such as `Same Department`, `Common Skills`, `Preferred Industry`, and `Complete Profile`.

## Security Model

- Emails are stored in Supabase but not exposed in public directory UI.
- Phone/WhatsApp visibility is opt-in through privacy settings.
- All user-facing tables have Row Level Security enabled.
- Admin and ownership policies control profile updates, approvals, jobs, events, requests, messages, notifications, feed, and imports.
- New Google users without a matching invited alumni import are created as `PENDING`.

## Scripts

```bash
npm run dev        # local development
npm run build      # typecheck and production build
npm run preview    # preview production build
npm run lint       # ESLint
npm run test       # Vitest
npm run typecheck  # TypeScript only
```

## Deployment

1. Push the repository to GitHub.
2. Import it into Vercel using the free tier.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in Vercel project settings.
4. Add the Vercel URL to Supabase Auth redirect URLs.
5. Deploy.

No paid APIs, paid hosting, premium authentication providers, or premium integrations are required.
