# ikigai
Helps guide you find your ikigai in life.

## Cloud maps

The app keeps an immediate browser backup and syncs each visitor's four fields to
Supabase. Anonymous Auth gives each browser its own identity without a signup
screen. This is not cross-device account access: clearing browser data loses the
session. Never clear browser storage as a substitute for deleting a cloud map.

`public.reflection_maps` stores the current reflection inputs, the matching
generated insight JSON, engine version, revision, and timestamps. Outputs are
computed by the existing local engine, not an external AI service. They are
client-authored data, not independently verified assessments. There is no history
of deleted thoughts. Clear map saves empty fields and a null output; normal
database backup retention may still apply.

The table is protected with row-level security. Visitors can read only their own
row and write through `save_reflection_map`, which validates payloads, derives the
owner from the authenticated session, and saves inputs and outputs atomically.
Revision checks and three-way merging prevent stale saves from silently replacing
other changes. Failed saves remain locally queued and retry online. Offline edits
in multiple simultaneous tabs are not recommended.

Project administrators can inspect inputs and outputs in Supabase's Table Editor.
The app discloses this in About saving. The browser contains only a public
publishable key; never put a service-role key in frontend code.

Schema: `supabase/migrations/202609260001_cloud_maps.sql`.
Anonymous sign-in must be enabled under Authentication / Sign In / Providers.
Before a broad public launch, configure bot protection and monitor Auth quotas.
Future signed-in accounts can add recovery and cross-device access.

Run `npm test`, `npm run lint`, and `npm run build` to verify changes.

## Optional results email (prepared, disabled)

No visitor signup is planned. `EmailResults` offers a one-time email from the
results panel only, after cloud saving succeeds. It is hidden unless both
`VITE_RESULTS_EMAIL_ENABLED=true` and `VITE_TURNSTILE_SITE_KEY` are configured.
These are public build settings; never put provider secrets in VITE variables.

Activation checklist:

1. Verify a sender domain with Resend. A vercel.app subdomain is not an email
   domain you control. Do not enable for visitors using a test-only sender.
2. Create a Cloudflare Turnstile widget for the live website hostname.
3. Apply `202609260002_email_limits.sql` to Supabase. This migration is not yet
   applied. It stores hashed recipient addresses and attempt timestamps, not
   plaintext addresses or result text; hashes are not fully anonymous.
4. Set Edge Function secrets `RESEND_API_KEY`, `RESULTS_EMAIL_FROM`,
   `TURNSTILE_SECRET_KEY`, and `APP_ORIGINS` (exact comma-separated origins).
   Supabase supplies the server's `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and
   `SUPABASE_SERVICE_ROLE_KEY`. No service key belongs in the browser.
5. Deploy `supabase functions deploy email-results`. Gateway JWT checking is
   replaced by an explicit Auth /user check inside the function before reads or
   sends. Data reads still use the caller's token and RLS. The service key is
   used only to reserve a rate-limited email attempt.
6. Test real inbox delivery, invalid/expired tokens, another user's map,
   rejected CAPTCHA, quotas, and provider failure before enabling the UI flag
   and redeploying Vercel. These live email checks have not yet been run.

The endpoint sends only a bounded plain-text takeaway, recurring theme titles,
and next step from the caller's saved output. It does not accept email content
from the request. Notes and evidence excerpts are excluded. Results are still
client-authored, not a verified assessment. Resend processes recipient addresses
and email content; no mailing list is created.

Email quotas: at most 3 attempts per user and recipient per rolling day, 2 minutes
between user attempts, and 100 attempts globally per rolling day. Failed attempts
consume quota. Attempt records older than a day are removed on the next reserve
call. Turnstile is required and fails closed if unconfigured.

## Launch operations

- Supabase Auth logs: inspect signup spikes, rate-limit failures, and failed
  sessions. Database logs: inspect RPC failures. Dashboard Usage: monitor quotas.
- Email function logs (after activation) emit only accepted/failed event names,
  never addresses, tokens, reflections, or result text. Provider acceptance is
  not proof of inbox delivery; use Resend delivery events to investigate.
- Run `node supabase/smoke-test.mjs` for live isolation and save checks. It creates
  two disposable anonymous identities and clears their maps afterward.
- `.github/workflows/availability.yml` checks both public routes and Auth health
  every six hours and on manual dispatch, without reading private maps or creating
  users. GitHub Actions must be enabled on the default branch. Enable failed-run
  notifications in your GitHub settings to receive alerts; delivery depends on
  those preferences. This is availability monitoring, not end-to-end save or
  browser error monitoring. Periodic recovery drills are not configured yet.
- Auth CAPTCHA is separate from email CAPTCHA. Do NOT enable Supabase Auth
  CAPTCHA until the anonymous sign-in client also supplies a valid token;
  enabling it now would break new visitor cloud sessions.
- To roll back the frontend, use Vercel's previous deployment. Do not drop the
  map table or erase browser storage. Public privacy/retention policy and full
  account erasure still need a separate pass before broad promotion.
