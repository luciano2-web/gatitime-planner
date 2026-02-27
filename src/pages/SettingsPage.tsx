import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Edit2, Save, Plus, ExternalLink } from "lucide-react";
import { CLASS_COLORS, DAYS_OF_WEEK } from "@/types/schedule";
import type { ClassSchedule } from "@/types/schedule";

const SettingsPage = () => {
  const { classes, deleteClass, updateClass, addClass } = useApp();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<ClassSchedule | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newClass, setNewClass] = useState({
    subject: "",
    startTime: "08:00",
    endTime: "09:00",
    link: "",
    days: [1, 2, 3, 4, 5] as number[],
  });

  const startEdit = (cls: ClassSchedule) => {
    setEditingId(cls.id);
    setEditDraft({ ...cls });
  };

  const saveEdit = () => {
    if (editDraft) {
      updateClass(editDraft);
      setEditingId(null);
      setEditDraft(null);
    }
  };

  const handleAddNew = () => {
    if (!newClass.subject.trim()) return;
    addClass({
      ...newClass,
      subject: newClass.subject.trim(),
      color: CLASS_COLORS[classes.length % CLASS_COLORS.length],
    });
    setNewClass({ subject: "", startTime: "08:00", endTime: "09:00", link: "", days: [1, 2, 3, 4, 5] });
    setShowAdd(false);
  };

  return (
    <div className="space-y-6 animate-fade-in pt-8 md:pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Manage Schedule</h1>
        <Button variant="outline" onClick={() => setShowAdd(!showAdd)} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Class
        </Button>
      </div>

      {/* Add new class form */}
      {showAdd && (
        <div className="rounded-xl border border-primary/30 bg-card p-4 space-y-3 glow-primary-sm animate-fade-in">
          <div className="grid gap-3 md:grid-cols-2">
            <Input
              value={newClass.subject}
              onChange={e => setNewClass(n => ({ ...n, subject: e.target.value }))}
              placeholder="Subject name"
              className="bg-input border-border"
            />
            <Input
              value={newClass.link}
              onChange={e => setNewClass(n => ({ ...n, link: e.target.value }))}
              placeholder="Class link"
              className="bg-input border-border"
            />
          </div>
          <div className="grid gap-3 grid-cols-2">
            <Input
              type="time"
              value={newClass.startTime}
              onChange={e => setNewClass(n => ({ ...n, startTime: e.target.value }))}
              className="bg-input border-border"
            />
            <Input
              type="time"
              value={newClass.endTime}
              onChange={e => setNewClass(n => ({ ...n, endTime: e.target.value }))}
              className="bg-input border-border"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {DAYS_OF_WEEK.map((day, dayIdx) => (
              <button
                key={day}
                onClick={() =>
                  setNewClass(n => ({
                    ...n,
                    days: n.days.includes(dayIdx) ? n.days.filter(d => d !== dayIdx) : [...n.days, dayIdx],
                  }))
                }
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                  newClass.days.includes(dayIdx)
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {day}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAddNew} size="sm" className="glow-primary-sm">
              <Save className="h-3.5 w-3.5" />
              Save
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowAdd(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Class list */}
      {classes.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground">No classes yet. Add your first class above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {classes.map(cls => {
            const isEditing = editingId === cls.id;
            const data = isEditing && editDraft ? editDraft : cls;

            return (
              <div
                key={cls.id}
                className="rounded-xl border border-border bg-card p-4 space-y-3 border-glow-hover transition-all"
                style={{ borderLeftColor: `hsl(${cls.color})`, borderLeftWidth: 3 }}
              >
                {isEditing ? (
                  <>
                    <div className="grid gap-3 md:grid-cols-2">
                      <Input
                        value={data.subject}
                        onChange={e => setEditDraft(d => d && { ...d, subject: e.target.value })}
                        className="bg-input border-border"
                      />
                      <Input
                        value={data.link}
                        onChange={e => setEditDraft(d => d && { ...d, link: e.target.value })}
                        className="bg-input border-border"
                      />
                    </div>
                    <div className="grid gap-3 grid-cols-2">
                      <Input
                        type="time"
                        value={data.startTime}
                        onChange={e => setEditDraft(d => d && { ...d, startTime: e.target.value })}
                        className="bg-input border-border"
                      />
                      <Input
                        type="time"
                        value={data.endTime}
                        onChange={e => setEditDraft(d => d && { ...d, endTime: e.target.value })}
                        className="bg-input border-border"
                      />
                    </div>
                    <div className="flex gap-1.5 flex-wrap">
                      {DAYS_OF_WEEK.map((day, dayIdx) => (
                        <button
                          key={day}
                          onClick={() =>
                            setEditDraft(d =>
                              d && {
                                ...d,
                                days: d.days.includes(dayIdx) ? d.days.filter(x => x !== dayIdx) : [...d.days, dayIdx],
                              }
                            )
                          }
                          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
                            data.days.includes(dayIdx)
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-secondary-foreground"
                          }`}
                        >
                          {day}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={saveEdit} className="glow-primary-sm">
                        <Save className="h-3.5 w-3.5" />
                        Save
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => { setEditingId(null); setEditDraft(null); }}>
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-foreground">{cls.subject}</h3>
                      <p className="text-sm text-muted-foreground font-mono">
                        {cls.startTime} — {cls.endTime} • {cls.days.map(d => DAYS_OF_WEEK[d]).join(", ")}
                      </p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {cls.link && (
                        <Button size="icon" variant="ghost" onClick={() => window.open(cls.link, "_blank")}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button size="icon" variant="ghost" onClick={() => startEdit(cls)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteClass(cls.id)} className="hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SettingsPage;
