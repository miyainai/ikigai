# Locus

A 3D reflection exercise inspired by the four-field Ikigai diagram. Add real
examples, explore recurring themes, and download a personal two-page journal.
The local rules engine suggests directions to explore, not a definitive purpose.

Live: https://find-your-locus.vercel.app/

## Development and release

Use Node.js 22 or newer. Run `npm ci`, then `npm run dev` for local development.
Before release, run `npm test`, `npm run lint`, and `npm run build`.
GitHub Actions runs those checks on pushes to main and pull requests.

The frontend is hosted on Vercel; the activity-only backend is on Supabase.
Deploying the frontend does not apply database migrations or deploy Edge Functions.
Confirm the public `find-your-locus.vercel.app` alias targets the intended release.
Local `.env` files, Supabase CLI state, and new QA artifacts are excluded from Git.

## Current storage: device-only (October 7, 2026)

The shipped app now uses `useLocalReflections` and `LocalStore`. Reflections,
notes, insight computation, and PDFs stay on the visitor's device. It does not
load the Supabase Auth SDK, create accounts, read cloud maps, or upload content.
The new browser key is `locus-device-map-v1`. Existing browser cloud-cache/legacy
data is migrated without a network request. The replacement is saved before
retiring older local copies. Storage failures keep the in-memory map available
and display a warning. Browser clearing/device changes can lose the map.

Historical server reflections and saved outputs were deleted on October 7,
2026 with approval, using `202610070002_delete_historical_maps.sql`. The empty
legacy table remains, with browser access revoked. Provider backups/logs are
not purged by this migration and remain subject to provider retention. Migration
`202610070001_device_only_activity.sql` revokes public/authenticated execution
of the old save function, so even older open tabs cannot upload new content.
Old browser builds will show failed cloud syncing until refreshed. Existing
anonymous accounts remain for now; they are not used by the current frontend.
Account deletion is separate from reflection deletion. Do not run the old cloud smoke test or re-enable
its write grant.

## Automatic content-free analytics

Activity collection runs automatically on production without a checkbox. Only
allowlisted actions, a four-value field ID where relevant, a random event ID,
and a temporary session ID go to the `activity-event` Edge Function. It rejects
unknown keys and arbitrary free-text values. No reflection IDs, labels, notes,
results, PDFs, emails, URLs, referrers, or auth tokens are sent. The random
session expires after 30 minutes idle or 24 hours maximum. There is no
cross-device/person identifier. DNT/GPC and local-development hosts suppress
collection. No events are queued for later retry.

Administrators can inspect `public.activity_events` in Supabase Table Editor,
or `public.activity_daily` for UTC daily counts by action/field and distinct
sessions. Visitors cannot read these tables or invoke the writer RPC. The
public write-only Edge endpoint has fixed-schema validation, a 512-byte body
limit, replay deduplication, and database-backed limits of 30 events/minute
and 300/day per session, plus 10,000/day globally. These bound stored events,
not all request costs, and are not proof of genuine users: public analytics
can be spoofed. CORS is not authentication. No client-provided timestamp or
arbitrary metadata is retained. The hourly `locus-activity-retention` cron
deletes events older than 30 days (up to one-hour scheduling delay). Normal
provider backup/log retention can still apply. Request metadata such as IPs
may be processed in provider operational logs, not our event table.

Metrics reflect collected sessions, not unique people or total visits.
`pdf_generated` means generation/download initiation, not confirmed disk save
or reading. `results_viewed` means opening the summary with at least one
reflection, not proof every result was read. DNT/GPC and explicit opt-outs saved
by the earlier checkbox still suppress collection. The long in-app disclosure
and checkbox are removed; only the device-save status remains. Events expire
on schedule. Email results remain removed from the UI.

## Retired cloud features

Older versions used anonymous Auth and `reflection_maps` for cloud synchronization.
Those modules and migration files remain as history, but the active application
does not import them. Do not run `supabase/smoke-test.mjs`, enable email results,
or restore the old map write grants. Doing so would conflict with device-only
storage. There is no cloud recovery, cross-device sync, or results email in the
current release. The PDF is the supported take-away feature.

## Downloadable reflection journal

The results panel offers a two-page PDF after at least one reflection. It is
generated locally from the current map, including current browser edits, and
does not require an email address or cloud connection after assets have loaded.
The PDF library is loaded only on demand. The journal includes the six most
recent labels per field (with an explicit count of older omitted reflections),
the existing takeaway/themes, and follow-up prompts. Full notes and internal
identifiers are excluded. This is a reflection snapshot, not a complete backup.

Pages use browser-rendered text to preserve multilingual labels and app fonts.
The resulting PDF is image-based, not a tagged or selectable-text document.
On mobile, the browser may open a PDF preview with Save/Share rather than put it
directly into Downloads. Physical-device Safari verification remains pending.

## Launch operations

- Run `node supabase/activity-smoke-test.mjs` to check live event intake,
  rejection of reflection content, body/origin validation, and denied public
  reads of analytics and legacy maps. It writes one synthetic event under the
  fixed test session `741fb9b9-c587-470a-b9e2-4820b2493e94`, not user content.
- Supabase Table Editor: `activity_events` contains raw events; `activity_daily`
  contains aggregates. Exclude the test session for launch metrics. Check Edge
  Function logs and Dashboard Usage for errors and quota pressure.
- `.github/workflows/availability.yml` checks both public routes and the activity
  endpoint every six hours and on manual dispatch. Its invalid request records
  no event; it verifies endpoint validation, not a database write or a full user
  journey. GitHub Actions must be enabled. Failed-run notifications depend on
  your GitHub notification preferences.
- Before promoting broadly, test on a physical iPhone and an Android browser:
  landing, four-field save/return, edit/delete, reload, and PDF Save/Share. Browser
  responsive emulation does not verify a real keyboard or mobile download sheet.
- Analytics is best-effort and spoofable. Rate limits bound stored events, not
  every incoming request. Verify the retention cron and provider quotas in the
  Supabase dashboard periodically. A backend outage must not block reflection.
- Keep a clear privacy explanation available before broad promotion: personal
  reflection content remains local, but limited activity and provider request
  logs still exist. This repository documentation is not a legal compliance review.
- Roll back with a previous Vercel deployment that also uses device-only storage.
  Do not roll back to the retired cloud-sync frontend or erase browser storage.
