import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

async function authenticate(req: Request): Promise<{ userId: string; admin: any } | Response> {
  const auth = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return json({ error: "Missing Bearer token" }, 401);
  const token = auth.slice(7).trim();
  if (!token.startsWith("gati_sk_")) return json({ error: "Invalid API key format" }, 401);

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } });
  const hash = await sha256(token);
  const { data, error } = await admin
    .from("api_keys")
    .select("user_id, revoked")
    .eq("key_hash", hash)
    .maybeSingle();
  if (error || !data || data.revoked) return json({ error: "Invalid or revoked API key" }, 401);

  // touch last_used_at (fire & forget)
  admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("key_hash", hash).then(() => {});
  return { userId: data.user_id, admin };
}

// Map external -> DB
const toClassRow = (b: any, userId: string) => ({
  user_id: userId,
  subject: String(b.subject ?? "").trim(),
  start_time: String(b.startTime ?? b.start_time ?? ""),
  end_time: String(b.endTime ?? b.end_time ?? ""),
  link: String(b.link ?? ""),
  days: Array.isArray(b.days) ? b.days.map((n: any) => Number(n)).filter((n: number) => n >= 0 && n <= 6) : [],
  color: String(b.color ?? "185 75% 48%"),
});
const toTaskRow = (b: any, userId: string) => ({
  user_id: userId,
  title: String(b.title ?? "").trim(),
  subject: String(b.subject ?? ""),
  due_date: b.dueDate || b.due_date || null,
  completed: Boolean(b.completed ?? false),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  // Path after the function name. Edge functions get called as /api/<rest>
  const parts = url.pathname.split("/").filter(Boolean);
  // parts[0] === "api" (function name). Strip it.
  const route = parts.slice(1); // e.g. ["classes"] or ["classes", ":id"]

  if (route.length === 0) {
    return json({
      name: "GatiSchool API",
      version: "1.0.0",
      endpoints: [
        "GET /classes", "POST /classes", "PATCH /classes/:id", "DELETE /classes/:id",
        "GET /tasks", "POST /tasks", "PATCH /tasks/:id", "DELETE /tasks/:id",
      ],
    });
  }

  const authResult = await authenticate(req);
  if (authResult instanceof Response) return authResult;
  const { userId, admin } = authResult;

  const [resource, id] = route;

  try {
    if (resource === "classes") {
      if (req.method === "GET") {
        const { data, error } = await admin.from("classes").select("*").eq("user_id", userId).order("start_time");
        if (error) throw error;
        return json({ classes: data });
      }
      if (req.method === "POST") {
        const body = await req.json();
        const items = Array.isArray(body.classes) ? body.classes : [body];
        const rows = items.map((b: any) => toClassRow(b, userId));
        const invalid = rows.find((r: any) => !r.subject || !r.start_time || !r.end_time || r.days.length === 0);
        if (invalid) return json({ error: "subject, startTime, endTime, days[] are required" }, 400);
        const { data, error } = await admin.from("classes").insert(rows).select();
        if (error) throw error;
        return json({ created: data }, 201);
      }
      if (id && req.method === "PATCH") {
        const body = await req.json();
        const patch: any = {};
        if (body.subject !== undefined) patch.subject = String(body.subject);
        if (body.startTime !== undefined || body.start_time !== undefined) patch.start_time = String(body.startTime ?? body.start_time);
        if (body.endTime !== undefined || body.end_time !== undefined) patch.end_time = String(body.endTime ?? body.end_time);
        if (body.link !== undefined) patch.link = String(body.link);
        if (body.days !== undefined) patch.days = body.days;
        if (body.color !== undefined) patch.color = String(body.color);
        const { data, error } = await admin.from("classes").update(patch).eq("id", id).eq("user_id", userId).select().maybeSingle();
        if (error) throw error;
        if (!data) return json({ error: "Not found" }, 404);
        return json({ updated: data });
      }
      if (id && req.method === "DELETE") {
        const { error } = await admin.from("classes").delete().eq("id", id).eq("user_id", userId);
        if (error) throw error;
        return json({ deleted: id });
      }
    }

    if (resource === "tasks") {
      if (req.method === "GET") {
        const { data, error } = await admin.from("tasks").select("*").eq("user_id", userId).order("due_date");
        if (error) throw error;
        return json({ tasks: data });
      }
      if (req.method === "POST") {
        const body = await req.json();
        const items = Array.isArray(body.tasks) ? body.tasks : [body];
        const rows = items.map((b: any) => toTaskRow(b, userId));
        const invalid = rows.find((r: any) => !r.title);
        if (invalid) return json({ error: "title is required" }, 400);
        const { data, error } = await admin.from("tasks").insert(rows).select();
        if (error) throw error;
        return json({ created: data }, 201);
      }
      if (id && req.method === "PATCH") {
        const body = await req.json();
        const patch: any = {};
        if (body.title !== undefined) patch.title = String(body.title);
        if (body.subject !== undefined) patch.subject = String(body.subject);
        if (body.dueDate !== undefined || body.due_date !== undefined) patch.due_date = body.dueDate ?? body.due_date ?? null;
        if (body.completed !== undefined) patch.completed = Boolean(body.completed);
        const { data, error } = await admin.from("tasks").update(patch).eq("id", id).eq("user_id", userId).select().maybeSingle();
        if (error) throw error;
        if (!data) return json({ error: "Not found" }, 404);
        return json({ updated: data });
      }
      if (id && req.method === "DELETE") {
        const { error } = await admin.from("tasks").delete().eq("id", id).eq("user_id", userId);
        if (error) throw error;
        return json({ deleted: id });
      }
    }

    return json({ error: "Not found" }, 404);
  } catch (e: any) {
    console.error("API error", e);
    return json({ error: e?.message ?? "Internal error" }, 500);
  }
});
