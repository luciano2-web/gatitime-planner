import { supabase } from "@/integrations/supabase/client";

const urlBase64ToUint8Array = (base64String: string) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
};

const getPublicKey = async (): Promise<string | null> => {
  const { data, error } = await supabase.functions.invoke("push-subscribe", { method: "GET" });
  if (error || !data?.publicKey) {
    console.error("[push] no se pudo obtener la clave VAPID", error);
    return null;
  }
  return data.publicKey as string;
};

export type PushResult =
  | { status: "registered" }
  | { status: "unsupported" | "not-configured" | "denied" | "no-session" | "error" };

/** Suscribe este dispositivo a las notificaciones push del servidor. */
export const enableWebPush = async (
  registration: ServiceWorkerRegistration | null,
): Promise<PushResult> => {
  if (!registration || !("PushManager" in window)) return { status: "unsupported" };
  if (Notification.permission !== "granted") return { status: "denied" };

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { status: "no-session" };

  try {
    const publicKey = await getPublicKey();
    if (!publicKey) return { status: "not-configured" };

    let subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const current = subscription.options?.applicationServerKey;
      const expected = urlBase64ToUint8Array(publicKey);
      const same =
        current &&
        new Uint8Array(current).length === expected.length &&
        new Uint8Array(current).every((b, i) => b === expected[i]);
      if (!same) {
        await subscription.unsubscribe().catch(() => undefined);
        subscription = null;
      }
    }

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    const { error } = await supabase.functions.invoke("push-subscribe", {
      body: {
        action: "subscribe",
        subscription: subscription.toJSON(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      },
    });
    if (error) {
      console.error("[push] no se pudo guardar la suscripción", error);
      return { status: "error" };
    }

    console.log("[push] dispositivo suscrito correctamente");
    return { status: "registered" };
  } catch (e) {
    console.error("[push] fallo al suscribirse", e);
    return { status: "error" };
  }
};
