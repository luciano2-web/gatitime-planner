import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { AppState, ClassSchedule, Task } from "@/types/schedule";

const DEFAULT_STATE: AppState = {
  classes: [],
  tasks: [],
  onboardingComplete: false,
  userName: "",
  isAuthenticated: false,
};

interface AppContextType extends AppState {
  addClass: (cls: Omit<ClassSchedule, "id">) => void;
  updateClass: (cls: ClassSchedule) => void;
  deleteClass: (id: string) => void;
  addTask: (task: Omit<Task, "id" | "createdAt" | "completed">) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;
  completeOnboarding: (name: string) => void;
  login: (name: string) => void;
  logout: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem("gatischool-data");
      return saved ? JSON.parse(saved) : DEFAULT_STATE;
    } catch {
      return DEFAULT_STATE;
    }
  });

  useEffect(() => {
    localStorage.setItem("gatischool-data", JSON.stringify(state));
  }, [state]);

  const addClass = useCallback((cls: Omit<ClassSchedule, "id">) => {
    setState(s => ({
      ...s,
      classes: [...s.classes, { ...cls, id: crypto.randomUUID() }],
    }));
  }, []);

  const updateClass = useCallback((cls: ClassSchedule) => {
    setState(s => ({
      ...s,
      classes: s.classes.map(c => (c.id === cls.id ? cls : c)),
    }));
  }, []);

  const deleteClass = useCallback((id: string) => {
    setState(s => ({ ...s, classes: s.classes.filter(c => c.id !== id) }));
  }, []);

  const addTask = useCallback((task: Omit<Task, "id" | "createdAt" | "completed">) => {
    setState(s => ({
      ...s,
      tasks: [...s.tasks, {
        ...task,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        completed: false,
      }],
    }));
  }, []);

  const toggleTask = useCallback((id: string) => {
    setState(s => ({
      ...s,
      tasks: s.tasks.map(t => (t.id === id ? { ...t, completed: !t.completed } : t)),
    }));
  }, []);

  const deleteTask = useCallback((id: string) => {
    setState(s => ({ ...s, tasks: s.tasks.filter(t => t.id !== id) }));
  }, []);

  const completeOnboarding = useCallback((name: string) => {
    setState(s => ({ ...s, onboardingComplete: true, userName: name }));
  }, []);

  const login = useCallback((name: string) => {
    setState(s => ({ ...s, isAuthenticated: true, userName: name }));
  }, []);

  const logout = useCallback(() => {
    setState(DEFAULT_STATE);
    localStorage.removeItem("gatischool-data");
  }, []);

  return (
    <AppContext.Provider value={{
      ...state,
      addClass,
      updateClass,
      deleteClass,
      addTask,
      toggleTask,
      deleteTask,
      completeOnboarding,
      login,
      logout,
    }}>
      {children}
    </AppContext.Provider>
  );
};
