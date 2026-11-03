# Fixing "Failed to send email" on GitHub Pages

## What was wrong

Your site on GitHub Pages is **static files only** — it cannot run a server.
But sending email (Gmail / SMTP) can only happen on a server. Your old code
sent every email to a temporary preview server:

```
https://ais-pre-4f3hdjf75hjoch6vttiz2o-...run.app/
```

That preview URL is dead, so the browser showed
**CORS / "Failed to fetch"**. It was never a browser bug — the backend was gone.

## The fix

Email is now handled by a **Supabase Edge Function** (you already use Supabase).
It runs on a server, holds your Gmail password as a **secret** (never in the
website code), and returns the CORS headers the browser needs.

Two things must happen:

1. **Deploy the function to Supabase** (done once, from your computer).
2. **Push the frontend change to GitHub** (via GitHub Desktop).

---

## Part A — Deploy the Supabase function (do this ONCE)

### 1. Install the Supabase CLI
- Windows (PowerShell):
  ```powershell
  npm install -g supabase
  ```
  (or use `scoop install supabase` — see https://supabase.com/docs/guides/cli)

### 2. Log in and link your project
Run these from inside the project folder:
```powershell
supabase login
supabase link --project-ref lxuapkccxaadwixjpirs
```

### 3. Set the Gmail secret (NEVER put this in the website code)
```powershell
supabase secrets set GMAIL_USER=rawjute@ballyjute.com
supabase secrets set GMAIL_APP_PASSWORD=ochhyhnjlkhdlpot
supabase secrets set EMAIL_FROM="Bally Jute PO Desk <rawjute@ballyjute.com>"
```

### 4. Deploy
```powershell
supabase functions deploy send-email --no-verify-jwt
```

That's it. The email endpoint is now live at:
```
https://lxuapkccxaadwixjpirs.supabase.co/functions/v1/send-email
```

> **Prefer clicking over the terminal?** In the Supabase dashboard go to
> **Edge Functions → Deploy a new function**, name it exactly `send-email`,
> paste the contents of `supabase/functions/send-email/index.ts`, turn
> **"Verify JWT" OFF**, and add the three secrets under
> **Project Settings → Edge Functions → Secrets**.

---

## Part B — Push the website change to GitHub

The file `src/lib/utils.ts` was changed so the site now calls the Supabase
function instead of the dead preview URL.

Using **GitHub Desktop**:
1. Open GitHub Desktop → it will show the changed files
   (`src/lib/utils.ts`, plus the new `supabase/` folder).
2. Write a summary like `Fix email: route send-email to Supabase function`.
3. Click **Commit to main**, then **Push origin**.
4. GitHub Actions rebuilds and redeploys Pages automatically (1–2 minutes).

Then open your site, go to a purchase order, and send a test email.

---

## IMPORTANT — Security

- Your Gmail **App Password** (`ochhyhnjlkhdlpot`) is currently **hard-coded in
  `server.ts`** (lines ~435–436). If your GitHub repo is **public**, that
  password is already exposed to the world. **Rotate it now**: Google Account →
  Security → App passwords → delete the old one, create a new one, and update
  only the Supabase secret (Part A step 3). Do **not** put the new password back
  into `server.ts`.
- The Google API key you shared should also be restricted in Google Cloud
  Console (limit it to the specific APIs and referrers you use).
- The email function is deployed with JWT verification off so the website can
  call it without a login. It only sends your fixed PO template from your Gmail
  account. If you later want to lock it down further, tell me and I'll add a
  shared-secret check.

## Quick test (optional, from your terminal)
After deploying, confirm the endpoint responds:
```powershell
curl -X POST https://lxuapkccxaadwixjpirs.supabase.co/functions/v1/send-email `
  -H "Content-Type: application/json" `
  -d '{\"to\":\"youraddress@example.com\",\"subject\":\"Test\",\"html\":\"<b>It works</b>\"}'
```
A JSON reply with `"success": true` means email is working.
