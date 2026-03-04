import { useEffect, useRef, useState, useCallback } from "react";
import { ClassSchedule } from "@/types/schedule";

export type NotificationStatus = "unsupported" | "default" | "granted" | "denied";

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
          new Notification(`📚 ${cls.subject} starts in ${diff} min`, {
            body: "Get ready for class!",
            icon: "/favicon.ico",
            tag: key,
          });
        }
      });
    }, 10000); // Check every 10 seconds for more accuracy

    return () => clearInterval(interval);
  }, [classes]);

  return { status, requestPermission };
};
