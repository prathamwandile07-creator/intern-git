import { useMemo } from 'react';
import { Users, CalendarCheck, Clock, TrendingUp, AlertTriangle, ArrowRight } from 'lucide-react';
import { useMentorInterns } from '@/lib/hooks';
import { supabase } from '@/lib/supabase';
import { calcAttendanceScore, calcPunctualityScore, calcTaskScore, calcMentorScore, calcOverall, getPerformanceBg, getRiskLevel, getRiskColor, getRiskLabel, formatDateShort } from '@/lib/performance';
import { KPICard } from '@/components/ui/KPICard';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SkeletonCard, EmptyState } from '@/components/ui/Skeleton';
import { useEffect, useState } from 'react';
import type { Attendance, Task, Feedback } from '@/types';

interface InternWithData {
  id: string;
  full_name: string;
  email: string;
  department: string;
  internshipId: string;
  attendance: Attendance[];
  tasks: Task[];
  feedback: Feedback | null;
  scores: { att: number; pun: number; task: number; mentor: number; overall: number; level: string };
  risk: 'healthy' | 'needs_attention' | 'at_risk';
}

export function MentorDashboard() {
  const { interns, loading } = useMentorInterns();
  const [internsData, setInternsData] = useState<InternWithData[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

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
          id: intern.id,
          full_name: intern.full_name,
          email: intern.email,
          department: intern.internship.department?.name || 'General',
          internshipId,
          attendance: att,
          tasks,
          feedback: fb,
          scores: { att: aScore, pun: pScore, task: tScore, mentor: mScore, overall: overall.score, level: overall.level },
          risk: getRiskLevel(overall.score),
        };
      }));
      if (mounted) { setInternsData(results); setDataLoading(false); }
    })();
    return () => { mounted = false; };
  }, [interns, loading]);

  const avgScores = useMemo(() => {
    if (internsData.length === 0) return { att: 0, pun: 0, task: 0, overall: 0 };
    return {
      att: Math.round(internsData.reduce((s, i) => s + i.scores.att, 0) / internsData.length),
      pun: Math.round(internsData.reduce((s, i) => s + i.scores.pun, 0) / internsData.length),
      overall: Math.round(internsData.reduce((s, i) => s + i.scores.overall, 0) / internsData.length),
    };
  }, [internsData]);

  const atRiskCount = internsData.filter(i => i.risk === 'at_risk').length;

  if (loading || dataLoading) {
    return <div className="space-y-6"><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{[0,1,2,3].map(i => <SkeletonCard key={i} />)}</div><SkeletonCard /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard label="Total Interns" value={internsData.length} icon={Users} color="slate" description="Under your mentorship" />
        <KPICard label="Avg Attendance" value={`${avgScores.att}%`} icon={CalendarCheck} color="green" />
        <KPICard label="Avg Punctuality" value={`${avgScores.pun}%`} icon={Clock} color="blue" />
        <KPICard label="Avg Performance" value={`${avgScores.overall}%`} icon={TrendingUp} color={avgScores.overall >= 75 ? 'green' : 'amber'} trend={atRiskCount > 0 ? 'down' : 'up'} trendValue={`${atRiskCount} at risk`} />
      </div>

      <Card>
        <CardHeader title="Intern Performance Table" subtitle="Click an intern to view their 360° profile" />
        <CardBody>
          {internsData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3 font-medium">Intern</th>
                    <th className="py-2.5 px-3 font-medium">Department</th>
                    <th className="py-2.5 px-3 font-medium">Attendance</th>
                    <th className="py-2.5 px-3 font-medium">Punctuality</th>
                    <th className="py-2.5 px-3 font-medium">Tasks</th>
                    <th className="py-2.5 px-3 font-medium">Performance</th>
                    <th className="py-2.5 px-3 font-medium">Risk</th>
                    <th className="py-2.5 px-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {internsData.map(intern => (
                    <tr key={intern.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2.5 px-3">
                        <p className="font-medium text-slate-900">{intern.full_name}</p>
                        <p className="text-xs text-slate-500">{intern.email}</p>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{intern.department}</td>
                      <td className="py-2.5 px-3 text-slate-700">{Math.round(intern.scores.att)}%</td>
                      <td className="py-2.5 px-3 text-slate-700">{Math.round(intern.scores.pun)}%</td>
                      <td className="py-2.5 px-3 text-slate-700">{Math.round(intern.scores.task)}%</td>
                      <td className="py-2.5 px-3">
                        <span className={`text-sm font-semibold ${getPerformanceBg(intern.scores.overall)}`}>{intern.scores.overall}%</span>
                      </td>
                      <td className="py-2.5 px-3"><Badge variant={intern.risk === 'healthy' ? 'green' : intern.risk === 'needs_attention' ? 'amber' : 'red'}>{getRiskLabel(intern.risk)}</Badge></td>
                      <td className="py-2.5 px-3">
                        <a href={`/interns/${intern.id}`} onClick={(e) => { e.preventDefault(); window.history.pushState({}, '', `/interns/${intern.id}`); window.dispatchEvent(new PopStateEvent('popstate')); }} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                          View <ArrowRight className="h-3 w-3" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={<Users className="h-6 w-6" />} title="No Interns Assigned" message="You don't have any interns assigned to you yet." />
          )}
        </CardBody>
      </Card>

      {atRiskCount > 0 && (
        <Card>
          <CardHeader title="At-Risk Interns" subtitle="Interns requiring immediate attention" />
          <CardBody>
            <div className="space-y-2">
              {internsData.filter(i => i.risk !== 'healthy').map(intern => (
                <div key={intern.id} className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{intern.full_name}</p>
                    <p className="text-xs text-slate-600">Performance: {intern.scores.overall}% · {getRiskLabel(intern.risk)}</p>
                  </div>
                  <Badge variant={intern.risk === 'at_risk' ? 'red' : 'amber'}>{getRiskLabel(intern.risk)}</Badge>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
