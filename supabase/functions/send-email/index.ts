// Supabase Edge Function: send-email
// -----------------------------------------------------------------------------
// Sends email from the Bally Jute PO Desk using Gmail SMTP.
//
// WHY THIS EXISTS:
//   The frontend is hosted on GitHub Pages, which can only serve static files.
//   Email (Gmail SMTP / nodemailer) MUST run on a server. This Edge Function is
//   that server. It holds the Gmail credentials as SECRETS (never in frontend
//   code) and returns CORS headers so the GitHub Pages site can call it.
//
// SECRETS REQUIRED (set with `supabase secrets set` or in the dashboard):
//   GMAIL_USER          e.g. rawjute@ballyjute.com
//   GMAIL_APP_PASSWORD  the 16-char Gmail App Password (NO spaces)
//   EMAIL_FROM          (optional) display name/address for the From header
//
// SUPABASE-PROVIDED (injected automatically, used for logging):
//   SUPABASE_URL
//   SUPABASE_SERVICE_ROLE_KEY
//
// Request body (POST JSON):  { to, subject, html, filename?, pdfData? }
//   - `to` may be a single address or a comma-separated list
//   - `pdfData` is a base64 string; `filename` gives it a name/type
// -----------------------------------------------------------------------------

import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

// CORS: allow the request's origin (GitHub Pages, custom domain, localhost, etc.)
function corsHeaders(origin: string): HeadersInit {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-requested-with",
    "Access-Control-Max-Age": "86400",
  };
}

function contentTypeFor(filename: string): string {
  const f = filename.toLowerCase();
  if (f.endsWith(".pdf")) return "application/pdf";
  if (f.endsWith(".png")) return "image/png";
  if (f.endsWith(".jpg") || f.endsWith(".jpeg")) return "image/jpeg";
  if (f.endsWith(".xls") || f.endsWith(".xlsx"))
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if (f.endsWith(".doc") || f.endsWith(".docx"))
    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (f.endsWith(".txt")) return "text/plain";
  return "application/octet-stream";
}

// Best-effort write to the mail_logs table (uses the service role key).
async function logMail(row: Record<string, unknown>) {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) return;
    await fetch(`${url}/rest/v1/mail_logs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: key,
        Authorization: `Bearer ${key}`,
        Prefer: "return=minimal",
      },
      body: JSON.stringify([row]),
    });
  } catch (_e) {
    // logging is best-effort; never fail the send because of it
  }
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin") || "*";
  const cors = corsHeaders(origin);

  // Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  let body: any;
  try {
    body = await req.json();
  } catch (_e) {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }

  const { to, subject, html, filename, pdfData } = body ?? {};

  if (!to || !subject || !html) {
    return new Response(
      JSON.stringify({ error: "Missing to, subject, or html body" }),
      { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  const user = Deno.env.get("GMAIL_USER");
  const pass = Deno.env.get("GMAIL_APP_PASSWORD");
  if (!user || !pass) {
    return new Response(
      JSON.stringify({
        error:
          "Server not configured: set GMAIL_USER and GMAIL_APP_PASSWORD secrets.",
      }),
      { status: 500, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }

  const fromHeader = Deno.env.get("EMAIL_FROM") ||
    `Bally Jute PO Desk <${user}>`;
  const recipients = String(to)
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);

  const attachments =
    filename && pdfData
      ? [
          {
            filename,
            content: pdfData, // base64 string
            encoding: "base64" as const,
            contentType: contentTypeFor(filename),
          },
        ]
      : undefined;

  const client = new SMTPClient({
    connection: {
      hostname: "smtp.gmail.com",
      port: 465,
      tls: true,
      auth: { username: user, password: pass },
    },
  });

  try {
    // denomailer's documented, attachment-safe form: "auto" generates the
    // plain-text part from the HTML, `html` is the rich body, and `attachments`
    // (base64) ride alongside in a multipart/mixed message.
    await client.send({
      from: fromHeader,
      to: recipients,
      subject,
      content: "auto",
      html,
      attachments,
    });
    await client.close();

    const messageId = `gmail-${Date.now()}`;
    await logMail({
      to_email: to,
      subject,
      status: "Sent",
      provider: "gmail-smtp",
      message_id: messageId,
    });

    return new Response(
      JSON.stringify({ success: true, provider: "gmail-smtp", messageId }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (err) {
    try {
      await client.close();
    } catch (_e) { /* ignore */ }

    const message = err instanceof Error ? err.message : String(err);
    await logMail({
      to_email: to,
      subject,
      status: "Failed",
      provider: "gmail-smtp",
      error_message: message,
    });

    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 502, headers: { ...cors, "Content-Type": "application/json" } },
    );
  }
});
