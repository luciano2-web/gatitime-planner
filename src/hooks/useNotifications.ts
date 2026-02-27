import { useEffect, useRef } from "react";
import { ClassSchedule } from "@/types/schedule";

export const useNotifications = (classes: ClassSchedule[]) => {
  const notifiedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (Notification.permission !== "granted") return;

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
          });
        }
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [classes]);
};

export const requestNotificationPermission = async () => {
  if (!("Notification" in window)) return false;
  const perm = await Notification.requestPermission();
  return perm === "granted";
};
