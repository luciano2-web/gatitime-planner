import { useEffect, useRef, useState, useCallback } from "react";
import { ClassSchedule } from "@/types/schedule";
import { toast } from "sonner";
import { enableWebPush } from "@/lib/webPush";

export type NotificationStatus = "unsupported" | "default" | "granted" | "denied";

// Usa el dominio real donde está corriendo la app (preview, .lovable.app o dominio propio).
const APP_URL =
  typeof window !== "undefined" ? `${window.location.origin}/` : "/";

let swRegistration: ServiceWorkerRegistration | null = null;

const registerSW = async (): Promise<ServiceWorkerRegistration | null> => {
  if (swRegistration) return swRegistration;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  // Los service workers requieren HTTPS (o localhost). Android/iOS solo aceptan el dominio seguro.
  if (!window.isSecureContext) {
    console.warn("[notif] contexto no seguro, se requiere HTTPS para el service worker");
    return null;
  }
  try {
    // Registrado con scope "/" en el dominio actual (preview, .lovable.app o dominio propio).
    swRegistration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    await swRegistration.update().catch(() => undefined);
    swRegistration = await navigator.serviceWorker.ready;
    return swRegistration;
  } catch (e) {
    console.error("[notif] SW register failed", e);
    return null;
  }
};


const showNotification = async (title: string, options: NotificationOptions & { url?: string }) => {
  const { url, ...rest } = options;
  const data = { ...(rest.data || {}), url: url || APP_URL };
  const reg = await registerSW();
  try {
    if (reg && reg.showNotification) {
      await reg.showNotification(title, { ...rest, data });
      console.log("[notif] shown via SW", title);
      return true;
    }
  } catch (e) {
    console.error("[notif] SW showNotification failed", e);
  }
  // Fallback
  try {
    const n = new Notification(title, rest);
    n.onclick = () => {
      window.open(data.url, "_blank");
      n.close();
    };
    console.log("[notif] shown via Notification()", title);
    return true;
  } catch (e) {
    console.error("[notif] Notification() failed", e);
    return false;
  }
};

export const useNotifications = (classes: ClassSchedule[]) => {
  const notifiedRef = useRef<Set<string>>(new Set());
  const [status, setStatus] = useState<NotificationStatus>(() => {
    if (!("Notification" in window)) return "unsupported";
    return Notification.permission as NotificationStatus;
  });

  useEffect(() => {
    (async () => {
      const reg = await registerSW();
      // Si ya hay permiso, re-suscribe el dispositivo al push del servidor.
      if (reg && "Notification" in window && Notification.permission === "granted") {
        await enableWebPush(reg);
      }
    })();
  }, []);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      toast.error("Tu navegador no soporta notificaciones");
      return false;
    }
    const perm = await Notification.requestPermission();
    setStatus(perm as NotificationStatus);
    if (perm === "granted") {
      const reg = await registerSW();
      const push = await enableWebPush(reg);
      if (push.status === "registered") {
        toast.success("Notificaciones activadas — llegarán incluso con la app cerrada");
      } else if (push.status === "no-session") {
        toast.success("Notificaciones activadas. Inicia sesión para recibirlas con la app cerrada.");
      } else if (push.status === "unsupported") {
        toast.success("Notificaciones activadas (este navegador no admite avisos con la app cerrada)");
      } else {
        toast.success("Notificaciones activadas");
        toast.warning("No se pudo registrar el aviso con la app cerrada. Revisa la consola.");
      }
    } else if (perm === "denied") {
      toast.error("Permiso denegado. Habilítalo en la configuración del navegador.");
    }
    return perm === "granted";
  }, []);

  const sendTestNotification = useCallback(async () => {
    const log: string[] = [];
    const add = (m: string) => { log.push(m); console.log("[notif-diag]", m); };

    if (!("Notification" in window)) {
      toast.error("Tu navegador no soporta notificaciones");
      return;
    }
    add(`Permiso actual: ${Notification.permission}`);
    if (Notification.permission !== "granted") {
      toast.error("Primero activa los permisos de notificación");
      return;
    }

    // 1. Verificar Service Worker
    if (!("serviceWorker" in navigator)) {
      add("Service Worker NO soportado en este navegador");
    } else {
      const reg = await registerSW();
      if (!reg) {
        add("Falló el registro del Service Worker");
      } else {
        add(`SW registrado. Estado: active=${!!reg.active} | installing=${!!reg.installing} | waiting=${!!reg.waiting}`);
        add(`Scope: ${reg.scope}`);
      }
    }

    // 2. Verificar visibilidad de la página (algunos navegadores ocultan notif si la pestaña está activa)
    add(`Documento visible: ${document.visibilityState} | focused: ${document.hasFocus()}`);

    // 3. Standalone / iOS PWA check
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches
      || (navigator as any).standalone === true;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    add(`iOS: ${isIOS} | Standalone (PWA): ${isStandalone}`);

    if (isIOS && !isStandalone) {
      toast.error("En iOS debes añadir esta web a la pantalla de inicio para recibir notificaciones.", {
        duration: 8000,
      });
      return;
    }

    // 4. Intentar mostrar
    const ok = await showNotification("🔔 GatiSchool - Prueba", {
      body: "¡Las notificaciones funcionan! Haz clic para abrir GatiSchool.",
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: "test-notification",
      url: APP_URL,
    } as NotificationOptions & { url?: string });

    if (ok) {
      // 5. Verificar que efectivamente quedó registrada en el SW
      try {
        const reg = await registerSW();
        const active = await reg?.getNotifications?.({ tag: "test-notification" });
        add(`Notificaciones activas con ese tag: ${active?.length ?? 0}`);
        if (active && active.length > 0) {
          toast.success("Notificación enviada correctamente. Revisa el centro de notificaciones del sistema.");
        } else {
          toast.warning(
            "La notificación se envió pero no aparece. Causas habituales: modo No molestar activo, pestaña en primer plano, o el sistema operativo bloquea notificaciones del navegador. Revisa la consola para más detalles.",
            { duration: 10000 }
          );
          console.warn("[notif-diag] Diagnóstico completo:\n" + log.join("\n"));
        }
      } catch (e) {
        console.error("[notif-diag] No se pudo verificar getNotifications", e);
        toast.success("Notificación enviada — revisa tu centro de notificaciones");
      }
    } else {
      toast.error(
        "No se pudo mostrar la notificación. Verifica que tu sistema permita notificaciones del navegador. Detalles en consola.",
        { duration: 10000 }
      );
      console.warn("[notif-diag] Diagnóstico completo:\n" + log.join("\n"));
    }
  }, []);

  // Check every 10 seconds for upcoming classes
  useEffect(() => {
    const interval = setInterval(() => {
      if (!("Notification" in window) || Notification.permission !== "granted") return;

      const now = new Date();
      const today = now.getDay();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      classes.forEach(cls => {
        if (!cls.days.includes(today)) return;
        const [h, m] = cls.startTime.split(":").map(Number);
        const classMinutes = h * 60 + m;
        const diff = classMinutes - nowMinutes;
        const dayKey = now.toDateString();

        // Aviso previo (10 min antes)
        const preKey = `pre-${cls.id}-${dayKey}`;
        if (diff > 0 && diff <= 10 && !notifiedRef.current.has(preKey)) {
          notifiedRef.current.add(preKey);
          showNotification(`📚 ${cls.subject} empieza en ${diff} min`, {
            body: cls.link ? "Toca para entrar a la clase" : "¡Prepárate para la clase!",
            icon: "/favicon.ico",
            badge: "/favicon.ico",
            tag: preKey,
            requireInteraction: true,
            url: cls.link || APP_URL,
          } as NotificationOptions & { url?: string });
        }

        // Aviso al iniciar la clase
        const startKey = `start-${cls.id}-${dayKey}`;
        if (diff <= 0 && diff >= -1 && !notifiedRef.current.has(startKey)) {
          notifiedRef.current.add(startKey);
          showNotification(`🎓 ${cls.subject} ha comenzado`, {
            body: cls.link ? "Toca para entrar ahora a la clase" : "Tu clase está en curso",
            icon: "/favicon.ico",
            badge: "/favicon.ico",
            tag: startKey,
            requireInteraction: true,
            url: cls.link || APP_URL,
          } as NotificationOptions & { url?: string });
        }
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [classes]);

  return { status, requestPermission, sendTestNotification };
};
