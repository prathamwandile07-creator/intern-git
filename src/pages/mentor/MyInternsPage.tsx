import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, ArrowRight } from 'lucide-react';
import { useMentorInterns } from '@/lib/hooks';
import { supabase } from '@/lib/supabase';
import { calcAttendanceScore, calcPunctualityScore, calcTaskScore, calcMentorScore, calcOverall, getRiskLevel, getRiskLabel, getPerformanceBg } from '@/lib/performance';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { SkeletonCard, EmptyState } from '@/components/ui/Skeleton';
import type { Attendance, Task, Feedback } from '@/types';

export function MyInternsPage() {
  const { interns, loading } = useMentorInterns();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [internsData, setInternsData] = useState<any[]>([]);
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
          scores: { att: aScore, pun: pScore, task: tScore, overall: overall.score },
          risk: getRiskLevel(overall.score),
        };
      }));
      if (mounted) { setInternsData(results); setDataLoading(false); }
    })();
    return () => { mounted = false; };
  }, [interns, loading]);

  const filtered = useMemo(() => {
    if (!search) return internsData;
    return internsData.filter(i =>
      i.full_name.toLowerCase().includes(search.toLowerCase()) ||
      i.email.toLowerCase().includes(search.toLowerCase()) ||
      i.department.toLowerCase().includes(search.toLowerCase())
    );
  }, [internsData, search]);

  if (loading || dataLoading) return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[0,1,2].map(i => <SkeletonCard key={i} />)}</div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader title="My Interns" subtitle={`${internsData.length} interns under your mentorship`} />
        <CardBody>
          <div className="mb-4">
            <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 max-w-md">
              <Search className="h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search by name, email, or department..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none w-full"
              />
            </div>
          </div>

          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(intern => (
                <div
                  key={intern.id}
                  className="rounded-xl border border-slate-200 p-4 hover:shadow-md hover:border-slate-300 transition-all cursor-pointer"
                  onClick={() => navigate(`/interns/${intern.id}`)}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-600">
                      {intern.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{intern.full_name}</p>
                      <p className="text-xs text-slate-500 truncate">{intern.email}</p>
                    </div>
                  </div>
                  <Badge variant="blue" className="mb-3">{intern.department}</Badge>
                  <div className="grid grid-cols-3 gap-2 text-center mb-3">
                    <div className="rounded-lg bg-slate-50 p-2">
                      <p className="text-xs text-slate-500">Att</p>
                      <p className="text-sm font-semibold text-slate-900">{Math.round(intern.scores.att)}%</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2">
                      <p className="text-xs text-slate-500">Pun</p>
                      <p className="text-sm font-semibold text-slate-900">{Math.round(intern.scores.pun)}%</p>
                    </div>
                    <div className="rounded-lg bg-slate-50 p-2">
                      <p className="text-xs text-slate-500">Tasks</p>
                      <p className="text-sm font-semibold text-slate-900">{Math.round(intern.scores.task)}%</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Badge variant={intern.risk === 'healthy' ? 'green' : intern.risk === 'needs_attention' ? 'amber' : 'red'}>{getRiskLabel(intern.risk)}</Badge>
                    <span className={`text-sm font-bold ${getPerformanceBg(intern.scores.overall)}`}>{intern.scores.overall}%</span>
                  </div>
                  <button className="mt-3 text-xs text-blue-600 hover:underline flex items-center gap-1 w-full justify-end">
                    View Profile <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<Users className="h-6 w-6" />} title="No Interns Found" message={search ? "No interns match your search." : "No interns assigned to you yet."} />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
