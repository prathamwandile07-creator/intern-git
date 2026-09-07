import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarCheck, Clock, CheckSquare, TrendingUp, AlertTriangle, MessageSquare, Award } from 'lucide-react';
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toast';
import {
  calcAttendanceScore, calcPunctualityScore, calcTaskScore, calcMentorScore, calcOverall,
  getPerformanceLabel, getPerformanceBg, getRiskLevel, getRiskColor, getRiskLabel,
  formatDateShort, formatDate, daysUntil,
} from '@/lib/performance';
import { generateInsights } from '@/lib/insights';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { KPICard } from '@/components/ui/KPICard';
import { SkeletonCard, EmptyState } from '@/components/ui/Skeleton';
import type { Profile, Internship, Attendance, Task, Feedback, Performance as PerfType } from '@/types';

export function InternProfile360() {
  const { internId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [intern, setIntern] = useState<Profile | null>(null);
  const [internship, setInternship] = useState<Internship | null>(null);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [performance, setPerformance] = useState<PerfType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!internId) return;
    let mounted = true;
    (async () => {
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', internId).maybeSingle();
      if (!mounted || !profile) { setLoading(false); return; }
      setIntern(profile as Profile);

      const { data: internData } = await supabase
        .from('internships')
        .select('*, department:departments(*), mentor:profiles!internships_mentor_id_fkey(*)')
        .eq('intern_id', internId)
        .maybeSingle();
      if (mounted && internData) {
        setInternship(internData as Internship);
        const [attRes, taskRes, fbRes, perfRes] = await Promise.all([
          supabase.from('attendance').select('*').eq('internship_id', internData.id).order('date'),
          supabase.from('tasks').select('*').eq('internship_id', internData.id).order('created_at'),
          supabase.from('feedback').select('*').eq('internship_id', internData.id).maybeSingle(),
          supabase.from('performance').select('*').eq('internship_id', internData.id).order('date'),
        ]);
        if (mounted) {
          setAttendance((attRes.data as Attendance[]) || []);
          setTasks((taskRes.data as Task[]) || []);
          setFeedback((fbRes.data as Feedback) || null);
          setPerformance((perfRes.data as PerfType[]) || []);
          setLoading(false);
        }
      } else if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, [internId]);

  const scores = useMemo(() => {
    const att = calcAttendanceScore(attendance);
    const pun = calcPunctualityScore(attendance);
    const task = calcTaskScore(tasks);
    const mentor = calcMentorScore(feedback);
    const overall = calcOverall(att, pun, task, mentor);
    return { att, pun, task, mentor, overall };
  }, [attendance, tasks, feedback]);

  const insights = useMemo(() => generateInsights(attendance, tasks, feedback, performance), [attendance, tasks, feedback, performance]);
  const risk = getRiskLevel(scores.overall.score);

  const radarData = useMemo(() => [
    { metric: 'Attendance', value: Math.round(scores.att) },
    { metric: 'Punctuality', value: Math.round(scores.pun) },
    { metric: 'Tasks', value: Math.round(scores.task) },
    { metric: 'Mentor Eval', value: Math.round(scores.mentor) },
  ], [scores]);

  const trendData = useMemo(() => performance.map(p => ({
    date: formatDateShort(p.date),
    Overall: Math.round(p.overall_score),
  })), [performance]);

  const recentTasks = useMemo(() => tasks.slice(0, 5), [tasks]);

  if (loading) return <div className="space-y-6"><div className="grid grid-cols-1 sm:grid-cols-4 gap-4">{[0,1,2,3].map(i => <SkeletonCard key={i} />)}</div><SkeletonCard /></div>;

  if (!intern) return <EmptyState icon={<AlertTriangle className="h-6 w-6" />} title="Intern Not Found" message="This intern profile could not be found." />;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /> Back</Button>
        <h2 className="text-lg font-semibold text-slate-900">Intern 360° Profile</h2>
      </div>

      {/* Profile Header */}
      <Card>
        <CardBody className="flex flex-col md:flex-row items-start gap-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-200 text-xl font-bold text-slate-600 flex-shrink-0">
            {intern.full_name.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-bold text-slate-900">{intern.full_name}</h3>
            <p className="text-sm text-slate-500">{intern.email}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge variant="blue">{internship?.department?.name || 'General'}</Badge>
              <Badge variant="gray">{internship?.title}</Badge>
              <Badge variant={risk === 'healthy' ? 'green' : risk === 'needs_attention' ? 'amber' : 'red'}>{getRiskLabel(risk)}</Badge>
              <Badge variant={scores.overall.level === 'excellent' ? 'green' : scores.overall.level === 'good' ? 'blue' : scores.overall.level === 'needs_improvement' ? 'amber' : 'red'}>{getPerformanceLabel(scores.overall.level)}</Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-xs text-slate-500">
              <div><span className="font-medium text-slate-700">Mentor:</span> {(internship as any)?.mentor?.full_name || 'N/A'}</div>
              <div><span className="font-medium text-slate-700">Start:</span> {internship ? formatDateShort(internship.start_date) : 'N/A'}</div>
              <div><span className="font-medium text-slate-700">End:</span> {internship ? formatDateShort(internship.end_date) : 'N/A'}</div>
              <div><span className="font-medium text-slate-700">Expected:</span> {internship?.expected_start_time}</div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Attendance" value={`${Math.round(scores.att)}%`} icon={CalendarCheck} color="green" />
        <KPICard label="Punctuality" value={`${Math.round(scores.pun)}%`} icon={Clock} color="blue" />
        <KPICard label="Task Completion" value={`${Math.round(scores.task)}%`} icon={CheckSquare} color="amber" />
        <KPICard label="Overall Performance" value={`${scores.overall.score}%`} icon={TrendingUp} color={scores.overall.score >= 75 ? 'green' : 'amber'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Overview */}
        <Card>
          <CardHeader title="Performance Overview" subtitle="Score breakdown" />
          <CardBody>
            <div className="flex items-center justify-center mb-4">
              <div className={`flex h-24 w-24 items-center justify-center rounded-full ${getPerformanceBg(scores.overall.score)}`}>
                <div className="text-center">
                  <p className="text-2xl font-bold">{scores.overall.score}</p>
                  <p className="text-xs">/ 100</p>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              {[
                { label: 'Attendance (25%)', value: scores.att },
                { label: 'Punctuality (25%)', value: scores.pun },
                { label: 'Task Completion (25%)', value: scores.task },
                { label: 'Mentor Evaluation (25%)', value: scores.mentor },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-600">{item.label}</span>
                    <span className="font-semibold text-slate-900">{Math.round(item.value)}%</span>
                  </div>
                  <ProgressBar value={item.value} size="sm" color={item.value >= 75 ? 'green' : item.value >= 60 ? 'amber' : 'red'} />
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Radar Chart */}
        <Card>
          <CardHeader title="Performance Radar" />
          <CardBody>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="metric" tick={{ fontSize: 12, fill: '#64748b' }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <Radar dataKey="value" stroke="#0f172a" fill="#3b82f6" fillOpacity={0.2} strokeWidth={2} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
              </RadarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      {/* Trend */}
      {trendData.length > 0 && (
        <Card>
          <CardHeader title="Performance Trend" />
          <CardBody>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                <Line type="monotone" dataKey="Overall" stroke="#0f172a" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      )}

      {/* Recent Tasks */}
      <Card>
        <CardHeader title="Recent Tasks" />
        <CardBody>
          {recentTasks.length > 0 ? (
            <div className="space-y-2">
              {recentTasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 rounded-lg border border-slate-100 p-3">
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{task.title}</p>
                    <p className="text-xs text-slate-500">Due {formatDateShort(task.deadline)} · {task.status.replace('_', ' ')}</p>
                  </div>
                  <ProgressBar value={task.progress} size="sm" color={task.status === 'overdue' ? 'red' : 'blue'} showLabel />
                </div>
              ))}
            </div>
          ) : <EmptyState icon={<CheckSquare className="h-6 w-6" />} title="No Tasks" message="No tasks assigned." />}
        </CardBody>
      </Card>

      {/* Mentor Feedback */}
      {feedback && (
        <Card>
          <CardHeader title="Mentor Feedback" subtitle={`Submitted ${formatDate(feedback.created_at)}`} />
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
              {[
                { label: 'Technical', value: feedback.technical_skills },
                { label: 'Communication', value: feedback.communication },
                { label: 'Teamwork', value: feedback.teamwork },
                { label: 'Punctuality', value: feedback.punctuality },
                { label: 'Task Discipline', value: feedback.task_discipline },
                { label: 'Overall', value: feedback.overall_rating },
              ].map(r => (
                <div key={r.label} className="rounded-lg bg-slate-50 p-3 text-center">
                  <p className="text-xs text-slate-500">{r.label}</p>
                  <p className="text-lg font-bold text-slate-900">{r.value}/5</p>
                </div>
              ))}
            </div>
            {feedback.written_feedback && <p className="text-sm text-slate-700">{feedback.written_feedback}</p>}
          </CardBody>
        </Card>
      )}

      {/* Recommended Mentor Action */}
      <Card>
        <CardHeader title="Recommended Mentor Action" subtitle="Based on rule-based insight engine" />
        <CardBody>
          {insights.length > 0 ? (
            <div className="space-y-3">
              {insights.map(insight => (
                <div key={insight.id} className={`rounded-lg border p-3 ${insight.severity === 'critical' ? 'border-red-200 bg-red-50' : insight.severity === 'warning' ? 'border-amber-200 bg-amber-50' : 'border-blue-200 bg-blue-50'}`}>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${insight.severity === 'critical' ? 'text-red-600' : insight.severity === 'warning' ? 'text-amber-600' : 'text-blue-600'}`} />
                    <div>
                      <p className="text-sm font-medium text-slate-900">{insight.title}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{insight.reason}</p>
                      <p className="text-xs text-slate-500 mt-1 italic">Action: {insight.action}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<Award className="h-6 w-6" />} title="No Issues Detected" message="This intern is performing well across all metrics." />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
