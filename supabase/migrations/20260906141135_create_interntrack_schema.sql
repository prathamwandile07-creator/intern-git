/*
# InternTrack — Core Schema

1. Purpose
   Creates the complete relational schema for the InternTrack internship
   monitoring & performance platform: departments, user profiles, internships,
   attendance, tasks, mentor feedback, performance snapshots, and alerts.

2. New Tables
   - departments: organization departments (Software Engineering, Data Science, AI/ML, Web Development)
   - profiles: extends auth.users with role (intern/mentor/admin), full name, avatar
   - internships: links an intern to a mentor + department with start/end dates and expected start time
   - attendance: daily check-in / check-out records per internship
   - tasks: work items assigned to interns with priority, deadline, progress, status
   - feedback: mentor evaluations (ratings + written feedback) per intern
   - performance: daily/periodic performance score snapshots
   - alerts: system-generated notifications per user

3. Relationships
   - profiles.id → auth.users.id (1:1)
   - internships.intern_id → profiles.id
   - internships.mentor_id → profiles.id
   - internships.department_id → departments.id
   - attendance.internship_id → internships.id
   - tasks.internship_id → internships.id
   - feedback.internship_id → internships.id, feedback.mentor_id → profiles.id
   - performance.internship_id → internships.id
   - alerts.user_id → profiles.id

4. Security
   - RLS enabled on every table.
   - Policies scoped TO authenticated with ownership / membership checks.
   - Interns see their own data; mentors see data for interns they mentor;
     admins see all data.
*/

-- ── Departments ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

-- ── Profiles ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'intern' CHECK (role IN ('intern','mentor','admin')),
  avatar_url text,
  phone text,
  bio text,
  created_at timestamptz DEFAULT now()
);

-- ── Internships ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS internships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mentor_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'Internship',
  start_date date NOT NULL,
  end_date date NOT NULL,
  expected_start_time time NOT NULL DEFAULT '09:30',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','terminated')),
  created_at timestamptz DEFAULT now()
);

-- ── Attendance ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  internship_id uuid NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
  date date NOT NULL,
  check_in_time timestamptz,
  check_out_time timestamptz,
  status text NOT NULL DEFAULT 'absent' CHECK (status IN ('on_time','late','early','absent')),
  minutes_diff integer DEFAULT 0,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (internship_id, date)
);

-- ── Tasks ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  internship_id uuid NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','completed','overdue')),
  progress integer NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  assigned_date date NOT NULL DEFAULT CURRENT_DATE,
  deadline date NOT NULL,
  completion_date date,
  created_at timestamptz DEFAULT now()
);

-- ── Feedback ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  internship_id uuid NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
  mentor_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  technical_skills integer NOT NULL DEFAULT 3 CHECK (technical_skills >= 1 AND technical_skills <= 5),
  communication integer NOT NULL DEFAULT 3 CHECK (communication >= 1 AND communication <= 5),
  teamwork integer NOT NULL DEFAULT 3 CHECK (teamwork >= 1 AND teamwork <= 5),
  punctuality integer NOT NULL DEFAULT 3 CHECK (punctuality >= 1 AND punctuality <= 5),
  task_discipline integer NOT NULL DEFAULT 3 CHECK (task_discipline >= 1 AND task_discipline <= 5),
  overall_rating integer NOT NULL DEFAULT 3 CHECK (overall_rating >= 1 AND overall_rating <= 5),
  written_feedback text,
  strengths text,
  areas_for_improvement text,
  recommended_actions text,
  created_at timestamptz DEFAULT now()
);

-- ── Performance ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  internship_id uuid NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
  date date NOT NULL,
  attendance_score numeric(5,2) DEFAULT 0,
  punctuality_score numeric(5,2) DEFAULT 0,
  task_completion_score numeric(5,2) DEFAULT 0,
  mentor_evaluation_score numeric(5,2) DEFAULT 0,
  overall_score numeric(5,2) DEFAULT 0,
  performance_level text DEFAULT 'needs_improvement' CHECK (performance_level IN ('excellent','good','needs_improvement','at_risk')),
  created_at timestamptz DEFAULT now(),
  UNIQUE (internship_id, date)
);

-- ── Alerts ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  internship_id uuid REFERENCES internships(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('attendance','punctuality','tasks','performance','feedback')),
  severity text NOT NULL DEFAULT 'information' CHECK (severity IN ('critical','warning','information')),
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_internships_intern ON internships(intern_id);
CREATE INDEX IF NOT EXISTS idx_internships_mentor ON internships(mentor_id);
CREATE INDEX IF NOT EXISTS idx_attendance_internship ON attendance(internship_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_tasks_internship ON tasks(internship_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_feedback_internship ON feedback(internship_id);
CREATE INDEX IF NOT EXISTS idx_performance_internship ON performance(internship_id);
CREATE INDEX IF NOT EXISTS idx_alerts_user ON alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_alerts_read ON alerts(is_read);

-- ── RLS: Enable on all tables ─────────────────────────────────
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE internships ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- ── Helper: is current user an admin? ──────────────────────────
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- ── Helper: is current user a mentor of given internship? ────
CREATE OR REPLACE FUNCTION is_mentor_of(internship_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM internships
    WHERE id = $1 AND mentor_id = auth.uid()
  );
$$;

-- ── Helper: does current user own this internship? ───────────
CREATE OR REPLACE FUNCTION is_intern_of(internship_uuid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM internships
    WHERE id = $1 AND intern_id = auth.uid()
  );
$$;

-- ═══════════════════════════════════════════════════════════════
-- DEPARTMENTS — readable by all authenticated; writable by admin
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "dept_select" ON departments;
CREATE POLICY "dept_select" ON departments FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "dept_insert" ON departments;
CREATE POLICY "dept_insert" ON departments FOR INSERT
  TO authenticated WITH CHECK (is_admin());

DROP POLICY IF EXISTS "dept_update" ON departments;
CREATE POLICY "dept_update" ON departments FOR UPDATE
  TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "dept_delete" ON departments;
CREATE POLICY "dept_delete" ON departments FOR DELETE
  TO authenticated USING (is_admin());

-- ═══════════════════════════════════════════════════════════════
-- PROFILES — read own + admins read all + mentors read their interns
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "profile_select" ON profiles;
CREATE POLICY "profile_select" ON profiles FOR SELECT
  TO authenticated USING (
    id = auth.uid()
    OR is_admin()
    OR EXISTS (
      SELECT 1 FROM internships i
      WHERE (i.intern_id = auth.uid() AND i.mentor_id = profiles.id)
         OR (i.mentor_id = auth.uid() AND i.intern_id = profiles.id)
    )
  );

DROP POLICY IF EXISTS "profile_insert" ON profiles;
CREATE POLICY "profile_insert" ON profiles FOR INSERT
  TO authenticated WITH CHECK (id = auth.uid() OR is_admin());

DROP POLICY IF EXISTS "profile_update" ON profiles;
CREATE POLICY "profile_update" ON profiles FOR UPDATE
  TO authenticated USING (id = auth.uid() OR is_admin()) WITH CHECK (id = auth.uid() OR is_admin());

-- ═══════════════════════════════════════════════════════════════
-- INTERNSHIPS
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "intern_select" ON internships;
CREATE POLICY "intern_select" ON internships FOR SELECT
  TO authenticated USING (
    intern_id = auth.uid()
    OR mentor_id = auth.uid()
    OR is_admin()
  );

DROP POLICY IF EXISTS "intern_insert" ON internships;
CREATE POLICY "intern_insert" ON internships FOR INSERT
  TO authenticated WITH CHECK (
    intern_id = auth.uid() OR mentor_id = auth.uid() OR is_admin()
  );

DROP POLICY IF EXISTS "intern_update" ON internships;
CREATE POLICY "intern_update" ON internships FOR UPDATE
  TO authenticated USING (
    intern_id = auth.uid() OR mentor_id = auth.uid() OR is_admin()
  ) WITH CHECK (
    intern_id = auth.uid() OR mentor_id = auth.uid() OR is_admin()
  );

DROP POLICY IF EXISTS "intern_delete" ON internships;
CREATE POLICY "intern_delete" ON internships FOR DELETE
  TO authenticated USING (is_admin());

-- ═══════════════════════════════════════════════════════════════
-- ATTENDANCE
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "att_select" ON attendance;
CREATE POLICY "att_select" ON attendance FOR SELECT
  TO authenticated USING (
    is_intern_of(internship_id)
    OR is_mentor_of(internship_id)
    OR is_admin()
  );

DROP POLICY IF EXISTS "att_insert" ON attendance;
CREATE POLICY "att_insert" ON attendance FOR INSERT
  TO authenticated WITH CHECK (
    is_intern_of(internship_id)
    OR is_mentor_of(internship_id)
    OR is_admin()
  );

DROP POLICY IF EXISTS "att_update" ON attendance;
CREATE POLICY "att_update" ON attendance FOR UPDATE
  TO authenticated USING (
    is_intern_of(internship_id)
    OR is_mentor_of(internship_id)
    OR is_admin()
  ) WITH CHECK (
    is_intern_of(internship_id)
    OR is_mentor_of(internship_id)
    OR is_admin()
  );

DROP POLICY IF EXISTS "att_delete" ON attendance;
CREATE POLICY "att_delete" ON attendance FOR DELETE
  TO authenticated USING (
    is_intern_of(internship_id)
    OR is_mentor_of(internship_id)
    OR is_admin()
  );

-- ═══════════════════════════════════════════════════════════════
-- TASKS
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "task_select" ON tasks;
CREATE POLICY "task_select" ON tasks FOR SELECT
  TO authenticated USING (
    is_intern_of(internship_id)
    OR is_mentor_of(internship_id)
    OR is_admin()
  );

DROP POLICY IF EXISTS "task_insert" ON tasks;
CREATE POLICY "task_insert" ON tasks FOR INSERT
  TO authenticated WITH CHECK (
    is_mentor_of(internship_id)
    OR is_admin()
  );

DROP POLICY IF EXISTS "task_update" ON tasks;
CREATE POLICY "task_update" ON tasks FOR UPDATE
  TO authenticated USING (
    is_intern_of(internship_id)
    OR is_mentor_of(internship_id)
    OR is_admin()
  ) WITH CHECK (
    is_intern_of(internship_id)
    OR is_mentor_of(internship_id)
    OR is_admin()
  );

DROP POLICY IF EXISTS "task_delete" ON tasks;
CREATE POLICY "task_delete" ON tasks FOR DELETE
  TO authenticated USING (
    is_mentor_of(internship_id)
    OR is_admin()
  );

-- ═══════════════════════════════════════════════════════════════
-- FEEDBACK
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "fb_select" ON feedback;
CREATE POLICY "fb_select" ON feedback FOR SELECT
  TO authenticated USING (
    is_intern_of(internship_id)
    OR is_mentor_of(internship_id)
    OR is_admin()
  );

DROP POLICY IF EXISTS "fb_insert" ON feedback;
CREATE POLICY "fb_insert" ON feedback FOR INSERT
  TO authenticated WITH CHECK (
    mentor_id = auth.uid()
    OR is_admin()
  );

DROP POLICY IF EXISTS "fb_update" ON feedback;
CREATE POLICY "fb_update" ON feedback FOR UPDATE
  TO authenticated USING (
    mentor_id = auth.uid()
    OR is_admin()
  ) WITH CHECK (
    mentor_id = auth.uid()
    OR is_admin()
  );

DROP POLICY IF EXISTS "fb_delete" ON feedback;
CREATE POLICY "fb_delete" ON feedback FOR DELETE
  TO authenticated USING (
    mentor_id = auth.uid()
    OR is_admin()
  );

-- ═══════════════════════════════════════════════════════════════
-- PERFORMANCE
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "perf_select" ON performance;
CREATE POLICY "perf_select" ON performance FOR SELECT
  TO authenticated USING (
    is_intern_of(internship_id)
    OR is_mentor_of(internship_id)
    OR is_admin()
  );

DROP POLICY IF EXISTS "perf_insert" ON performance;
CREATE POLICY "perf_insert" ON performance FOR INSERT
  TO authenticated WITH CHECK (
    is_intern_of(internship_id)
    OR is_mentor_of(internship_id)
    OR is_admin()
  );

DROP POLICY IF EXISTS "perf_update" ON performance;
CREATE POLICY "perf_update" ON performance FOR UPDATE
  TO authenticated USING (
    is_intern_of(internship_id)
    OR is_mentor_of(internship_id)
    OR is_admin()
  ) WITH CHECK (
    is_intern_of(internship_id)
    OR is_mentor_of(internship_id)
    OR is_admin()
  );

DROP POLICY IF EXISTS "perf_delete" ON performance;
CREATE POLICY "perf_delete" ON performance FOR DELETE
  TO authenticated USING (
    is_intern_of(internship_id)
    OR is_mentor_of(internship_id)
    OR is_admin()
  );

-- ═══════════════════════════════════════════════════════════════
-- ALERTS — user sees own alerts; admin sees all
-- ═══════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "alert_select" ON alerts;
CREATE POLICY "alert_select" ON alerts FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR is_admin()
  );

DROP POLICY IF EXISTS "alert_insert" ON alerts;
CREATE POLICY "alert_insert" ON alerts FOR INSERT
  TO authenticated WITH CHECK (
    user_id = auth.uid()
    OR is_admin()
  );

DROP POLICY IF EXISTS "alert_update" ON alerts;
CREATE POLICY "alert_update" ON alerts FOR UPDATE
  TO authenticated USING (
    user_id = auth.uid()
    OR is_admin()
  ) WITH CHECK (
    user_id = auth.uid()
    OR is_admin()
  );

DROP POLICY IF EXISTS "alert_delete" ON alerts;
CREATE POLICY "alert_delete" ON alerts FOR DELETE
  TO authenticated USING (
    user_id = auth.uid()
    OR is_admin()
  );
