import { useState, useMemo } from "react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, ExternalLink, Sparkles, FileSpreadsheet } from "lucide-react";
import { DAYS_OF_WEEK } from "@/types/schedule";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ScheduleImporter } from "@/components/ScheduleImporter";
import { exportScheduleToExcel } from "@/lib/exportSchedule";
import { toast } from "@/hooks/use-toast";

const HOURS = Array.from({ length: 16 }, (_, i) => i + 6); // 6am–9pm

const CalendarPage = () => {
  const { classes } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [showImporter, setShowImporter] = useState(false);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const monthName = currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" });

  const classesForDay = (dayOfWeek: number) => classes.filter(c => c.days.includes(dayOfWeek));

  const selectedDayClasses = useMemo(() => {
    if (!selectedDate) return [];
    return classesForDay(selectedDate.getDay()).sort((a, b) => a.startTime.localeCompare(b.startTime));
  }, [selectedDate, classes]);

  const isToday = (day: number) => {
    const now = new Date();
    return now.getFullYear() === year && now.getMonth() === month && now.getDate() === day;
  };

  const isSelected = (day: number) => {
    if (!selectedDate) return false;
    return selectedDate.getFullYear() === year && selectedDate.getMonth() === month && selectedDate.getDate() === day;
  };

  // Weekly view helpers
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    d.setDate(d.getDate() - d.getDay());
    return d;
  };

  const [weekStart, setWeekStart] = useState(getWeekStart(new Date()));

  const weekDates = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d;
    }), [weekStart]);

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };
  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };

  const timeToMinutes = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  const weekLabel = `${weekDates[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${weekDates[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`;

  const todayStr = new Date().toDateString();

  return (
    <div className="space-y-6 animate-fade-in pt-8 md:pt-0">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (classes.length === 0) {
                toast({ title: "Sin clases", description: "Añade clases antes de exportar." });
                return;
              }
              exportScheduleToExcel(classes);
              toast({ title: "Horario exportado", description: "Se descargó tu archivo Excel." });
            }}
            className="gap-2"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Exportar Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowImporter(s => !s)}
            className="gap-2 border-primary/40 text-primary hover:bg-primary/10"
          >
            <Sparkles className="h-4 w-4" />
            Importar horario
          </Button>
        </div>
      </div>

      {showImporter && (
        <ScheduleImporter onClose={() => setShowImporter(false)} />
      )}

      <Tabs defaultValue="monthly">
        <TabsList>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="weekly">Weekly</TabsTrigger>
        </TabsList>

        {/* ─── MONTHLY VIEW ─── */}
        <TabsContent value="monthly" className="space-y-6 mt-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={prevMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-lg font-semibold text-foreground">{monthName}</span>
            <Button variant="ghost" size="icon" onClick={nextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-7 border-b border-border">
              {DAYS_OF_WEEK.map(d => (
                <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={`empty-${i}`} className="p-2 md:p-3 border-b border-r border-border min-h-[60px]" />
              ))}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayOfWeek = new Date(year, month, day).getDay();
                const dayClasses = classesForDay(dayOfWeek);
                const hasClasses = dayClasses.length > 0;
                return (
                  <button
                    key={day}
                    onClick={() => setSelectedDate(new Date(year, month, day))}
                    className={`p-2 md:p-3 border-b border-r border-border min-h-[60px] text-left transition-colors hover:bg-secondary/50 ${
                      isSelected(day) ? "bg-primary/10" : ""
                    } ${isToday(day) ? "bg-primary/5" : ""}`}
                  >
                    <span className={`text-sm ${isToday(day) ? "font-bold text-primary" : "text-foreground"} ${isSelected(day) ? "text-primary" : ""}`}>
                      {day}
                    </span>
                    {hasClasses && (
                      <div className="mt-1 flex gap-0.5 flex-wrap">
                        {dayClasses.slice(0, 3).map(c => (
                          <span key={c.id} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: `hsl(${c.color})` }} />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedDate && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                {selectedDate.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
              </h3>
              {selectedDayClasses.length === 0 ? (
                <p className="text-sm text-muted-foreground">No classes on this day</p>
              ) : (
                <div className="space-y-2">
                  {selectedDayClasses.map(cls => (
                    <div
                      key={cls.id}
                      className="flex items-center gap-3 rounded-lg border border-border bg-card p-3 border-glow-hover transition-all"
                      style={{ borderLeftColor: `hsl(${cls.color})`, borderLeftWidth: 3 }}
                    >
                      <span className="font-mono text-xs text-muted-foreground w-24">{cls.startTime} — {cls.endTime}</span>
                      <span className="flex-1 text-sm font-medium text-foreground">{cls.subject}</span>
                      {cls.link && (
                        <Button size="sm" variant="ghost" onClick={() => window.open(cls.link, "_blank")}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* ─── WEEKLY VIEW ─── */}
        <TabsContent value="weekly" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={prevWeek}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-lg font-semibold text-foreground">{weekLabel}</span>
            <Button variant="ghost" size="icon" onClick={nextWeek}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="min-w-[700px]">
              {/* Day headers */}
              <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border sticky top-0 bg-card z-10">
                <div className="p-2" />
                {weekDates.map((d, i) => {
                  const isTodayCol = d.toDateString() === todayStr;
                  return (
                    <div key={i} className={`p-2 text-center border-l border-border ${isTodayCol ? "bg-primary/10" : ""}`}>
                      <div className="text-xs text-muted-foreground">{DAYS_OF_WEEK[d.getDay()]}</div>
                      <div className={`text-sm font-semibold ${isTodayCol ? "text-primary" : "text-foreground"}`}>{d.getDate()}</div>
                    </div>
                  );
                })}
              </div>

              {/* Time grid */}
              <div>
                {HOURS.map(hour => (
                  <div key={hour} className="grid grid-cols-[60px_repeat(7,1fr)] h-14 border-b border-border">
                    <div className="p-1 text-right pr-2">
                      <span className="text-[10px] text-muted-foreground font-mono">
                        {hour.toString().padStart(2, "0")}:00
                      </span>
                    </div>
                    {weekDates.map((d, colIdx) => {
                      const dayClasses = classesForDay(d.getDay());
                      const gridStart = HOURS[0] * 60;
                      const hourStart = hour * 60;
                      const hourEnd = hourStart + 60;

                      // Find classes that START in this hour cell
                      const startingHere = dayClasses.filter(cls => {
                        const s = timeToMinutes(cls.startTime);
                        return s >= hourStart && s < hourEnd;
                      });

                      return (
                        <div key={colIdx} className="border-l border-border relative">
                          {startingHere.map(cls => {
                            const startMin = timeToMinutes(cls.startTime);
                            const endMin = timeToMinutes(cls.endTime);
                            const offsetInHour = startMin - hourStart;
                            const duration = endMin - startMin;
                            const topPx = (offsetInHour / 60) * 56;
                            const heightPx = (duration / 60) * 56;

                            return (
                              <div
                                key={cls.id}
                                className="absolute left-0.5 right-0.5 rounded-md px-1.5 py-1 text-[10px] leading-tight font-medium overflow-hidden cursor-pointer hover:brightness-110 transition-all z-10"
                                style={{
                                  top: topPx,
                                  height: Math.max(heightPx, 20),
                                  backgroundColor: `hsl(${cls.color} / 0.2)`,
                                  borderLeft: `3px solid hsl(${cls.color})`,
                                  color: `hsl(${cls.color})`,
                                }}
                                onClick={() => cls.link && window.open(cls.link, "_blank")}
                                title={`${cls.subject}\n${cls.startTime} – ${cls.endTime}`}
                              >
                                <div className="truncate font-semibold">{cls.subject}</div>
                                {heightPx > 30 && (
                                  <div className="truncate opacity-70">{cls.startTime}–{cls.endTime}</div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CalendarPage;
