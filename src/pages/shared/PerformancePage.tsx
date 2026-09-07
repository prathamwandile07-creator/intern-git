import { useEffect, useState, useMemo } from 'react';
import { BarChart3, TrendingUp, Award, AlertTriangle } from 'lucide-react';
import {
  ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useInternData } from '@/lib/hooks';
import {
  calcAttendanceScore, calcPunctualityScore, calcTaskScore, calcMentorScore,
  calcOverall, getPerformanceLabel, getPerformanceBg, formatDateShort,
} from '@/lib/performance';
import { generateInsights } from '@/lib/insights';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { KPICard } from '@/components/ui/KPICard';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { SkeletonCard, EmptyState } from '@/components/ui/Skeleton';
import type { Internship } from '@/types';

export function PerformancePage({ role }: { role: 'intern' | 'mentor' | 'admin' }) {
  const { profile } = useAuth();
  const [internship, setInternship] = useState<Internship | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      let query = supabase.from('internships').select('*');
      if (role === 'intern') query = query.eq('intern_id', profile.id);
      else if (role === 'mentor') query = query.eq('mentor_id', profile.id);
      const { data } = await query.maybeSingle();
      setInternship(data as Internship | null);
      setLoading(false);
    })();
  }, [profile, role]);

  const { attendance, tasks, feedback, performance, loading: dataLoading } = useInternData(internship?.id);

  const scores = useMemo(() => {
    const att = calcAttendanceScore(attendance);
    const pun = calcPunctualityScore(attendance);
    const task = calcTaskScore(tasks);
    const mentor = calcMentorScore(feedback);
    const overall = calcOverall(att, pun, task, mentor);
    return { att, pun, task, mentor, overall };
  }, [attendance, tasks, feedback]);

  const insights = useMemo(() => generateInsights(attendance, tasks, feedback, performance), [attendance, tasks, feedback, performance]);

  const radarData = useMemo(() => [
    { metric: 'Attendance', value: Math.round(scores.att) },
    { metric: 'Punctuality', value: Math.round(scores.pun) },
    { metric: 'Task Completion', value: Math.round(scores.task) },
    { metric: 'Mentor Eval', value: Math.round(scores.mentor) },
  ], [scores]);

  const trendData = useMemo(() => performance.map(p => ({
    date: formatDateShort(p.date),
    Overall: Math.round(p.overall_score),
    Attendance: Math.round(p.attendance_score),
    Punctuality: Math.round(p.punctuality_score),
    Tasks: Math.round(p.task_completion_score),
  })), [performance]);

  if (loading || dataLoading) {
    return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{[0,1,2,3].map(i => <SkeletonCard key={i} />)}</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Overall Score Hero */}
      <Card>
        <CardBody className="flex flex-col md:flex-row items-center gap-6">
          <div className="flex flex-col items-center">
            <div className={`flex h-32 w-32 items-center justify-center rounded-full ${getPerformanceBg(scores.overall.score)}`}>
              <div className="text-center">
                <p className="text-3xl font-bold">{scores.overall.score}</p>
                <p className="text-xs font-medium mt-0.5">out of 100</p>
              </div>
            </div>
            <Badge variant={scores.overall.level === 'excellent' ? 'green' : scores.overall.level === 'good' ? 'blue' : scores.overall.level === 'needs_improvement' ? 'amber' : 'red'} className="mt-3">
              {getPerformanceLabel(scores.overall.level)}
            </Badge>
          </div>
          <div className="flex-1 w-full">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Score Breakdown</h3>
            <p className="text-xs text-slate-500 mb-4">
              Overall = Attendance × 0.25 + Punctuality × 0.25 + Task Completion × 0.25 + Mentor Evaluation × 0.25
            </p>
            <div className="space-y-3">
              {[
                { label: 'Attendance', value: scores.att, weight: 25, contribution: scores.att * 0.25 },
                { label: 'Punctuality', value: scores.pun, weight: 25, contribution: scores.pun * 0.25 },
                { label: 'Task Completion', value: scores.task, weight: 25, contribution: scores.task * 0.25 },
                { label: 'Mentor Evaluation', value: scores.mentor, weight: 25, contribution: scores.mentor * 0.25 },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-slate-700">{item.label} <span className="text-xs text-slate-400">({item.weight}% weight)</span></span>
                    <span className="text-sm font-semibold text-slate-900">{Math.round(item.value)}% → +{Math.round(item.contribution)} pts</span>
                  </div>
                  <ProgressBar value={item.value} size="md" color={item.value >= 75 ? 'green' : item.value >= 60 ? 'amber' : 'red'} />
                </div>
              ))}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <span className="text-sm font-bold text-slate-900">Overall Performance</span>
                <span className="text-lg font-bold text-slate-900">{scores.overall.score}%</span>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Radar Chart */}
        <Card>
          <CardHeader title="Performance Radar" subtitle="Score distribution across metrics" />
          <CardBody>
            <ResponsiveContainer width="100%" height={300}>
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

        {/* Trend Chart */}
        <Card>
          <CardHeader title="Performance Trend" subtitle="Weekly score history" />
          <CardBody>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="Overall" stroke="#0f172a" strokeWidth={2} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="Attendance" stroke="#22c55e" strokeWidth={1.5} />
                  <Line type="monotone" dataKey="Punctuality" stroke="#3b82f6" strokeWidth={1.5} />
                  <Line type="monotone" dataKey="Tasks" stroke="#f59e0b" strokeWidth={1.5} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <EmptyState icon={<TrendingUp className="h-6 w-6" />} title="No Trend Data" message="Performance trends will appear as data accumulates." />
            )}
          </CardBody>
        </Card>
      </div>

      {/* Performance Levels Legend */}
      <Card>
        <CardHeader title="Performance Levels" subtitle="How scores are classified" />
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Excellent', range: '90-100', variant: 'green' as const },
              { label: 'Good', range: '75-89', variant: 'blue' as const },
              { label: 'Needs Improvement', range: '60-74', variant: 'amber' as const },
              { label: 'At Risk', range: 'Below 60', variant: 'red' as const },
            ].map(l => (
              <div key={l.label} className="rounded-lg border border-slate-200 p-3 text-center">
                <Badge variant={l.variant}>{l.label}</Badge>
                <p className="text-xs text-slate-500 mt-1.5">{l.range}</p>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader title="Smart Performance Insights" subtitle="Rule-based performance intelligence" />
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
                      <p className="text-xs text-slate-500 mt-1 italic">{insight.action}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<Award className="h-6 w-6" />} title="All Good!" message="No performance issues detected." />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
