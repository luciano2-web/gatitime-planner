import { useMemo, useState, useEffect } from "react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { ExternalLink, Clock, Bell, BookOpen, ChevronRight } from "lucide-react";
import { DAYS_FULL } from "@/types/schedule";
import { useNotifications } from "@/hooks/useNotifications";

const Dashboard = () => {
  const { classes, userName, tasks } = useApp();
  const [now, setNow] = useState(new Date());

  const { status: notifStatus, requestPermission } = useNotifications(classes);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const today = now.getDay();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const todaysClasses = useMemo(
    () =>
      classes
        .filter(c => c.days.includes(today))
        .sort((a, b) => {
          const [ah, am] = a.startTime.split(":").map(Number);
          const [bh, bm] = b.startTime.split(":").map(Number);
          return ah * 60 + am - (bh * 60 + bm);
        }),
    [classes, today]
  );

  const nextClass = useMemo(() => {
    return todaysClasses.find(c => {
      const [h, m] = c.startTime.split(":").map(Number);
      return h * 60 + m > nowMinutes;
    });
  }, [todaysClasses, nowMinutes]);

  const currentClass = useMemo(() => {
    return todaysClasses.find(c => {
      const [sh, sm] = c.startTime.split(":").map(Number);
      const [eh, em] = c.endTime.split(":").map(Number);
      return nowMinutes >= sh * 60 + sm && nowMinutes < eh * 60 + em;
    });
  }, [todaysClasses, nowMinutes]);

  const countdown = useMemo(() => {
    if (!nextClass) return null;
    const [h, m] = nextClass.startTime.split(":").map(Number);
    const diff = h * 60 + m - nowMinutes;
    const hours = Math.floor(diff / 60);
    const mins = diff % 60;
    return { hours, mins, total: diff };
  }, [nextClass, nowMinutes]);

  const pendingTasks = tasks.filter(t => !t.completed).length;
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-8 animate-fade-in pt-8 md:pt-0">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          {greeting}, {userName || "Student"} 👋
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {DAYS_FULL[today]}, {now.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
        </p>
      </div>

      {/* Notification banner */}
      {countdown && countdown.total <= 10 && (
        <div className="flex items-center gap-3 rounded-xl bg-accent/10 border border-accent/30 p-4 glow-accent animate-pulse-glow">
          <Bell className="h-5 w-5 text-accent shrink-0" />
          <div>
            <p className="text-sm font-semibold text-accent">
              {nextClass!.subject} starts in {countdown.mins} min!
            </p>
            <p className="text-xs text-muted-foreground">Get ready for class</p>
          </div>
          <Button
            size="sm"
            className="ml-auto glow-primary-sm"
            onClick={() => window.open(nextClass!.link, "_blank")}
          >
            Join Now
            <ExternalLink className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <StatCard
          icon={<BookOpen className="h-4 w-4" />}
          label="Today's Classes"
          value={todaysClasses.length.toString()}
          color="primary"
        />
        <StatCard
          icon={<Clock className="h-4 w-4" />}
          label="Next Class"
          value={countdown ? `${countdown.hours > 0 ? countdown.hours + "h " : ""}${countdown.mins}m` : "None"}
          color="accent"
        />
        <StatCard
          icon={<Bell className="h-4 w-4" />}
          label="Pending Tasks"
          value={pendingTasks.toString()}
          color="primary"
          className="col-span-2 md:col-span-1"
        />
      </div>

      {/* Enable notifications prompt */}
      {notifStatus === "default" && (
        <button
          onClick={requestPermission}
          className="w-full rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm text-foreground hover:bg-primary/10 transition-colors flex items-center gap-3"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/15 shrink-0">
            <Bell className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <p className="font-medium">Activar notificaciones</p>
            <p className="text-xs text-muted-foreground">Te avisaremos 10 minutos antes de cada clase</p>
          </div>
          <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
        </button>
      )}

      {notifStatus === "denied" && (
        <div className="w-full rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/15 shrink-0">
            <Bell className="h-5 w-5 text-destructive" />
          </div>
          <div className="text-left">
            <p className="font-medium text-destructive">Notificaciones bloqueadas</p>
            <p className="text-xs text-muted-foreground">Habilítalas en la configuración de tu navegador para recibir alertas</p>
          </div>
        </div>
      )}

      {notifStatus === "granted" && (
        <div className="w-full rounded-xl border border-success/30 bg-success/5 p-3 text-sm flex items-center gap-3">
          <Bell className="h-4 w-4 text-success" />
          <p className="text-muted-foreground">✅ Notificaciones activas — recibirás alertas 10 min antes de clase</p>
        </div>
      )}

      {/* Current class */}
      {currentClass && (
        <div className="rounded-xl border p-5 glow-primary animate-fade-in"
          style={{ borderColor: `hsl(${currentClass.color} / 0.5)` }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse-glow" />
            <span className="text-xs font-medium text-success">LIVE NOW</span>
          </div>
          <h3 className="text-lg font-semibold text-foreground">{currentClass.subject}</h3>
          <p className="text-sm text-muted-foreground font-mono mt-1">
            {currentClass.startTime} — {currentClass.endTime}
          </p>
          {currentClass.link && (
            <Button className="mt-3 glow-primary-sm" onClick={() => window.open(currentClass.link, "_blank")}>
              Enter Class
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* Countdown */}
      {nextClass && !currentClass && countdown && (
        <div className="rounded-xl border border-border bg-card p-6 text-center border-glow-hover transition-all">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Next Class</p>
          <h3 className="text-lg font-semibold text-foreground mb-3">{nextClass.subject}</h3>
          <div className="flex items-center justify-center gap-3 font-mono text-3xl md:text-4xl font-bold text-primary text-glow">
            {countdown.hours > 0 && (
              <>
                <span>{String(countdown.hours).padStart(2, "0")}</span>
                <span className="text-muted-foreground animate-pulse-glow">:</span>
              </>
            )}
            <span>{String(countdown.mins).padStart(2, "0")}</span>
            <span className="text-lg text-muted-foreground">min</span>
          </div>
          <p className="text-sm text-muted-foreground font-mono mt-2">
            Starts at {nextClass.startTime}
          </p>
          {nextClass.link && (
            <Button className="mt-4 glow-primary-sm" onClick={() => window.open(nextClass.link, "_blank")}>
              Enter Class
              <ExternalLink className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}

      {/* Today's Schedule */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-foreground">Today's Schedule</h2>
        {todaysClasses.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">No classes today 🎉</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todaysClasses.map(cls => {
              const [sh, sm] = cls.startTime.split(":").map(Number);
              const [eh, em] = cls.endTime.split(":").map(Number);
              const isPast = nowMinutes >= eh * 60 + em;
              const isNow = nowMinutes >= sh * 60 + sm && nowMinutes < eh * 60 + em;

              return (
                <div
                  key={cls.id}
                  className={`flex items-center gap-4 rounded-xl border bg-card p-4 transition-all border-glow-hover ${
                    isPast ? "opacity-50" : ""
                  }`}
                  style={{ borderLeftColor: `hsl(${cls.color})`, borderLeftWidth: 3 }}
                >
                  <div className="font-mono text-sm text-muted-foreground w-28 shrink-0">
                    {cls.startTime} — {cls.endTime}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {isNow && <span className="h-2 w-2 rounded-full bg-success animate-pulse-glow" />}
                      <span className="font-medium text-foreground truncate">{cls.subject}</span>
                    </div>
                  </div>
                  {cls.link && !isPast && (
                    <Button
                      size="sm"
                      variant={isNow ? "default" : "outline"}
                      className={isNow ? "glow-primary-sm" : ""}
                      onClick={() => window.open(cls.link, "_blank")}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Join</span>
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard = ({
  icon,
  label,
  value,
  color,
  className = "",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "primary" | "accent";
  className?: string;
}) => (
  <div className={`rounded-xl border border-border bg-card p-4 border-glow-hover transition-all ${className}`}>
    <div className={`flex items-center gap-2 mb-2 ${color === "primary" ? "text-primary" : "text-accent"}`}>
      {icon}
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
    <span className="text-2xl font-bold text-foreground font-mono">{value}</span>
  </div>
);

export default Dashboard;
