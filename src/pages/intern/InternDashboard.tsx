import { useEffect, useState, useMemo } from 'react';
import {
  CalendarCheck,
  Clock,
  CheckSquare,
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  LogIn,
  LogOut,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toast';
import { useInternData } from '@/lib/hooks';
import {
  calcAttendanceScore,
  calcPunctualityScore,
  calcTaskScore,
  calcMentorScore,
  calcOverall,
  getPerformanceLabel,
  getPerformanceBg,
  getAttendanceStatus,
  formatTime,
  formatDateShort,
  daysUntil,
} from '@/lib/performance';
import { generateInsights } from '@/lib/insights';
import { KPICard } from '@/components/ui/KPICard';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SkeletonCard, EmptyState } from '@/components/ui/Skeleton';
import type { Internship, Attendance } from '@/types';

export function InternDashboard() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [internship, setInternship] = useState<Internship | null>(null);
  const [internshipLoading, setInternshipLoading] = useState(true);
  const [todayAttendance, setTodayAttendance] = useState<Attendance | null>(null);
  const [checkInLoading, setCheckInLoading] = useState(false);

  useEffect(() => {
    if (!profile) return;
    let mounted = true;
    (async () => {
      const { data } = await supabase
        .from('internships')
        .select('*, department:departments(*)')
        .eq('intern_id', profile.id)
        .maybeSingle();
      if (mounted) {
        setInternship(data as Internship | null);
        setInternshipLoading(false);
      }
    })();
  }, [profile]);

  const internshipId = internship?.id;
  const { attendance, tasks, feedback, performance, loading, refetch } = useInternData(internshipId);

  useEffect(() => {
    if (!internshipId) return;
    const today = new Date().toISOString().slice(0, 10);
    (async () => {
      const { data } = await supabase
        .from('attendance')
        .select('*')
        .eq('internship_id', internshipId)
        .eq('date', today)
        .maybeSingle();
      setTodayAttendance(data as Attendance | null);
    })();
  }, [internshipId]);

  const scores = useMemo(() => {
    const att = calcAttendanceScore(attendance);
    const pun = calcPunctualityScore(attendance);
    const task = calcTaskScore(tasks);
    const mentor = calcMentorScore(feedback);
    const overall = calcOverall(att, pun, task, mentor);
    return { att, pun, task, mentor, overall };
  }, [attendance, tasks, feedback]);

  const insights = useMemo(
    () => generateInsights(attendance, tasks, feedback, performance),
    [attendance, tasks, feedback, performance]
  );

  const chartData = useMemo(() => {
    return performance.map((p) => ({
      date: formatDateShort(p.date),
      Attendance: Math.round(p.attendance_score),
      Punctuality: Math.round(p.punctuality_score),
      Tasks: Math.round(p.task_completion_score),
      Overall: Math.round(p.overall_score),
    }));
  }, [performance]);

  const upcomingTasks = useMemo(() => {
    return tasks
      .filter((t) => t.status !== 'completed')
      .sort((a, b) => new Date(a.deadline).getTime() - new Date(b.deadline).getTime())
      .slice(0, 5);
  }, [tasks]);

  const handleCheckIn = async () => {
    if (!internshipId) return;
    setCheckInLoading(true);
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const { data: existing } = await supabase
      .from('attendance')
      .select('id')
      .eq('internship_id', internshipId)
      .eq('date', todayStr)
      .maybeSingle();

    if (existing) {
      toast('You have already checked in today', 'warning');
      setCheckInLoading(false);
      return;
    }

    const { status, minutesDiff } = getAttendanceStatus(internship!.expected_start_time, now);

    const { data } = await supabase
      .from('attendance')
      .insert({
        internship_id: internshipId,
        date: todayStr,
        check_in_time: now.toISOString(),
        status,
        minutes_diff: minutesDiff,
      })
      .select('*')
      .single();

    if (data) {
      setTodayAttendance(data as Attendance);
      const msg = minutesDiff <= 0
        ? `Checked in ${Math.abs(minutesDiff)} minutes early!`
        : minutesDiff <= 10
        ? 'Checked in on time!'
        : `Checked in ${minutesDiff} minutes late`;
      toast(msg, minutesDiff <= 0 ? 'success' : minutesDiff <= 10 ? 'success' : 'warning');
      refetch();
    }
    setCheckInLoading(false);
  };

  const handleCheckOut = async () => {
    if (!todayAttendance || !internshipId) return;
    if (!todayAttendance.check_in_time) {
      toast('You must check in before checking out', 'error');
      return;
    }
    if (todayAttendance.check_out_time) {
      toast('You have already checked out today', 'warning');
      return;
    }
    setCheckInLoading(true);
    const now = new Date();
    const { data } = await supabase
      .from('attendance')
      .update({ check_out_time: now.toISOString() })
      .eq('id', todayAttendance.id)
      .select('*')
      .single();
    if (data) {
      setTodayAttendance(data as Attendance);
      toast('Checked out successfully', 'success');
    }
    setCheckInLoading(false);
  };

  if (internshipLoading || loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
        <SkeletonCard />
      </div>
    );
  }

  if (!internship) {
    return (
      <Card>
        <EmptyState
          icon={<CalendarCheck className="h-6 w-6" />}
          title="No Internship Found"
          message="You don't have an active internship assigned yet. Please contact your administrator."
        />
      </Card>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const expectedTime = internship.expected_start_time;
  const [eh, em] = expectedTime.split(':').map(Number);
  const expectedDisplay = new Date();
  expectedDisplay.setHours(eh, em, 0, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero */}
      <div className="rounded-xl bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white">
        <h2 className="text-2xl font-bold">{greeting}, {profile?.full_name.split(' ')[0]} 👋</h2>
        <p className="text-slate-400 mt-1">Here's your internship performance overview.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="blue">{internship.department?.name || 'General'}</Badge>
          <Badge variant="gray">{internship.title}</Badge>
          <Badge variant={scores.overall.level === 'excellent' ? 'green' : scores.overall.level === 'good' ? 'blue' : scores.overall.level === 'needs_improvement' ? 'amber' : 'red'}>
            {getPerformanceLabel(scores.overall.level)}
          </Badge>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Attendance" value={`${Math.round(scores.att)}%`} description="Present days / total" icon={CalendarCheck} color="green" trend={scores.att >= 75 ? 'up' : 'down'} trendValue={`${attendance.filter(a => a.status !== 'absent').length}/${attendance.length} days`} />
        <KPICard label="Punctuality" value={`${Math.round(scores.pun)}%`} description="On-time arrivals" icon={Clock} color="blue" trend={scores.pun >= 75 ? 'up' : 'down'} trendValue={`${attendance.filter(a => a.status === 'late').length} late`} />
        <KPICard label="Task Completion" value={`${Math.round(scores.task)}%`} description={`${tasks.filter(t => t.status === 'completed').length}/${tasks.length} done`} icon={CheckSquare} color="amber" trend={scores.task >= 60 ? 'up' : 'down'} trendValue={`${tasks.filter(t => t.status === 'overdue').length} overdue`} />
        <KPICard label="Overall Performance" value={`${scores.overall.score}%`} description={getPerformanceLabel(scores.overall.level)} icon={TrendingUp} color={scores.overall.score >= 75 ? 'green' : 'amber'} trend={scores.overall.score >= 75 ? 'up' : 'down'} trendValue="25% weights" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Attendance */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader title="Today's Attendance" subtitle={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} />
            <CardBody className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500 mb-1">Expected Start</p>
                  <p className="text-lg font-semibold text-slate-900">{formatTime(expectedDisplay.toISOString())}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500 mb-1">Check-in</p>
                  <p className="text-lg font-semibold text-slate-900">{formatTime(todayAttendance?.check_in_time)}</p>
                </div>
              </div>

              {todayAttendance ? (
                <div className="rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-700">Status</span>
                    <Badge variant={todayAttendance.status === 'early' ? 'green' : todayAttendance.status === 'on_time' ? 'blue' : 'red'}>
                      {todayAttendance.status === 'early' ? 'Early' : todayAttendance.status === 'on_time' ? 'On Time' : 'Late'}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600">
                    {todayAttendance.minutes_diff <= 0
                      ? `${Math.abs(todayAttendance.minutes_diff)} minutes early`
                      : `${todayAttendance.minutes_diff} minutes late`}
                  </p>
                  {todayAttendance.check_out_time && (
                    <p className="text-xs text-slate-500 mt-2">Checked out at {formatTime(todayAttendance.check_out_time)}</p>
                  )}
                </div>
              ) : (
                <div className="rounded-lg border border-dashed border-slate-300 p-3 text-center">
                  <p className="text-sm text-slate-500">Not checked in yet today</p>
                </div>
              )}

              <div className="space-y-2">
                {!todayAttendance?.check_in_time ? (
                  <Button className="w-full" size="lg" onClick={handleCheckIn} loading={checkInLoading}>
                    <LogIn className="h-4 w-4" /> Check In
                  </Button>
                ) : !todayAttendance.check_out_time ? (
                  <Button className="w-full" size="lg" variant="success" onClick={handleCheckOut} loading={checkInLoading}>
                    <LogOut className="h-4 w-4" /> Check Out
                  </Button>
                ) : (
                  <Button className="w-full" size="lg" variant="outline" disabled>
                    <CheckCircle2 className="h-4 w-4" /> Checked Out
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Performance Trend Chart */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader title="Performance Trend" subtitle="Weekly scores across all metrics" />
            <CardBody>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#94a3b8' }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                    <Tooltip
                      contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '12px' }} />
                    <Line type="monotone" dataKey="Overall" stroke="#0f172a" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Attendance" stroke="#22c55e" strokeWidth={1.5} />
                    <Line type="monotone" dataKey="Punctuality" stroke="#3b82f6" strokeWidth={1.5} />
                    <Line type="monotone" dataKey="Tasks" stroke="#f59e0b" strokeWidth={1.5} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState icon={<TrendingUp className="h-6 w-6" />} title="No Performance Data" message="Performance trends will appear once enough data is collected." />
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Smart Insights */}
        <Card>
          <CardHeader title="Smart Performance Insights" subtitle="Rule-based performance intelligence" />
          <CardBody>
            {insights.length > 0 ? (
              <div className="space-y-3">
                {insights.map((insight) => (
                  <div key={insight.id} className={`rounded-lg border p-3 ${
                    insight.severity === 'critical' ? 'border-red-200 bg-red-50' :
                    insight.severity === 'warning' ? 'border-amber-200 bg-amber-50' :
                    'border-blue-200 bg-blue-50'
                  }`}>
                    <div className="flex items-start gap-2">
                      <AlertTriangle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                        insight.severity === 'critical' ? 'text-red-600' :
                        insight.severity === 'warning' ? 'text-amber-600' :
                        'text-blue-600'
                      }`} />
                      <div>
                        <p className="text-sm font-medium text-slate-900">{insight.title}</p>
                        <p className="text-xs text-slate-600 mt-0.5">{insight.reason}</p>
                        <p className="text-xs text-slate-500 mt-1 italic">{insight.action}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState icon={<CheckCircle2 className="h-6 w-6" />} title="All Good!" message="No performance issues detected. Keep up the great work!" />
            )}
          </CardBody>
        </Card>

        {/* Upcoming Tasks */}
        <Card>
          <CardHeader title="Upcoming Tasks" subtitle="Tasks that need your attention" action={<a href="/tasks" onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', '/tasks'); window.dispatchEvent(new PopStateEvent('popstate')); }} className="text-xs text-blue-600 hover:underline flex items-center gap-1">View all <ArrowRight className="h-3 w-3" /></a>} />
          <CardBody>
            {upcomingTasks.length > 0 ? (
              <div className="space-y-3">
                {upcomingTasks.map((task) => {
                  const days = daysUntil(task.deadline);
                  return (
                    <div key={task.id} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3 hover:bg-slate-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
                        <p className="text-xs text-slate-500 mt-0.5">Due {formatDateShort(task.deadline)} · {days < 0 ? `${Math.abs(days)} days overdue` : days === 0 ? 'Today' : `in ${days} days`}</p>
                        <div className="mt-2"><ProgressBar value={task.progress} size="sm" color={task.status === 'overdue' ? 'red' : 'blue'} /></div>
                      </div>
                      <Badge variant={task.priority === 'critical' ? 'red' : task.priority === 'high' ? 'amber' : 'gray'}>
                        {task.priority}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <EmptyState icon={<CheckSquare className="h-6 w-6" />} title="No Upcoming Tasks" message="You're all caught up! No tasks need immediate attention." />
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
