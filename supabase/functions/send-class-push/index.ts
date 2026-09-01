import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const PRE_MINUTES = 10;

// Hora local (minutos desde medianoche) y día de la semana en una zona horaria dada.
const localParts = (date: Date, timeZone: string) => {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour12: false,
  });
  const parts = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const hour = Number(parts.hour === "24" ? "0" : parts.hour);
  return {
    minutes: hour * 60 + Number(parts.minute),
    day: weekdayMap[parts.weekday as string] ?? 0,
    dayKey: `${parts.year}-${parts.month}-${parts.day}`,
  };
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const cronSecret = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret");
  const manual = req.headers.get("Authorization");
  if (cronSecret && provided !== cronSecret && !manual) {
    return json({ error: "No autorizado" }, 401);
  }

  const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
  const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
  const subject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:notificaciones@gatischool.app";
  if (!publicKey || !privateKey) return json({ error: "Faltan las claves VAPID" }, 500);
  webpush.setVapidDetails(subject, publicKey, privateKey);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: subs, error: subsErr } = await supabase.from("push_subscriptions").select("*");
  if (subsErr) {
    console.error("no se pudieron leer las suscripciones", subsErr);
    return json({ error: subsErr.message }, 500);
  }
  if (!subs?.length) return json({ ok: true, sent: 0, reason: "sin dispositivos" });

  const userIds = [...new Set(subs.map((s) => s.user_id))];
  const { data: classes, error: clsErr } = await supabase
    .from("classes")
    .select("*")
    .in("user_id", userIds);
  if (clsErr) {
    console.error("no se pudieron leer las clases", clsErr);
    return json({ error: clsErr.message }, 500);
  }

  const now = new Date();
  let sent = 0;
  const stale: string[] = [];

  for (const sub of subs) {
    const tz = sub.timezone || "UTC";
    let local;
    try {
      local = localParts(now, tz);
    } catch {
      local = localParts(now, "UTC");
    }

    const userClasses = (classes ?? []).filter(
      (c) => c.user_id === sub.user_id && Array.isArray(c.days) && c.days.includes(local.day),
    );

    for (const cls of userClasses) {
      const [h, m] = String(cls.start_time).split(":").map(Number);
      const diff = h * 60 + m - local.minutes;

      let kind: "pre" | "start" | null = null;
      if (diff > 0 && diff <= PRE_MINUTES) kind = "pre";
      else if (diff <= 0 && diff >= -1) kind = "start";
      if (!kind) continue;

      // Evita duplicados: una sola inserción gana por usuario/clase/tipo/día.
      const { error: logErr } = await supabase.from("push_log").insert({
        user_id: sub.user_id,
        class_id: cls.id,
        kind,
        day_key: local.dayKey,
      });
      if (logErr) continue; // ya enviado

      const payload = kind === "pre"
        ? {
          title: `📚 ${cls.subject} empieza en ${diff} min`,
          body: cls.link ? "Toca para entrar a la clase" : "¡Prepárate para la clase!",
          url: cls.link || "/",
          tag: `pre-${cls.id}-${local.dayKey}`,
        }
        : {
          title: `🎓 ${cls.subject} ha comenzado`,
          body: cls.link ? "Toca para entrar ahora a la clase" : "Tu clase está en curso",
          url: cls.link || "/",
          tag: `start-${cls.id}-${local.dayKey}`,
        };

      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
          { TTL: 600, urgency: "high" },
        );
        sent++;
      } catch (e: any) {
        const status = e?.statusCode;
        console.error(`push falló [${status}] ${sub.endpoint.slice(0, 40)}...`, e?.body ?? e?.message);
        if (status === 404 || status === 410) stale.push(sub.endpoint);
      }
    }
  }

  if (stale.length) {
    await supabase.from("push_subscriptions").delete().in("endpoint", stale);
  }

  return json({ ok: true, sent, removed: stale.length });
});
