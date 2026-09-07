export interface Database {
  public: {
    Tables: {
      departments: {
        Row: { id: string; name: string; created_at: string };
        Insert: { id?: string; name: string; created_at?: string };
        Update: { id?: string; name?: string; created_at?: string };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string;
          role: 'intern' | 'mentor' | 'admin';
          avatar_url: string | null;
          phone: string | null;
          bio: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name: string;
          role?: 'intern' | 'mentor' | 'admin';
          avatar_url?: string | null;
          phone?: string | null;
          bio?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string;
          role?: 'intern' | 'mentor' | 'admin';
          avatar_url?: string | null;
          phone?: string | null;
          bio?: string | null;
          created_at?: string;
        };
      };
      internships: {
        Row: {
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
        };
        Insert: {
          id?: string;
          intern_id: string;
          mentor_id?: string | null;
          department_id?: string | null;
          title?: string;
          start_date: string;
          end_date: string;
          expected_start_time?: string;
          status?: 'active' | 'completed' | 'terminated';
          created_at?: string;
        };
        Update: {
          id?: string;
          intern_id?: string;
          mentor_id?: string | null;
          department_id?: string | null;
          title?: string;
          start_date?: string;
          end_date?: string;
          expected_start_time?: string;
          status?: 'active' | 'completed' | 'terminated';
          created_at?: string;
        };
      };
      attendance: {
        Row: {
          id: string;
          internship_id: string;
          date: string;
          check_in_time: string | null;
          check_out_time: string | null;
          status: 'on_time' | 'late' | 'early' | 'absent';
          minutes_diff: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          internship_id: string;
          date: string;
          check_in_time?: string | null;
          check_out_time?: string | null;
          status?: 'on_time' | 'late' | 'early' | 'absent';
          minutes_diff?: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          internship_id?: string;
          date?: string;
          check_in_time?: string | null;
          check_out_time?: string | null;
          status?: 'on_time' | 'late' | 'early' | 'absent';
          minutes_diff?: number;
          notes?: string | null;
          created_at?: string;
        };
      };
      tasks: {
        Row: {
          id: string;
          internship_id: string;
          title: string;
          description: string | null;
          priority: 'low' | 'medium' | 'high' | 'critical';
          status: 'not_started' | 'in_progress' | 'completed' | 'overdue';
          progress: number;
          assigned_date: string;
          deadline: string;
          completion_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          internship_id: string;
          title: string;
          description?: string | null;
          priority?: 'low' | 'medium' | 'high' | 'critical';
          status?: 'not_started' | 'in_progress' | 'completed' | 'overdue';
          progress?: number;
          assigned_date?: string;
          deadline: string;
          completion_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          internship_id?: string;
          title?: string;
          description?: string | null;
          priority?: 'low' | 'medium' | 'high' | 'critical';
          status?: 'not_started' | 'in_progress' | 'completed' | 'overdue';
          progress?: number;
          assigned_date?: string;
          deadline?: string;
          completion_date?: string | null;
          created_at?: string;
        };
      };
      feedback: {
        Row: {
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
        };
        Insert: {
          id?: string;
          internship_id: string;
          mentor_id: string;
          technical_skills?: number;
          communication?: number;
          teamwork?: number;
          punctuality?: number;
          task_discipline?: number;
          overall_rating?: number;
          written_feedback?: string | null;
          strengths?: string | null;
          areas_for_improvement?: string | null;
          recommended_actions?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          internship_id?: string;
          mentor_id?: string;
          technical_skills?: number;
          communication?: number;
          teamwork?: number;
          punctuality?: number;
          task_discipline?: number;
          overall_rating?: number;
          written_feedback?: string | null;
          strengths?: string | null;
          areas_for_improvement?: string | null;
          recommended_actions?: string | null;
          created_at?: string;
        };
      };
      performance: {
        Row: {
          id: string;
          internship_id: string;
          date: string;
          attendance_score: number;
          punctuality_score: number;
          task_completion_score: number;
          mentor_evaluation_score: number;
          overall_score: number;
          performance_level: 'excellent' | 'good' | 'needs_improvement' | 'at_risk';
          created_at: string;
        };
        Insert: {
          id?: string;
          internship_id: string;
          date: string;
          attendance_score?: number;
          punctuality_score?: number;
          task_completion_score?: number;
          mentor_evaluation_score?: number;
          overall_score?: number;
          performance_level?: 'excellent' | 'good' | 'needs_improvement' | 'at_risk';
          created_at?: string;
        };
        Update: {
          id?: string;
          internship_id?: string;
          date?: string;
          attendance_score?: number;
          punctuality_score?: number;
          task_completion_score?: number;
          mentor_evaluation_score?: number;
          overall_score?: number;
          performance_level?: 'excellent' | 'good' | 'needs_improvement' | 'at_risk';
          created_at?: string;
        };
      };
      alerts: {
        Row: {
          id: string;
          user_id: string;
          internship_id: string | null;
          category: 'attendance' | 'punctuality' | 'tasks' | 'performance' | 'feedback';
          severity: 'critical' | 'warning' | 'information';
          title: string;
          message: string;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          internship_id?: string | null;
          category: 'attendance' | 'punctuality' | 'tasks' | 'performance' | 'feedback';
          severity?: 'critical' | 'warning' | 'information';
          title: string;
          message: string;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          internship_id?: string | null;
          category?: 'attendance' | 'punctuality' | 'tasks' | 'performance' | 'feedback';
          severity?: 'critical' | 'warning' | 'information';
          title?: string;
          message?: string;
          is_read?: boolean;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
