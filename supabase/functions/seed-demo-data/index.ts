import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SeedUser {
  email: string;
  password: string;
  fullName: string;
  role: "intern" | "mentor" | "admin";
  department?: string;
  mentorEmail?: string;
  startDate?: string;
  endDate?: string;
  expectedStart?: string;
}

const DEPARTMENTS = [
  "Software Engineering",
  "Data Science",
  "AI/ML",
  "Web Development",
];

const INTERNS: { name: string; dept: string; mentor: string }[] = [
  { name: "Arjun Sharma", dept: "Software Engineering", mentor: "mentor.suresh@interntrack.com" },
  { name: "Priya Patel", dept: "Data Science", mentor: "mentor.suresh@interntrack.com" },
  { name: "Rohan Mehta", dept: "AI/ML", mentor: "mentor.anita@interntrack.com" },
  { name: "Ananya Reddy", dept: "Web Development", mentor: "mentor.anita@interntrack.com" },
  { name: "Karthik Iyer", dept: "Software Engineering", mentor: "mentor.suresh@interntrack.com" },
  { name: "Sneha Gupta", dept: "Data Science", mentor: "mentor.vikram@interntrack.com" },
  { name: "Vikram Nair", dept: "AI/ML", mentor: "mentor.anita@interntrack.com" },
  { name: "Divya Krishnan", dept: "Web Development", mentor: "mentor.vikram@interntrack.com" },
  { name: "Aditya Verma", dept: "Software Engineering", mentor: "mentor.vikram@interntrack.com" },
  { name: "Ishita Joshi", dept: "Data Science", mentor: "mentor.suresh@interntrack.com" },
];

const MENTORS = [
  { name: "Dr. Suresh Krishnamurthy", email: "mentor.suresh@interntrack.com" },
  { name: "Prof. Anita Desai", email: "mentor.anita@interntrack.com" },
  { name: "Mr. Vikram Rao", email: "mentor.vikram@interntrack.com" },
];

const ADMIN = { name: "Rajesh Kumar", email: "admin@interntrack.com" };

const PASSWORD = "demo1234";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── 1. Upsert departments ──────────────────────────────────
    const deptMap = new Map<string, string>();
    for (const deptName of DEPARTMENTS) {
      const { data: existing } = await supabase
        .from("departments")
        .select("id")
        .eq("name", deptName)
        .maybeSingle();

      if (existing) {
        deptMap.set(deptName, existing.id);
      } else {
        const { data, error } = await supabase
          .from("departments")
          .insert({ name: deptName })
          .select("id")
          .single();
        if (error) throw error;
        deptMap.set(deptName, data.id);
      }
    }

    // ── 2. Create auth users + profiles ────────────────────────
    async function upsertUser(
      email: string,
      fullName: string,
      role: "intern" | "mentor" | "admin"
    ): Promise<string> {
      // Check if user already exists in auth.users
      const { data: existingAuth } = await supabase.auth.admin
        .listUsers()
        .then((r) => ({
          data: r.data.users.find((u) => u.email === email) || null,
        }))
        .catch(() => ({ data: null }));

      let userId: string;

      if (existingAuth) {
        userId = existingAuth.id;
      } else {
        const { data: authData, error: authError } = await supabase.auth.admin
          .createUser({
            email,
            password: PASSWORD,
            email_confirm: true,
            user_metadata: { full_name: fullName, role },
          });
        if (authError) throw authError;
        userId = authData.user.id;
      }

      // Upsert profile
      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(
          { id: userId, email, full_name: fullName, role },
          { onConflict: "id" }
        );
      if (profileError) throw profileError;

      return userId;
    }

    // Create admin
    const adminId = await upsertUser(ADMIN.email, ADMIN.name, "admin");

    // Create mentors
    const mentorIds = new Map<string, string>();
    for (const m of MENTORS) {
      const id = await upsertUser(m.email, m.name, "mentor");
      mentorIds.set(m.email, id);
    }

    // Create interns
    const internIds: { name: string; dept: string; mentorEmail: string; id: string }[] = [];
    for (const intern of INTERNS) {
      const email = intern.name.toLowerCase().replace(/\s+/g, ".") + "@interntrack.com";
      const id = await upsertUser(email, intern.name, "intern");
      internIds.push({ ...intern, id });
    }

    // ── 3. Create internships ───────────────────────────────────
    const internshipIds: { internId: string; internshipId: string; dept: string; mentorId: string; expectedStart: string }[] = [];
    for (const intern of internIds) {
      const mentorId = mentorIds.get(intern.mentor)!;
      const deptId = deptMap.get(intern.dept)!;
      const startDate = "2026-08-01";
      const endDate = "2026-11-30";
      const expectedStart = "09:30";

      // Check if internship already exists
      const { data: existingInternship } = await supabase
        .from("internships")
        .select("id")
        .eq("intern_id", intern.id)
        .maybeSingle();

      let internshipId: string;
      if (existingInternship) {
        internshipId = existingInternship.id;
      } else {
        const { data, error } = await supabase
          .from("internships")
          .insert({
            intern_id: intern.id,
            mentor_id: mentorId,
            department_id: deptId,
            title: `${intern.dept} Intern`,
            start_date: startDate,
            end_date: endDate,
            expected_start_time: expectedStart,
            status: "active",
          })
          .select("id")
          .single();
        if (error) throw error;
        internshipId = data.id;
      }

      internshipIds.push({
        internId: intern.id,
        internshipId,
        dept: intern.dept,
        mentorId,
        expectedStart,
      });
    }

    // ── 4. Generate attendance records (last 20 working days) ─
    const today = new Date("2026-09-06");
    const workingDays: Date[] = [];
    let cursor = new Date(today);
    while (workingDays.length < 20) {
      const day = cursor.getDay();
      if (day !== 0 && day !== 6) workingDays.push(new Date(cursor));
      cursor.setDate(cursor.getDate() - 1);
    }
    workingDays.reverse();

    for (const entry of internshipIds) {
      // Determine a "pattern" for this intern — some punctual, some occasionally late
      const internIndex = internshipIds.indexOf(entry);
      const latePattern = internIndex % 3; // 0 = mostly on time, 1 = occasional late, 2 = frequent late

      for (let i = 0; i < workingDays.length; i++) {
        const dateStr = workingDays[i].toISOString().slice(0, 10);
        // Skip today — let the demo user check in themselves
        if (dateStr === "2026-09-06") continue;

        // Check if attendance already exists
        const { data: existing } = await supabase
          .from("attendance")
          .select("id")
          .eq("internship_id", entry.internshipId)
          .eq("date", dateStr)
          .maybeSingle();
        if (existing) continue;

        let minutesDiff: number;
        let status: "on_time" | "late" | "early";
        const seed = (internIndex * 7 + i) % 10;

        if (latePattern === 0) {
          // Mostly on time / early
          minutesDiff = seed < 7 ? -(5 + seed) : (3 + seed);
        } else if (latePattern === 1) {
          // Occasional late
          minutesDiff = seed < 5 ? -(3 + seed) : seed < 8 ? (5 + seed) : (15 + seed);
        } else {
          // Frequent late
          minutesDiff = seed < 3 ? -(2 + seed) : (8 + seed * 2);
        }

        status = minutesDiff <= 0 ? "early" : minutesDiff <= 10 ? "on_time" : "late";

        const checkInHour = 9;
        const checkInMin = 30 + minutesDiff;
        const checkInDate = new Date(workingDays[i]);
        checkInDate.setHours(checkInHour, checkInMin, 0, 0);

        const checkOutDate = new Date(checkInDate);
        checkOutDate.setHours(17, 30, 0, 0);

        await supabase.from("attendance").insert({
          internship_id: entry.internshipId,
          date: dateStr,
          check_in_time: checkInDate.toISOString(),
          check_out_time: checkOutDate.toISOString(),
          status,
          minutes_diff: minutesDiff,
        });
      }
    }

    // ── 5. Generate tasks ──────────────────────────────────────
    const TASK_TITLES = [
      "Build REST API endpoint for user management",
      "Create data visualization dashboard",
      "Implement authentication flow",
      "Write unit tests for core modules",
      "Design database schema for orders",
      "Develop machine learning model for sentiment analysis",
      "Build responsive landing page",
      "Integrate third-party payment gateway",
      "Optimize query performance for reports",
      "Create ETL pipeline for analytics",
      "Build chatbot prototype with NLP",
      "Implement role-based access control",
      "Develop component library",
      "Write technical documentation",
      "Code review and refactoring",
      "Build admin analytics dashboard",
    ];

    for (const entry of internshipIds) {
      // Check existing tasks
      const { count: existingCount } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("internship_id", entry.internshipId);

      if (existingCount && existingCount > 0) continue;

      const numTasks = 5 + (internshipIds.indexOf(entry) % 3);
      for (let i = 0; i < numTasks; i++) {
        const taskIdx = (internshipIds.indexOf(entry) * 3 + i) % TASK_TITLES.length;
        const assignedDate = new Date("2026-08-01");
        assignedDate.setDate(assignedDate.getDate() + i * 4);
        const deadline = new Date(assignedDate);
        deadline.setDate(deadline.getDate() + 7 + i * 2);

        const priorities = ["low", "medium", "high", "critical"] as const;
        const priority = priorities[i % 4];

        let status: "not_started" | "in_progress" | "completed" | "overdue";
        let progress: number;
        let completionDate: string | null = null;

        const todayDate = new Date("2026-09-06");
        if (i < 2) {
          status = "completed";
          progress = 100;
          completionDate = deadline.toISOString().slice(0, 10);
        } else if (deadline < todayDate) {
          status = "overdue";
          progress = 30 + (i * 15) % 50;
        } else if (i < 4) {
          status = "in_progress";
          progress = 40 + (i * 20) % 50;
        } else {
          status = "in_progress";
          progress = 10 + (i * 15) % 40;
        }

        await supabase.from("tasks").insert({
          internship_id: entry.internshipId,
          title: TASK_TITLES[taskIdx],
          description: `This task involves ${TASK_TITLES[taskIdx].toLowerCase()} as part of the ${entry.dept} internship program. Deliver quality work meeting project standards.`,
          priority,
          status,
          progress,
          assigned_date: assignedDate.toISOString().slice(0, 10),
          deadline: deadline.toISOString().slice(0, 10),
          completion_date: completionDate,
        });
      }
    }

    // ── 6. Generate mentor feedback ────────────────────────────
    for (const entry of internshipIds) {
      const { data: existingFb } = await supabase
        .from("feedback")
        .select("id")
        .eq("internship_id", entry.internshipId)
        .maybeSingle();
      if (existingFb) continue;

      const idx = internshipIds.indexOf(entry);
      const baseRating = 3 + (idx % 3); // 3, 4, or 5
      const variation = idx % 2;

      await supabase.from("feedback").insert({
        internship_id: entry.internshipId,
        mentor_id: entry.mentorId,
        technical_skills: Math.min(5, baseRating + variation),
        communication: Math.min(5, baseRating),
        teamwork: Math.min(5, baseRating + (variation ? 0 : 1)),
        punctuality: Math.min(5, baseRating - (idx % 3 === 2 ? 1 : 0)),
        task_discipline: Math.min(5, baseRating + (variation ? 1 : 0)),
        overall_rating: Math.min(5, baseRating),
        written_feedback: `${INTERNS[idx].name} has shown ${baseRating >= 4 ? "strong" : "satisfactory"} progress during the internship. ${baseRating >= 4 ? "Demonstrates good technical aptitude and willingness to learn." : "There is room for improvement in consistency and focus."} Recommend continued development in core areas.`,
        strengths: baseRating >= 4 ? "Quick learner, good communication, strong problem-solving skills" : "Enthusiastic, team player, eager to learn",
        areas_for_improvement: idx % 3 === 2 ? "Punctuality and time management need attention" : "Could improve depth of technical implementation",
        recommended_actions: idx % 3 === 2 ? "Focus on arriving on time consistently and meeting task deadlines" : "Take on more complex tasks to build technical depth",
      });
    }

    // ── 7. Generate performance snapshots ──────────────────────
    for (const entry of internshipIds) {
      const idx = internshipIds.indexOf(entry);

      // Get attendance for this internship
      const { data: attendanceRecords } = await supabase
        .from("attendance")
        .select("status, minutes_diff")
        .eq("internship_id", entry.internshipId)
        .order("date", { ascending: true });

      // Get tasks
      const { data: taskRecords } = await supabase
        .from("tasks")
        .select("status, progress")
        .eq("internship_id", entry.internshipId);

      // Get feedback
      const { data: feedbackRecord } = await supabase
        .from("feedback")
        .select("overall_rating, technical_skills, communication, teamwork, punctuality, task_discipline")
        .eq("internship_id", entry.internshipId)
        .maybeSingle();

      // Calculate scores
      const totalDays = attendanceRecords?.length || 1;
      const presentDays = (attendanceRecords?.filter((a) => a.status !== "absent").length) || 0;
      const attendanceScore = (presentDays / totalDays) * 100;

      const lateDays = (attendanceRecords?.filter((a) => a.status === "late").length) || 0;
      const punctualityScore = Math.max(0, ((presentDays - lateDays) / totalDays) * 100);

      const totalTasks = taskRecords?.length || 1;
      const completedTasks = (taskRecords?.filter((t) => t.status === "completed").length) || 0;
      const avgProgress = (taskRecords?.reduce((sum, t) => sum + t.progress, 0) || 0) / totalTasks;
      const taskScore = (completedTasks / totalTasks) * 50 + (avgProgress / 100) * 50;

      const mentorScore = feedbackRecord
        ? ((feedbackRecord.technical_skills + feedbackRecord.communication + feedbackRecord.teamwork + feedbackRecord.punctuality + feedbackRecord.task_discipline + feedbackRecord.overall_rating) / 6) * 20
        : 75;

      const overall = attendanceScore * 0.25 + punctualityScore * 0.25 + taskScore * 0.25 + mentorScore * 0.25;

      // Generate weekly performance snapshots for the last 4 weeks
      for (let week = 4; week >= 1; week--) {
        const snapDate = new Date("2026-09-06");
        snapDate.setDate(snapDate.getDate() - week * 7);
        const dateStr = snapDate.toISOString().slice(0, 10);

        const { data: existingPerf } = await supabase
          .from("performance")
          .select("id")
          .eq("internship_id", entry.internshipId)
          .eq("date", dateStr)
          .maybeSingle();
        if (existingPerf) continue;

        // Add slight variation per week
        const variation = (5 - week) * 2 - (idx % 3);
        const weekOverall = Math.max(40, Math.min(100, overall + variation));
        const weekAttendance = Math.max(50, Math.min(100, attendanceScore + variation));
        const weekPunctuality = Math.max(40, Math.min(100, punctualityScore + variation));
        const weekTask = Math.max(30, Math.min(100, taskScore + variation));
        const weekMentor = Math.max(50, Math.min(100, mentorScore + variation * 0.5));

        let level = "at_risk";
        if (weekOverall >= 90) level = "excellent";
        else if (weekOverall >= 75) level = "good";
        else if (weekOverall >= 60) level = "needs_improvement";

        await supabase.from("performance").insert({
          internship_id: entry.internshipId,
          date: dateStr,
          attendance_score: weekAttendance,
          punctuality_score: weekPunctuality,
          task_completion_score: weekTask,
          mentor_evaluation_score: weekMentor,
          overall_score: weekOverall,
          performance_level: level,
        });
      }
    }

    // ── 8. Generate alerts ─────────────────────────────────────
    for (const entry of internshipIds) {
      const idx = internshipIds.indexOf(entry);
      const internId = entry.internId;

      // Check existing alerts
      const { count: existingAlerts } = await supabase
        .from("alerts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", internId);

      if (existingAlerts && existingAlerts > 0) continue;

      // Always add a welcome alert
      await supabase.from("alerts").insert({
        user_id: internId,
        internship_id: entry.internshipId,
        category: "performance",
        severity: "information",
        title: "Welcome to InternTrack",
        message: "Your internship performance tracking is now active. Check in daily to build your punctuality record.",
        is_read: false,
      });

      // Add alerts based on intern pattern
      if (idx % 3 === 2) {
        // Frequent late arrivals
        await supabase.from("alerts").insert({
          user_id: internId,
          internship_id: entry.internshipId,
          category: "punctuality",
          severity: "warning",
          title: "Repeated Late Arrivals Detected",
          message: "You have had 3 or more late arrivals. Consider improving your morning schedule.",
          is_read: false,
        });
      }

      if (idx % 2 === 0) {
        // Overdue task alert
        await supabase.from("alerts").insert({
          user_id: internId,
          internship_id: entry.internshipId,
          category: "tasks",
          severity: "critical",
          title: "Task Overdue",
          message: "One of your tasks has passed its deadline. Please update progress or contact your mentor.",
          is_read: false,
        });
      }

      if (idx % 4 === 0) {
        // Attendance warning
        await supabase.from("alerts").insert({
          user_id: internId,
          internship_id: entry.internshipId,
          category: "attendance",
          severity: "warning",
          title: "Attendance Below Target",
          message: "Your attendance is below the 75% recommended threshold.",
          is_read: idx !== 0,
        });
      }
    }

    // Add alerts for mentors
    for (const [email, mentorId] of mentorIds) {
      const { count: existingAlerts } = await supabase
        .from("alerts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", mentorId);

      if (existingAlerts && existingAlerts > 0) continue;

      await supabase.from("alerts").insert({
        user_id: mentorId,
        category: "performance",
        severity: "information",
        title: "New Intern Assigned",
        message: "You have new interns assigned to your mentorship. Review their performance profiles.",
        is_read: false,
      });
    }

    // Add alert for admin
    const { count: adminAlerts } = await supabase
      .from("alerts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", adminId);

    if (!adminAlerts || adminAlerts === 0) {
      await supabase.from("alerts").insert({
        user_id: adminId,
        category: "performance",
        severity: "information",
        title: "InternTrack System Ready",
        message: "Demo data has been seeded. 10 interns, 3 mentors, and 1 admin account are ready.",
        is_read: false,
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Demo data seeded successfully",
        accounts: {
          admin: { email: ADMIN.email, password: PASSWORD },
          mentors: MENTORS.map((m) => ({ email: m.email, password: PASSWORD })),
          interns: INTERNS.map((i) => ({
            email: i.name.toLowerCase().replace(/\s+/g, ".") + "@interntrack.com",
            password: PASSWORD,
          })),
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
