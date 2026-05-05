import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Clock, Smartphone, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ClassSchedule, DAYS_FULL } from "@/types/schedule";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface NextClassWidgetProps {
  classes: ClassSchedule[];
}

interface UpcomingClass {
  cls: ClassSchedule;
  date: Date;
  isLive: boolean;
  endDate: Date;
}

const findUpcoming = (classes: ClassSchedule[], now: Date): UpcomingClass | null => {
  if (classes.length === 0) return null;
  let best: UpcomingClass | null = null;

  for (let offset = 0; offset < 7; offset++) {
    const day = new Date(now);
    day.setDate(now.getDate() + offset);
    const dow = day.getDay();

    for (const c of classes) {
      if (!c.days.includes(dow)) continue;
      const [sh, sm] = c.startTime.split(":").map(Number);
      const [eh, em] = c.endTime.split(":").map(Number);
      const start = new Date(day);
      start.setHours(sh, sm, 0, 0);
      const end = new Date(day);
      end.setHours(eh, em, 0, 0);

      if (end <= now) continue; // already finished
      const isLive = start <= now && now < end;
      const candidate: UpcomingClass = { cls: c, date: start, endDate: end, isLive };

      if (!best) best = candidate;
      else {
        // prefer live, then earliest start
        if (candidate.isLive && !best.isLive) best = candidate;
        else if (!best.isLive && candidate.date < best.date) best = candidate;
      }
    }
    if (best) return best;
  }
  return best;
};

const formatCountdown = (ms: number) => {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return { h, m, s };
};

export const NextClassWidget = ({ classes }: NextClassWidgetProps) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const upcoming = useMemo(() => findUpcoming(classes, now), [classes, now]);

  if (!upcoming) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span className="text-xs uppercase tracking-wider">Próxima clase</span>
        </div>
        <p className="mt-3 text-foreground">No tienes clases próximas 🎉</p>
        <InstallGuideTrigger />
      </div>
    );
  }

  const { cls, date, isLive, endDate } = upcoming;
  const targetMs = (isLive ? endDate.getTime() : date.getTime()) - now.getTime();
  const { h, m, s } = formatCountdown(targetMs);

  const sameDay = date.toDateString() === now.toDateString();
  const dayLabel = sameDay
    ? "Hoy"
    : date.toDateString() === new Date(now.getTime() + 86400000).toDateString()
    ? "Mañana"
    : DAYS_FULL[date.getDay()];

  return (
    <div
      className="rounded-2xl border bg-card p-5 md:p-6 glow-primary-sm relative overflow-hidden"
      style={{ borderColor: `hsl(${cls.color} / 0.5)` }}
    >
      <div className="absolute inset-0 opacity-10 pointer-events-none"
        style={{ background: `radial-gradient(circle at top right, hsl(${cls.color}), transparent 60%)` }}
      />
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isLive ? (
              <>
                <span className="h-2 w-2 rounded-full bg-success animate-pulse-glow" />
                <span className="text-xs font-semibold text-success uppercase tracking-wider">En curso</span>
              </>
            ) : (
              <>
                <Clock className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-wider">Próxima clase</span>
              </>
            )}
          </div>
          <InstallGuideTrigger compact />
        </div>

        <h3 className="text-xl md:text-2xl font-bold text-foreground truncate">{cls.subject}</h3>
        <p className="text-sm text-muted-foreground font-mono mt-1">
          {dayLabel} · {cls.startTime} — {cls.endTime}
        </p>

        <div className="mt-5 flex items-end gap-2 font-mono">
          {h > 0 && (
            <>
              <CountUnit value={h} label="hrs" />
              <span className="text-2xl text-muted-foreground pb-2">:</span>
            </>
          )}
          <CountUnit value={m} label="min" />
          <span className="text-2xl text-muted-foreground pb-2 animate-pulse-glow">:</span>
          <CountUnit value={s} label="seg" />
          <span className="ml-auto text-xs text-muted-foreground pb-2">
            {isLive ? "termina en" : "comienza en"}
          </span>
        </div>

        <Button
          className="mt-5 w-full glow-primary-sm"
          size="lg"
          disabled={!cls.link}
          onClick={() => cls.link && window.open(cls.link, "_blank")}
        >
          {cls.link ? "Entrar a clase" : "Sin enlace guardado"}
          {cls.link && <ExternalLink className="h-4 w-4" />}
        </Button>
      </div>
    </div>
  );
};

const CountUnit = ({ value, label }: { value: number; label: string }) => (
  <div className="flex flex-col items-center">
    <span className="text-3xl md:text-4xl font-bold text-primary text-glow tabular-nums">
      {String(value).padStart(2, "0")}
    </span>
    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
  </div>
);

const InstallGuideTrigger = ({ compact = false }: { compact?: boolean }) => (
  <Dialog>
    <DialogTrigger asChild>
      <Button variant="ghost" size={compact ? "sm" : "default"} className="text-muted-foreground hover:text-primary">
        <Smartphone className="h-4 w-4" />
        {!compact && <span>Instalar app</span>}
        {compact && <span className="text-xs">Widget</span>}
      </Button>
    </DialogTrigger>
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" />
          Instalar GatiSchool como app
        </DialogTitle>
        <DialogDescription>
          Para usar el widget de "Próxima clase" desde el icono de tu teléfono, instala la app en tu pantalla de inicio.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 text-sm">
        <Step n="📱" title="Android (Chrome)">
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Abre el menú ⋮ arriba a la derecha</li>
            <li>Toca <strong className="text-foreground">"Instalar app"</strong> o <strong className="text-foreground">"Añadir a pantalla de inicio"</strong></li>
            <li>Mantén pulsado el icono → tendrás accesos rápidos a Próxima clase, Calendario y Tareas</li>
          </ol>
        </Step>

        <Step n="🍎" title="iPhone / iPad (Safari)">
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Toca el botón <strong className="text-foreground">Compartir</strong> (cuadrado con flecha ↑)</li>
            <li>Selecciona <strong className="text-foreground">"Añadir a pantalla de inicio"</strong></li>
            <li>Confirma con <strong className="text-foreground">Añadir</strong></li>
          </ol>
        </Step>

        <Step n="💻" title="Escritorio (Chrome / Edge)">
          <ol className="list-decimal list-inside space-y-1 text-muted-foreground">
            <li>Mira el icono de instalar (⊕) en la barra de direcciones</li>
            <li>Click en <strong className="text-foreground">"Instalar GatiSchool"</strong></li>
          </ol>
        </Step>

        <div className="flex items-start gap-2 rounded-lg bg-primary/5 border border-primary/20 p-3">
          <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-muted-foreground">
            iOS no permite widgets reales para apps web. La instalación crea un icono nativo y permite notificaciones cuando abres la app.
          </p>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);

const Step = ({ n, title, children }: { n: string; title: string; children: React.ReactNode }) => (
  <div className="rounded-lg border border-border bg-card/50 p-3">
    <p className="font-semibold text-foreground mb-2">
      <span className="mr-2">{n}</span>{title}
    </p>
    {children}
  </div>
);
