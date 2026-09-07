import { useEffect, useState, useMemo } from 'react';
import { Users, GraduationCap, CalendarCheck, Clock, TrendingUp, AlertTriangle, ArrowRight } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { useAllInterns } from '@/lib/hooks';
import { supabase } from '@/lib/supabase';
import { calcAttendanceScore, calcPunctualityScore, calcTaskScore, calcMentorScore, calcOverall, getRiskLevel, getRiskLabel, formatDateShort } from '@/lib/performance';
import { KPICard } from '@/components/ui/KPICard';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SkeletonCard, EmptyState } from '@/components/ui/Skeleton';
import type { Attendance, Task, Feedback, Performance } from '@/types';

const PIE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];

export function AdminDashboard() {
  const { interns, loading, refetch } = useAllInterns();
  const [internsData, setInternsData] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [allPerformance, setAllPerformance] = useState<Performance[]>([]);

  useEffect(() => {
    if (loading || interns.length === 0) { setDataLoading(false); return; }
    let mounted = true;
    (async () => {
      const results = await Promise.all(interns.map(async (intern) => {
        const internshipId = intern.internship.id;
        const [attRes, taskRes, fbRes] = await Promise.all([
          supabase.from('attendance').select('*').eq('internship_id', internshipId),
          supabase.from('tasks').select('*').eq('internship_id', internshipId),
          supabase.from('feedback').select('*').eq('internship_id', internshipId).maybeSingle(),
        ]);
        const att = (attRes.data as Attendance[]) || [];
        const tasks = (taskRes.data as Task[]) || [];
        const fb = (fbRes.data as Feedback) || null;
        const aScore = calcAttendanceScore(att);
        const pScore = calcPunctualityScore(att);
        const tScore = calcTaskScore(tasks);
        const mScore = calcMentorScore(fb);
        const overall = calcOverall(aScore, pScore, tScore, mScore);
        return {
          id: intern.id, full_name: intern.full_name, email: intern.email,
          department: intern.internship.department?.name || 'General',
          scores: { att: aScore, pun: pScore, task: tScore, overall: overall.score, level: overall.level },
          risk: getRiskLevel(overall.score),
        };
      }));
      if (mounted) { setInternsData(results); setDataLoading(false); }
    })();
    return () => { mounted = false; };
  }, [interns, loading]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('performance').select('*').order('date', { ascending: true });
      setAllPerformance((data as Performance[]) || []);
    })();
  }, []);

  const avgScores = useMemo(() => {
    if (internsData.length === 0) return { att: 0, pun: 0, overall: 0 };
    return {
      att: Math.round(internsData.reduce((s, i) => s + i.scores.att, 0) / internsData.length),
      pun: Math.round(internsData.reduce((s, i) => s + i.scores.pun, 0) / internsData.length),
      overall: Math.round(internsData.reduce((s, i) => s + i.scores.overall, 0) / internsData.length),
    };
  }, [internsData]);

  const atRiskCount = internsData.filter(i => i.risk === 'at_risk').length;
  const activeInternships = internsData.length;

  const distributionData = useMemo(() => {
    const excellent = internsData.filter(i => i.scores.overall >= 90).length;
    const good = internsData.filter(i => i.scores.overall >= 75 && i.scores.overall < 90).length;
    const needsImprove = internsData.filter(i => i.scores.overall >= 60 && i.scores.overall < 75).length;
    const atRisk = internsData.filter(i => i.scores.overall < 60).length;
    return [
      { name: 'Excellent', value: excellent },
      { name: 'Good', value: good },
      { name: 'Needs Improvement', value: needsImprove },
      { name: 'At Risk', value: atRisk },
    ];
  }, [internsData]);

  const trendData = useMemo(() => {
    const grouped: Record<string, { date: string; att: number; pun: number; perf: number; count: number }> = {};
    allPerformance.forEach(p => {
      const d = formatDateShort(p.date);
      if (!grouped[d]) grouped[d] = { date: d, att: 0, pun: 0, perf: 0, count: 0 };
      grouped[d].att += p.attendance_score;
      grouped[d].pun += p.punctuality_score;
      grouped[d].perf += p.overall_score;
      grouped[d].count++;
    });
    return Object.values(grouped).map(g => ({
      date: g.date,
      Attendance: Math.round(g.att / g.count),
      Punctuality: Math.round(g.pun / g.count),
      Performance: Math.round(g.perf / g.count),
    }));
  }, [allPerformance]);

  if (loading || dataLoading) {
    return <div className="space-y-6"><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{[0,1,2,3].map(i => <SkeletonCard key={i} />)}</div><SkeletonCard /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Interns" value={internsData.length} icon={GraduationCap} color="slate" />
        <KPICard label="Active Internships" value={activeInternships} icon={Users} color="blue" />
        <KPICard label="Avg Performance" value={`${avgScores.overall}%`} icon={TrendingUp} color={avgScores.overall >= 75 ? 'green' : 'amber'} />
        <KPICard label="At-Risk Interns" value={atRiskCount} icon={AlertTriangle} color={atRiskCount > 0 ? 'red' : 'green'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Performance Distribution" subtitle="Across all interns" />
          <CardBody>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={distributionData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label>
                  {distributionData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Organization Trends" subtitle="Average scores over time" />
          <CardBody>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Line type="monotone" dataKey="Attendance" stroke="#22c55e" strokeWidth={2} />
                  <Line type="monotone" dataKey="Punctuality" stroke="#3b82f6" strokeWidth={2} />
                  <Line type="monotone" dataKey="Performance" stroke="#0f172a" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : <EmptyState icon={<TrendingUp className="h-6 w-6" />} title="No Trend Data" message="Trends will appear as data accumulates." />}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="At-Risk Interns" subtitle="Interns needing attention" />
        <CardBody>
          {atRiskCount > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3 font-medium">Intern</th>
                    <th className="py-2.5 px-3 font-medium">Department</th>
                    <th className="py-2.5 px-3 font-medium">Performance</th>
                    <th className="py-2.5 px-3 font-medium">Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {internsData.filter(i => i.risk !== 'healthy').map(intern => (
                    <tr key={intern.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2.5 px-3"><p className="font-medium text-slate-900">{intern.full_name}</p><p className="text-xs text-slate-500">{intern.email}</p></td>
                      <td className="py-2.5 px-3 text-slate-600">{intern.department}</td>
                      <td className="py-2.5 px-3 text-slate-700 font-semibold">{intern.scores.overall}%</td>
                      <td className="py-2.5 px-3"><Badge variant={intern.risk === 'at_risk' ? 'red' : 'amber'}>{getRiskLabel(intern.risk)}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <EmptyState icon={<AlertTriangle className="h-6 w-6" />} title="No At-Risk Interns" message="All interns are performing well." />}
        </CardBody>
      </Card>
    </div>
  );
}
