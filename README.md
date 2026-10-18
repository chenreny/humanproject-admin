# The Humor Project Admin

A separate Next.js 16 admin console for the existing The Humor Project Supabase project. It manages the production `profiles`, `captions`, `generation_requests`, `caption_votes`, `curated_meme_votes`, and private `meme-images` bucket. AI media creation publishes into the same caption feed as the public app.

## Setup

Use Node 22.13+ or Node 24. Copy `.env.example` to `.env.local`, then provide the values from the existing project:

```bash
cp .env.example .env.local
npm install
npm run dev
```

The app starts on port 3001 so it can run beside the public app. Open <http://localhost:3001/login>. Sign in with Google. The shared project must have the `profiles.is_superadmin` migration applied, with the authorized admin account flagged `true`. This app does not include a local privilege escalation path.

## Environment variables

- `SUPABASE_URL`: URL for the existing Supabase project.
- `SUPABASE_ANON_KEY`: publishable/anon key used for Google Auth and `auth.getUser()`.
- `SUPABASE_SERVICE_ROLE_KEY`: private server key used only after the signed-in profile is confirmed as a superadmin. Never use a `NEXT_PUBLIC_` prefix.
- `OPENAI_API_KEY`: server-side API key used when an admin creates a meme.
- `OPENAI_MODEL`: optional text model (default `gpt-6-luna`).
- `OPENAI_IMAGE_MODEL`: optional image model (default `gpt-image-2.5-flare`).

Google OAuth must allow `http://localhost:3001/auth/callback` in Supabase Auth URL Configuration. The existing Google provider must be enabled for the shared Supabase project.

## Access and data

Every admin page, mutation, and image endpoint checks the signed-in Supabase user and `profiles.is_superadmin` before using the service-role client. The service key stays in server-only modules. This console does not create an alternate media table: generated memes are inserted into `generation_requests`, uploaded to `meme-images`, and published by `complete_meme_generation`; edits update `captions`; deletion removes the request so caption votes cascade, then deletes its image object. User and vote pages read existing profiles and vote tables.

Ensure `profiles.is_superadmin` is applied in the main project before allowing admin sign in. The shared Supabase schema must already include the caption/image migrations, `complete_meme_generation`, `caption_votes`, `curated_meme_votes`, and the private `meme-images` bucket.

## Commands

```bash
npm run dev
npm run lint
npm run build
```
