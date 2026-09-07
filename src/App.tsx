import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { AppShell } from '@/components/layouts/AppShell';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { RoleRoute } from '@/components/RoleRoute';
import { LoginPage } from '@/pages/LoginPage';

// Intern pages
import { InternDashboard } from '@/pages/intern/InternDashboard';
import { AttendancePage } from '@/pages/intern/AttendancePage';
import { PunctualityPage } from '@/pages/intern/PunctualityPage';

// Shared pages
import { TasksPage } from '@/pages/shared/TasksPage';
import { PerformancePage } from '@/pages/shared/PerformancePage';
import { FeedbackPage } from '@/pages/shared/FeedbackPage';
import { AlertsPage } from '@/pages/shared/AlertsPage';
import { ProfilePage } from '@/pages/shared/ProfilePage';

// Mentor pages
import { MentorDashboard } from '@/pages/mentor/MentorDashboard';
import { MyInternsPage } from '@/pages/mentor/MyInternsPage';
import { InternProfile360 } from '@/pages/mentor/InternProfile360';

// Admin pages
import { AdminDashboard } from '@/pages/admin/AdminDashboard';
import { AdminInternsPage } from '@/pages/admin/AdminInternsPage';
import { AdminMentorsPage } from '@/pages/admin/AdminMentorsPage';
import { AnalyticsPage } from '@/pages/admin/AnalyticsPage';
import { DemoModePage } from '@/pages/admin/DemoModePage';
import { SettingsPage } from '@/pages/admin/SettingsPage';

function AppRoutes() {
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-pulse">
          <div className="h-8 w-48 bg-slate-200 rounded mb-3" />
          <div className="h-4 w-32 bg-slate-200 rounded" />
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <AppShell>
      <Routes>
        {/* Intern routes */}
        {profile.role === 'intern' && (
          <>
            <Route path="/dashboard" element={<InternDashboard />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/punctuality" element={<PunctualityPage />} />
            <Route path="/tasks" element={<TasksPage role="intern" />} />
            <Route path="/performance" element={<PerformancePage role="intern" />} />
            <Route path="/feedback" element={<FeedbackPage role="intern" />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </>
        )}

        {/* Mentor routes */}
        {profile.role === 'mentor' && (
          <>
            <Route path="/dashboard" element={<MentorDashboard />} />
            <Route path="/interns" element={<MyInternsPage />} />
            <Route path="/interns/:internId" element={<InternProfile360 />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/tasks" element={<TasksPage role="mentor" />} />
            <Route path="/performance" element={<PerformancePage role="mentor" />} />
            <Route path="/feedback" element={<FeedbackPage role="mentor" />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </>
        )}

        {/* Admin routes */}
        {profile.role === 'admin' && (
          <>
            <Route path="/dashboard" element={<AdminDashboard />} />
            <Route path="/interns" element={<AdminInternsPage />} />
            <Route path="/interns/:internId" element={<InternProfile360 />} />
            <Route path="/mentors" element={<AdminMentorsPage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/tasks" element={<TasksPage role="admin" />} />
            <Route path="/performance" element={<PerformancePage role="admin" />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
            <Route path="/demo" element={<DemoModePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </>
        )}

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AppShell>
  );
}

function App() {
  return <AppRoutes />;
}

export default App;
