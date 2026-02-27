export interface ClassSchedule {
  id: string;
  subject: string;
  startTime: string; // HH:mm
  endTime: string;   // HH:mm
  link: string;
  days: number[];    // 0=Sun, 1=Mon, 2=Tue, ...
  color: string;     // HSL accent color
}

export interface Task {
  id: string;
  title: string;
  subject: string;
  dueDate: string;   // ISO date string
  completed: boolean;
  createdAt: string;
}

export interface AppState {
  classes: ClassSchedule[];
  tasks: Task[];
  onboardingComplete: boolean;
  userName: string;
  isAuthenticated: boolean;
}

export const CLASS_COLORS = [
  "185 75% 48%",  // cyan
  "265 70% 60%",  // purple
  "38 85% 55%",   // amber
  "340 75% 55%",  // pink
  "160 70% 42%",  // green
  "210 80% 55%",  // blue
  "15 80% 55%",   // orange
  "280 65% 55%",  // violet
];

export const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const DAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];