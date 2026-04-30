import { useEffect, useRef, useState, useCallback } from "react";
import { ClassSchedule } from "@/types/schedule";
import { toast } from "sonner";

export type NotificationStatus = "unsupported" | "default" | "granted" | "denied";

const APP_URL = "https://gatitime-planner.lovable.app/";

let swRegistration: ServiceWorkerRegistration | null = null;

const registerSW = async (): Promise<ServiceWorkerRegistration | null> => {
  if (swRegistration) return swRegistration;
  if (!("serviceWorker" in navigator)) return null;
  try {
    swRegistration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;
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
    registerSW();
  }, []);

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      toast.error("Tu navegador no soporta notificaciones");
      return false;
    }
    const perm = await Notification.requestPermission();
    setStatus(perm as NotificationStatus);
    if (perm === "granted") {
      await registerSW();
      toast.success("Notificaciones activadas");
    } else if (perm === "denied") {
      toast.error("Permiso denegado. Habilítalo en la configuración del navegador.");
    }
    return perm === "granted";
  }, []);

  const sendTestNotification = useCallback(async () => {
    if (!("Notification" in window)) {
      toast.error("Tu navegador no soporta notificaciones");
      return;
    }
    if (Notification.permission !== "granted") {
      toast.error("Primero activa los permisos de notificación");
      return;
    }
    const ok = await showNotification("🔔 GatiSchool - Prueba", {
      body: "¡Las notificaciones funcionan! Haz clic para abrir GatiSchool.",
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: "test-notification",
      url: APP_URL,
    } as NotificationOptions & { url?: string });
    if (ok) {
      toast.success("Notificación enviada — revisa tu centro de notificaciones");
    } else {
      toast.error("No se pudo mostrar la notificación. Verifica que tu sistema permita notificaciones del navegador.");
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
        const key = `${cls.id}-${now.toDateString()}`;

        if (diff > 0 && diff <= 10 && !notifiedRef.current.has(key)) {
          notifiedRef.current.add(key);
          showNotification(`📚 ${cls.subject} empieza en ${diff} min`, {
            body: cls.link ? "¡Haz clic para unirte a la clase!" : "¡Prepárate para la clase!",
            icon: "/favicon.ico",
            badge: "/favicon.ico",
            tag: key,
            url: cls.link || APP_URL,
          } as NotificationOptions & { url?: string });
        }
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [classes]);

  return { status, requestPermission, sendTestNotification };
};
