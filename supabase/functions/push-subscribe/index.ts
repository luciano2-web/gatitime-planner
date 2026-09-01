import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";

  // Clave pública VAPID (necesaria en el navegador para suscribirse)
  if (req.method === "GET") return json({ publicKey });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    if (!token) return json({ error: "No autenticado" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "No autenticado" }, 401);
    const userId = userData.user.id;

    const body = await req.json();
    const action = body?.action ?? "subscribe";

    if (action === "unsubscribe") {
      const endpoint = String(body?.endpoint ?? "");
      if (!endpoint) return json({ error: "endpoint requerido" }, 400);
      await supabase.from("push_subscriptions").delete().eq("user_id", userId).eq("endpoint", endpoint);
      return json({ ok: true });
    }

    const sub = body?.subscription;
    const endpoint = sub?.endpoint;
    const p256dh = sub?.keys?.p256dh;
    const auth = sub?.keys?.auth;
    if (!endpoint || !p256dh || !auth) return json({ error: "Suscripción inválida" }, 400);

    const { error } = await supabase.from("push_subscriptions").upsert(
      {
        user_id: userId,
        endpoint,
        p256dh,
        auth,
        timezone: typeof body?.timezone === "string" ? body.timezone : "UTC",
        user_agent: req.headers.get("user-agent") ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "endpoint" },
    );
    if (error) {
      console.error("upsert push_subscriptions failed", error);
      return json({ error: error.message }, 500);
    }

    return json({ ok: true, publicKey });
  } catch (e) {
    console.error("push-subscribe error", e);
    return json({ error: String(e) }, 500);
  }
});
