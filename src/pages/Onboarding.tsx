import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, ArrowRight } from "lucide-react";
import logo from "@/assets/logo.png";
import { CLASS_COLORS, DAYS_OF_WEEK } from "@/types/schedule";

interface ClassDraft {
  subject: string;
  startTime: string;
  endTime: string;
  link: string;
  days: number[];
}

const emptyClass = (): ClassDraft => ({
  subject: "",
  startTime: "08:00",
  endTime: "09:00",
  link: "",
  days: [1, 2, 3, 4, 5],
});

const Onboarding = () => {
  const [drafts, setDrafts] = useState<ClassDraft[]>([emptyClass()]);
  const { addClass, completeOnboarding, userName } = useApp();
  const navigate = useNavigate();

  const updateDraft = (idx: number, field: keyof ClassDraft, value: any) => {
    setDrafts(d => d.map((c, i) => (i === idx ? { ...c, [field]: value } : c)));
  };

  const toggleDay = (idx: number, day: number) => {
    setDrafts(d =>
      d.map((c, i) =>
        i === idx
          ? { ...c, days: c.days.includes(day) ? c.days.filter(d => d !== day) : [...c.days, day] }
          : c
      )
    );
  };

  const removeDraft = (idx: number) => {
    setDrafts(d => d.filter((_, i) => i !== idx));
  };

  const handleFinish = () => {
    drafts
      .filter(d => d.subject.trim())
      .forEach((d, i) => {
        addClass({
          subject: d.subject.trim(),
          startTime: d.startTime,
          endTime: d.endTime,
          link: d.link.trim(),
          days: d.days,
          color: CLASS_COLORS[i % CLASS_COLORS.length],
        });
      });
    completeOnboarding(userName);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background grid-bg px-4 py-8 md:py-12">
      <div className="mx-auto max-w-2xl animate-fade-in">
        {/* Header */}
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <img src={logo} alt="GatiSchool" className="h-12 w-12 rounded-xl" />
          <h1 className="text-2xl font-bold text-foreground">Set Up Your Schedule</h1>
          <p className="text-sm text-muted-foreground max-w-md">
            Add your classes below. You can always edit these later.
          </p>
        </div>

        {/* Class Forms */}
        <div className="space-y-4">
          {drafts.map((draft, idx) => (
            <div
              key={idx}
              className="rounded-xl border border-border bg-card p-5 space-y-4 border-glow-hover transition-all animate-fade-in"
              style={{ borderLeftColor: `hsl(${CLASS_COLORS[idx % CLASS_COLORS.length]})`, borderLeftWidth: 3 }}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">Class {idx + 1}</span>
                {drafts.length > 1 && (
                  <button onClick={() => removeDraft(idx)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Subject</label>
                  <Input
                    value={draft.subject}
                    onChange={e => updateDraft(idx, "subject", e.target.value)}
                    placeholder="e.g. Mathematics"
                    className="bg-input border-border"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Class Link</label>
                  <Input
                    value={draft.link}
                    onChange={e => updateDraft(idx, "link", e.target.value)}
                    placeholder="https://zoom.us/j/..."
                    className="bg-input border-border"
                  />
                </div>
              </div>

              <div className="grid gap-3 grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Start Time</label>
                  <Input
                    type="time"
                    value={draft.startTime}
                    onChange={e => updateDraft(idx, "startTime", e.target.value)}
                    className="bg-input border-border"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">End Time</label>
                  <Input
                    type="time"
                    value={draft.endTime}
                    onChange={e => updateDraft(idx, "endTime", e.target.value)}
                    className="bg-input border-border"
                  />
                </div>
              </div>

              {/* Days */}
              <div>
                <label className="mb-2 block text-xs text-muted-foreground">Days</label>
                <div className="flex gap-1.5 flex-wrap">
                  {DAYS_OF_WEEK.map((day, dayIdx) => (
                    <button
                      key={day}
                      type="button"
                      onClick={() => toggleDay(idx, dayIdx)}
                      className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                        draft.days.includes(dayIdx)
                          ? "bg-primary text-primary-foreground glow-primary-sm"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
          <Button
            variant="outline"
            onClick={() => setDrafts(d => [...d, emptyClass()])}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Add Another Class
          </Button>
          <Button onClick={handleFinish} className="glow-primary-sm gap-2" size="lg">
            Go to Dashboard
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
