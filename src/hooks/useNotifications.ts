import { useEffect, useRef, useState, useCallback } from "react";
import { ClassSchedule } from "@/types/schedule";

export type NotificationStatus = "unsupported" | "default" | "granted" | "denied";

const APP_URL = "https://gatitime-planner.lovable.app/";

export const useNotifications = (classes: ClassSchedule[]) => {
  const notifiedRef = useRef<Set<string>>(new Set());
  const [status, setStatus] = useState<NotificationStatus>(() => {
    if (!("Notification" in window)) return "unsupported";
    return Notification.permission as NotificationStatus;
  });

  const requestPermission = useCallback(async () => {
    if (!("Notification" in window)) return false;
    const perm = await Notification.requestPermission();
    setStatus(perm as NotificationStatus);
    return perm === "granted";
  }, []);

  const sendTestNotification = useCallback(() => {
    if (!("Notification" in window) || Notification.permission !== "granted") return;
    const notif = new Notification("🔔 GatiSchool - Prueba", {
      body: "¡Las notificaciones están funcionando! Haz clic para abrir GatiSchool.",
      icon: "/favicon.ico",
      tag: "test-notification",
    });
    notif.onclick = () => {
      window.open(APP_URL, "_blank");
      notif.close();
    };
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
          const notif = new Notification(`📚 ${cls.subject} empieza en ${diff} min`, {
            body: cls.link
              ? "¡Haz clic para unirte a la clase!"
              : "¡Prepárate para la clase!",
            icon: "/favicon.ico",
            tag: key,
          });
          notif.onclick = () => {
            if (cls.link) {
              window.open(cls.link, "_blank");
            } else {
              window.open(APP_URL, "_blank");
            }
            notif.close();
          };
        }
      });
    }, 10000);

    return () => clearInterval(interval);
  }, [classes]);

  return { status, requestPermission, sendTestNotification };
};
