import { useState } from "react";
import { useApp } from "@/contexts/AppContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2, Check, Circle } from "lucide-react";

const TasksPage = () => {
  const { tasks, addTask, toggleTask, deleteTask, classes } = useApp();
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    addTask({ title: title.trim(), subject, dueDate: dueDate || new Date().toISOString().split("T")[0] });
    setTitle("");
    setSubject("");
    setDueDate("");
  };

  const filteredTasks = tasks
    .filter(t => {
      if (filter === "pending") return !t.completed;
      if (filter === "done") return t.completed;
      return true;
    })
    .sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    });

  const pendingCount = tasks.filter(t => !t.completed).length;
  const doneCount = tasks.filter(t => t.completed).length;

  return (
    <div className="space-y-6 animate-fade-in pt-8 md:pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Homework & Tasks</h1>
        <span className="text-sm text-muted-foreground">{pendingCount} pending</span>
      </div>

      {/* Add form */}
      <form onSubmit={handleAdd} className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex gap-2">
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="What needs to be done?"
            className="flex-1 bg-input border-border"
          />
          <Button type="submit" size="icon" className="shrink-0 glow-primary-sm">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <select
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="flex-1 rounded-md border border-border bg-input px-3 py-2 text-sm text-foreground"
          >
            <option value="">No subject</option>
            {classes.map(c => (
              <option key={c.id} value={c.subject}>{c.subject}</option>
            ))}
          </select>
          <Input
            type="date"
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
            className="flex-1 bg-input border-border"
          />
        </div>
      </form>

      {/* Filters */}
      <div className="flex gap-1">
        {(["all", "pending", "done"] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            {f === "all" ? `All (${tasks.length})` : f === "pending" ? `Pending (${pendingCount})` : `Done (${doneCount})`}
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {filteredTasks.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <p className="text-muted-foreground">
              {filter === "done" ? "No completed tasks yet" : "No tasks yet. Add one above!"}
            </p>
          </div>
        ) : (
          filteredTasks.map(task => {
            const isOverdue = !task.completed && new Date(task.dueDate) < new Date(new Date().toDateString());
            return (
              <div
                key={task.id}
                className={`flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-all border-glow-hover ${
                  task.completed ? "opacity-60" : ""
                }`}
              >
                <button
                  onClick={() => toggleTask(task.id)}
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                    task.completed
                      ? "border-success bg-success"
                      : "border-muted-foreground hover:border-primary"
                  }`}
                >
                  {task.completed ? (
                    <Check className="h-3 w-3 text-success-foreground" />
                  ) : (
                    <Circle className="h-3 w-3 text-transparent" />
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {task.title}
                  </p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {task.subject && (
                      <span className="text-xs text-primary">{task.subject}</span>
                    )}
                    <span className={`text-xs ${isOverdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                      {isOverdue ? "Overdue • " : ""}
                      {new Date(task.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => deleteTask(task.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default TasksPage;
