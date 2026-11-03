// Supabase Edge Function: sync-gmail
// -----------------------------------------------------------------------------
// Pulls the Gmail inbox using the Gmail REST API and upserts messages into the
// `imap_emails` table that the Sauda Desk inbox reads from. Run it on a schedule
// (every 1-2 minutes) so the inbox stays near-realtime WITHOUT any always-on
// server. GitHub Pages can't run a mail poller; this function replaces the old
// server.ts IMAP sync.
//
// SECRETS REQUIRED (supabase secrets set ...):
//   GMAIL_CLIENT_ID        Google OAuth 2.0 client ID
//   GMAIL_CLIENT_SECRET    Google OAuth 2.0 client secret
//   GMAIL_REFRESH_TOKEN    OAuth refresh token for rawjute@ballyjute.com (scope:
//                          https://www.googleapis.com/auth/gmail.readonly)
//   SYNC_KEY               a random string; callers must pass ?key=<SYNC_KEY>
//
// SUPABASE-PROVIDED (injected automatically):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// Trigger:  GET or POST  https://<project>.supabase.co/functions/v1/sync-gmail?key=<SYNC_KEY>
// -----------------------------------------------------------------------------

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";
const MAX_MESSAGES = 30;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// Decode Gmail's base64url (may be missing padding).
function b64urlToBytes(data: string): Uint8Array {
  const b64 = data.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

function b64urlToText(data: string): string {
  try {
    return new TextDecoder("utf-8").decode(b64urlToBytes(data));
  } catch {
    return "";
  }
}

// Standard base64 (for storing attachment content the way the app expects).
function bytesToB64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

async function getAccessToken(): Promise<string> {
  const body = new URLSearchParams({
    client_id: Deno.env.get("GMAIL_CLIENT_ID") ?? "",
    client_secret: Deno.env.get("GMAIL_CLIENT_SECRET") ?? "",
    refresh_token: Deno.env.get("GMAIL_REFRESH_TOKEN") ?? "",
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(
      `OAuth token error: ${data.error ?? res.status} ${data.error_description ?? ""}`,
    );
  }
  return data.access_token as string;
}

function headerValue(headers: any[], name: string): string {
  const h = headers?.find(
    (x) => x.name?.toLowerCase() === name.toLowerCase(),
  );
  return h?.value ?? "";
}

// Split "Display Name <email@x.com>" into name + email.
function parseFrom(from: string): { name: string; email: string } {
  const m = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  if (m) {
    const name = m[1].replace(/^"|"$/g, "").trim();
    return { name: name || m[2].trim(), email: m[2].trim() };
  }
  return { name: from.trim() || "Unknown", email: from.trim() };
}

interface Extracted {
  html: string;
  text: string;
  attachments: { attachmentId: string; filename: string; contentType: string; size: number }[];
}

// Recursively walk the MIME tree collecting the HTML/text body and any
// attachment references (which are fetched separately below).
function walkParts(part: any, acc: Extracted) {
  if (!part) return;
  const mimeType: string = part.mimeType ?? "";
  const filename: string = part.filename ?? "";

  if (filename && part.body?.attachmentId) {
    acc.attachments.push({
      attachmentId: part.body.attachmentId,
      filename,
      contentType: mimeType || "application/octet-stream",
      size: part.body.size ?? 0,
    });
  } else if (mimeType === "text/html" && part.body?.data) {
    acc.html += b64urlToText(part.body.data);
  } else if (mimeType === "text/plain" && part.body?.data) {
    acc.text += b64urlToText(part.body.data);
  }

  if (Array.isArray(part.parts)) {
    for (const child of part.parts) walkParts(child, acc);
  }
}

async function fetchAttachmentB64(
  token: string,
  messageId: string,
  attachmentId: string,
): Promise<string> {
  try {
    const res = await fetch(
      `${GMAIL_API}/messages/${messageId}/attachments/${attachmentId}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const data = await res.json();
    if (data?.data) return bytesToB64(b64urlToBytes(data.data));
  } catch (_e) { /* ignore individual attachment failures */ }
  return "";
}

// CORS so the app (GitHub Pages) can call this from the browser.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  // Access control: allow either the scheduler (?key=SYNC_KEY) OR the app
  // (which sends the public anon key, same as every other Supabase call).
  const syncKey = Deno.env.get("SYNC_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const providedKey = new URL(req.url).searchParams.get("key");
  const headerKey = req.headers.get("apikey") ||
    (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const okByKey = !!syncKey && providedKey === syncKey;
  const okByAnon = !!anonKey && headerKey === anonKey;
  if (!okByKey && !okByAnon) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supaUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supaUrl || !serviceKey) {
    return json({ error: "Supabase env not available" }, 500);
  }

  let token: string;
  try {
    token = await getAccessToken();
  } catch (err) {
    return json({ error: String(err instanceof Error ? err.message : err) }, 500);
  }

  // 1. List recent inbox message IDs.
  const listRes = await fetch(
    `${GMAIL_API}/messages?labelIds=INBOX&maxResults=${MAX_MESSAGES}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const listData = await listRes.json();
  if (!listRes.ok) {
    return json({ error: `Gmail list error: ${JSON.stringify(listData)}` }, 502);
  }
  const ids: string[] = (listData.messages ?? []).map((m: any) => m.id);

  // 2. Fetch each message and build a row.
  const rows: any[] = [];
  for (const id of ids) {
    try {
      const mRes = await fetch(`${GMAIL_API}/messages/${id}?format=full`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const m = await mRes.json();
      if (!mRes.ok) continue;

      const headers = m.payload?.headers ?? [];
      const subject = headerValue(headers, "Subject") || "No Subject";
      const { name, email } = parseFrom(headerValue(headers, "From"));

      const dateHeader = headerValue(headers, "Date");
      let dateIso: string;
      const parsed = dateHeader ? Date.parse(dateHeader) : NaN;
      if (!isNaN(parsed)) dateIso = new Date(parsed).toISOString();
      else if (m.internalDate) dateIso = new Date(Number(m.internalDate)).toISOString();
      else dateIso = new Date().toISOString();

      const acc: Extracted = { html: "", text: "", attachments: [] };
      walkParts(m.payload, acc);

      // Pull down attachment bytes (base64) so the inbox can preview them.
      const attachmentsOut: any[] = [];
      for (const att of acc.attachments) {
        const content = await fetchAttachmentB64(token, id, att.attachmentId);
        attachmentsOut.push({
          filename: att.filename,
          contentType: att.contentType,
          size: att.size,
          content,
        });
      }

      const labels: string[] = m.labelIds ?? [];
      rows.push({
        id,
        subject,
        sender_name: name,
        sender_email: email,
        date: dateIso,
        snippet: (m.snippet ?? "").slice(0, 200),
        body: acc.html || acc.text || m.snippet || "",
        attachments: JSON.stringify(attachmentsOut),
        unread: labels.includes("UNREAD"),
        starred: labels.includes("STARRED"),
      });
    } catch (_e) {
      // skip a single bad message rather than failing the whole sync
      continue;
    }
  }

  // 3. Upsert into imap_emails.
  if (rows.length > 0) {
    const upRes = await fetch(`${supaUrl}/rest/v1/imap_emails?on_conflict=id`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify(rows),
    });
    if (!upRes.ok) {
      const errText = await upRes.text();
      return json({ error: `Supabase upsert failed: ${errText}`, fetched: rows.length }, 502);
    }

    // Mirror the real inbox: remove cached rows that are no longer in Gmail
    // (this clears old junk like the "Delivery Status" test failures).
    const keepIds = rows.map((r) => r.id).join(",");
    await fetch(
      `${supaUrl}/rest/v1/imap_emails?id=not.in.(${keepIds})`,
      {
        method: "DELETE",
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
          Prefer: "return=minimal",
        },
      },
    );
  }

  return json({ success: true, synced: rows.length });
});
