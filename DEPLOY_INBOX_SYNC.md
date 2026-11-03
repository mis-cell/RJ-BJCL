# Realtime Inbox Sync (serverless) — setup

## Why this is needed
GitHub Pages can't run a server, so nothing was pulling new Gmail into your
Supabase `imap_emails` table (which the Sauda Desk inbox reads). This Supabase
Edge Function (`sync-gmail`) pulls your inbox from the **Gmail API** on a
schedule and writes it into that table. No always-on server required.

You do this once. After that the inbox refreshes on its own.

---

## Step 1 — Enable Gmail API + create OAuth credentials (Google Cloud Console)

1. Go to https://console.cloud.google.com/ and pick the project that already has
   your API key (top-left project selector).
2. **APIs & Services → Library** → search **Gmail API** → **Enable**.
3. **APIs & Services → OAuth consent screen**:
   - If `ballyjute.com` is a Google Workspace account → choose **Internal**
     (best: the login won't expire).
   - If it's a normal Gmail account → choose **External**, then after setup
     click **PUBLISH APP** (in "testing" mode the login expires every 7 days).
   - Add the scope `.../auth/gmail.readonly` if asked, and add
     `rawjute@ballyjute.com` as a test user (External only).
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**.
   - Under **Authorized redirect URIs** add exactly:
     `https://developers.google.com/oauthplayground`
   - Create it, then copy the **Client ID** and **Client secret**.

## Step 2 — Get a refresh token (OAuth Playground)

1. Open https://developers.google.com/oauthplayground
2. Click the ⚙️ gear (top right) → tick **Use your own OAuth credentials** →
   paste your Client ID and Client secret.
3. On the left, in "Input your own scopes", paste:
   `https://www.googleapis.com/auth/gmail.readonly`
   then click **Authorize APIs**.
4. Sign in as **rawjute@ballyjute.com** and allow access.
5. Click **Exchange authorization code for tokens**.
6. Copy the **Refresh token** value (long string). Keep it safe.

## Step 3 — Set the secrets in Supabase (VS Code terminal)

Pick any random word/number for `SYNC_KEY` (e.g. `jute-sync-8842`).

```powershell
supabase secrets set GMAIL_CLIENT_ID=YOUR_CLIENT_ID GMAIL_CLIENT_SECRET=YOUR_CLIENT_SECRET GMAIL_REFRESH_TOKEN=YOUR_REFRESH_TOKEN SYNC_KEY=jute-sync-8842 --project-ref lxuapkccxaadwixjpirs
```

## Step 4 — Deploy the function

```powershell
supabase functions deploy sync-gmail --project-ref lxuapkccxaadwixjpirs --no-verify-jwt
```

## Step 5 — Test it

```powershell
curl.exe "https://lxuapkccxaadwixjpirs.supabase.co/functions/v1/sync-gmail?key=jute-sync-8842"
```
Expected: `{"success":true,"synced":30}` (some number). Then open the Sauda Desk
inbox — the latest mail should appear. If you see an `error`, paste it to me.

## Step 6 — Run it automatically every minute

Easiest (no code): use a free web cron.
1. Go to https://cron-job.org and sign up (free).
2. **Create cronjob** → URL:
   `https://lxuapkccxaadwixjpirs.supabase.co/functions/v1/sync-gmail?key=jute-sync-8842`
3. Schedule: **every 1 minute** (or 2). Save/enable.

That's it — new mail now flows into the inbox on its own.

> Alternative (inside Supabase): SQL Editor →
> `select cron.schedule('gmail-sync','* * * * *', $$ select net.http_get('https://lxuapkccxaadwixjpirs.supabase.co/functions/v1/sync-gmail?key=jute-sync-8842') $$);`
> (requires the `pg_cron` and `pg_net` extensions enabled under Database → Extensions).

---

## Optional — clear the old junk
Your inbox still shows old "Delivery Status Notification" test failures. To wipe
the stale cache once, run in Supabase **SQL Editor**:
```sql
truncate table imap_emails;
```
The next sync repopulates it with current mail.

## Notes
- `gmail.readonly` only *reads* mail. Sending is handled separately by the
  `send-email` function you already deployed.
- If the inbox stops updating after ~7 days, your OAuth app is still in "testing"
  mode — publish it (Step 1.3) and redo Step 2 to get a fresh refresh token.
