import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { AppState, ClassSchedule, Task } from "@/types/schedule";
import { supabase } from "@/integrations/supabase/client";

const DEFAULT_STATE: AppState = {
  classes: [],
  tasks: [],
  onboardingComplete: false,
  userName: "",
  isAuthenticated: false,
};

interface AppContextType extends AppState {
  addClass: (cls: Omit<ClassSchedule, "id">) => Promise<void>;
  updateClass: (cls: ClassSchedule) => Promise<void>;
  deleteClass: (id: string) => Promise<void>;
  addTask: (task: Omit<Task, "id" | "createdAt" | "completed">) => Promise<void>;
  toggleTask: (id: string) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  completeOnboarding: (name: string) => Promise<void>;
  login: (name: string) => void;
  logout: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};

// Map DB row -> ClassSchedule
const mapClass = (r: any): ClassSchedule => ({
  id: r.id,
  subject: r.subject,
  startTime: r.start_time,
  endTime: r.end_time,
  link: r.link ?? "",
  days: r.days ?? [],
  color: r.color,
});
const mapTask = (r: any): Task => ({
  id: r.id,
  title: r.title,
  subject: r.subject ?? "",
  dueDate: r.due_date ?? "",
  completed: r.completed,
  createdAt: r.created_at,
});

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(DEFAULT_STATE);
  const userIdRef = useRef<string | null>(null);

  const loadAll = useCallback(async (userId: string) => {
    const [{ data: classes }, { data: tasks }, { data: profile }] = await Promise.all([
      supabase.from("classes").select("*").eq("user_id", userId).order("start_time"),
      supabase.from("tasks").select("*").eq("user_id", userId).order("due_date", { ascending: true }),
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
    ]);
    setState(s => ({
      ...s,
      classes: (classes ?? []).map(mapClass),
      tasks: (tasks ?? []).map(mapTask),
      onboardingComplete: profile?.onboarding_complete ?? false,
      userName: profile?.display_name ?? s.userName,
    }));
  }, []);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        userIdRef.current = session.user.id;
        const name = session.user.user_metadata?.full_name
          || session.user.user_metadata?.name
          || session.user.email?.split("@")[0]
          || "Student";
        setState(s => ({ ...s, isAuthenticated: true, userName: s.userName || name }));
        setTimeout(() => loadAll(session.user.id), 0);
      } else {
        userIdRef.current = null;
        setState(DEFAULT_STATE);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        userIdRef.current = session.user.id;
        const name = session.user.user_metadata?.full_name
          || session.user.user_metadata?.name
          || session.user.email?.split("@")[0]
          || "Student";
        setState(s => ({ ...s, isAuthenticated: true, userName: s.userName || name }));
        loadAll(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadAll]);

  // Realtime: refresh on any external change (e.g. ChatGPT API)
  useEffect(() => {
    const uid = userIdRef.current;
    if (!state.isAuthenticated || !uid) return;
    const channel = supabase
      .channel(`user-${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "classes", filter: `user_id=eq.${uid}` }, () => loadAll(uid))
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks", filter: `user_id=eq.${uid}` }, () => loadAll(uid))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [state.isAuthenticated, loadAll]);

  const addClass = useCallback(async (cls: Omit<ClassSchedule, "id">) => {
    const uid = userIdRef.current;
    if (!uid) return;
    const { data, error } = await supabase.from("classes").insert({
      user_id: uid,
      subject: cls.subject,
      start_time: cls.startTime,
      end_time: cls.endTime,
      link: cls.link,
      days: cls.days,
      color: cls.color,
    }).select().single();
    if (!error && data) setState(s => ({ ...s, classes: [...s.classes, mapClass(data)] }));
  }, []);

  const updateClass = useCallback(async (cls: ClassSchedule) => {
    const uid = userIdRef.current;
    if (!uid) return;
    const { error } = await supabase.from("classes").update({
      subject: cls.subject,
      start_time: cls.startTime,
      end_time: cls.endTime,
      link: cls.link,
      days: cls.days,
      color: cls.color,
    }).eq("id", cls.id);
    if (!error) setState(s => ({ ...s, classes: s.classes.map(c => c.id === cls.id ? cls : c) }));
  }, []);

  const deleteClass = useCallback(async (id: string) => {
    const { error } = await supabase.from("classes").delete().eq("id", id);
    if (!error) setState(s => ({ ...s, classes: s.classes.filter(c => c.id !== id) }));
  }, []);

  const addTask = useCallback(async (task: Omit<Task, "id" | "createdAt" | "completed">) => {
    const uid = userIdRef.current;
    if (!uid) return;
    const { data, error } = await supabase.from("tasks").insert({
      user_id: uid,
      title: task.title,
      subject: task.subject,
      due_date: task.dueDate || null,
    }).select().single();
    if (!error && data) setState(s => ({ ...s, tasks: [...s.tasks, mapTask(data)] }));
  }, []);

  const toggleTask = useCallback(async (id: string) => {
    const current = state.tasks.find(t => t.id === id);
    if (!current) return;
    const { error } = await supabase.from("tasks").update({ completed: !current.completed }).eq("id", id);
    if (!error) setState(s => ({ ...s, tasks: s.tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t) }));
  }, [state.tasks]);

  const deleteTask = useCallback(async (id: string) => {
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (!error) setState(s => ({ ...s, tasks: s.tasks.filter(t => t.id !== id) }));
  }, []);

  const completeOnboarding = useCallback(async (name: string) => {
    const uid = userIdRef.current;
    if (!uid) return;
    await supabase.from("profiles").update({ display_name: name, onboarding_complete: true }).eq("user_id", uid);
    setState(s => ({ ...s, onboardingComplete: true, userName: name }));
  }, []);

  const login = useCallback((name: string) => {
    setState(s => ({ ...s, isAuthenticated: true, userName: name }));
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setState(DEFAULT_STATE);
  }, []);

  return (
    <AppContext.Provider value={{
      ...state,
      addClass, updateClass, deleteClass,
      addTask, toggleTask, deleteTask,
      completeOnboarding, login, logout,
    }}>
      {children}
    </AppContext.Provider>
  );
};
