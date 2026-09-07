export type UserRole = 'intern' | 'mentor' | 'admin';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url?: string | null;
  phone?: string | null;
  bio?: string | null;
  created_at: string;
}

export interface Department {
  id: string;
  name: string;
  created_at: string;
}

export interface Internship {
  id: string;
  intern_id: string;
  mentor_id: string | null;
  department_id: string | null;
  title: string;
  start_date: string;
  end_date: string;
  expected_start_time: string;
  status: 'active' | 'completed' | 'terminated';
  created_at: string;
}

export interface Attendance {
  id: string;
  internship_id: string;
  date: string;
  check_in_time: string | null;
  check_out_time: string | null;
  status: 'on_time' | 'late' | 'early' | 'absent';
  minutes_diff: number;
  notes?: string | null;
  created_at: string;
}

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';
export type TaskStatus = 'not_started' | 'in_progress' | 'completed' | 'overdue';

export interface Task {
  id: string;
  internship_id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  progress: number;
  assigned_date: string;
  deadline: string;
  completion_date: string | null;
  created_at: string;
}

export interface Feedback {
  id: string;
  internship_id: string;
  mentor_id: string;
  technical_skills: number;
  communication: number;
  teamwork: number;
  punctuality: number;
  task_discipline: number;
  overall_rating: number;
  written_feedback: string | null;
  strengths: string | null;
  areas_for_improvement: string | null;
  recommended_actions: string | null;
  created_at: string;
}

export type PerformanceLevel = 'excellent' | 'good' | 'needs_improvement' | 'at_risk';

export interface Performance {
  id: string;
  internship_id: string;
  date: string;
  attendance_score: number;
  punctuality_score: number;
  task_completion_score: number;
  mentor_evaluation_score: number;
  overall_score: number;
  performance_level: PerformanceLevel;
  created_at: string;
}

export type AlertCategory = 'attendance' | 'punctuality' | 'tasks' | 'performance' | 'feedback';
export type AlertSeverity = 'critical' | 'warning' | 'information';

export interface Alert {
  id: string;
  user_id: string;
  internship_id: string | null;
  category: AlertCategory;
  severity: AlertSeverity;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface InternWithDetails extends Profile {
  internship?: Internship & { department?: Department | null };
}

export interface PerformanceBreakdown {
  attendance: number;
  punctuality: number;
  taskCompletion: number;
  mentorEvaluation: number;
  overall: number;
  level: PerformanceLevel;
}

export interface Insight {
  id: string;
  title: string;
  severity: AlertSeverity;
  reason: string;
  action: string;
  category: AlertCategory;
}
