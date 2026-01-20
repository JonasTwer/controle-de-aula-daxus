
export interface Lesson {
  id: string;
  meta: string;
  materia: string;
  title: string;
  durationStr: string;
  durationSec: number;
  isCompleted?: boolean;
  createdAt?: string;
}

export interface StudyLog {
  lessonId: string;
  date: string;
  durationSec: number;
  status: 'completed' | 'in_progress';
  notes: string;
  lessonTitle: string;
}

export interface AppStats {
  totalDuration: number;
  totalStudied: number;
  totalDurationFormatted: string;
  totalStudiedFormatted: string;
  remainingFormatted: string;
  remainingCount: number;
  percentage: number;
  completedCount: number;
  streak: number;
  todayFormatted: string;
}

export type TabId = 'dashboard' | 'plan' | 'assistant' | 'config' | 'admin';

export interface MateriaGroup {
  name: string;
  lessons: Lesson[];
  progress: number;
}

export interface MetaGroup {
  name: string;
  modules: MateriaGroup[];
}
