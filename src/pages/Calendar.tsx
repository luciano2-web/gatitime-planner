import { useState, useMemo } from "react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { DAYS_OF_WEEK } from "@/types/schedule";

const CalendarPage = () => {
  const { classes } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

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

  return (
    <div className="space-y-6 animate-fade-in pt-8 md:pt-0">
      <h1 className="text-2xl font-bold text-foreground">Calendar</h1>

      {/* Month nav */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={prevMonth}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-lg font-semibold text-foreground">{monthName}</span>
        <Button variant="ghost" size="icon" onClick={nextMonth}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Calendar grid */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-7 border-b border-border">
          {DAYS_OF_WEEK.map(d => (
            <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground">
              {d}
            </div>
          ))}
        </div>

        {/* Day cells */}
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
                <span
                  className={`text-sm ${isToday(day) ? "font-bold text-primary" : "text-foreground"} ${
                    isSelected(day) ? "text-primary" : ""
                  }`}
                >
                  {day}
                </span>
                {hasClasses && (
                  <div className="mt-1 flex gap-0.5 flex-wrap">
                    {dayClasses.slice(0, 3).map(c => (
                      <span
                        key={c.id}
                        className="h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: `hsl(${c.color})` }}
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected day details */}
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
                  <span className="font-mono text-xs text-muted-foreground w-24">
                    {cls.startTime} — {cls.endTime}
                  </span>
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
    </div>
  );
};

export default CalendarPage;
