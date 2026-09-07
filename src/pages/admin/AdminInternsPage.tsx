import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Search, ArrowRight } from 'lucide-react';
import { useAllInterns, useDepartments } from '@/lib/hooks';
import { supabase } from '@/lib/supabase';
import { calcAttendanceScore, calcPunctualityScore, calcTaskScore, calcMentorScore, calcOverall, getRiskLevel, getRiskLabel, getPerformanceBg } from '@/lib/performance';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input, Select } from '@/components/ui/Input';
import { SkeletonCard, EmptyState } from '@/components/ui/Skeleton';
import type { Attendance, Task, Feedback } from '@/types';

export function AdminInternsPage() {
  const { interns, loading, refetch } = useAllInterns();
  const { departments } = useDepartments();
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
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
          id: intern.id, full_name: intern.full_name, email: intern.email,
          department: intern.internship.department?.name || 'General',
          mentor: intern.internship.mentor?.full_name || 'N/A',
          status: intern.internship.status,
          scores: { att: aScore, pun: pScore, task: tScore, overall: overall.score },
          risk: getRiskLevel(overall.score),
        };
      }));
      if (mounted) { setInternsData(results); setDataLoading(false); }
    })();
    return () => { mounted = false; };
  }, [interns, loading]);

  const filtered = useMemo(() => {
    return internsData.filter(i => {
      if (search && !i.full_name.toLowerCase().includes(search.toLowerCase()) && !i.email.toLowerCase().includes(search.toLowerCase())) return false;
      if (deptFilter && i.department !== deptFilter) return false;
      return true;
    });
  }, [internsData, search, deptFilter]);

  if (loading || dataLoading) return <div className="space-y-6"><SkeletonCard /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader title="All Interns" subtitle={`${filtered.length} of ${internsData.length} interns`} />
        <CardBody>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2">
                <Search className="h-4 w-4 text-slate-400" />
                <input type="text" placeholder="Search by name or email..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none w-full" />
              </div>
            </div>
            <Select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="sm:w-48">
              <option value="">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
            </Select>
          </div>

          {filtered.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3 font-medium">Intern</th>
                    <th className="py-2.5 px-3 font-medium">Department</th>
                    <th className="py-2.5 px-3 font-medium">Mentor</th>
                    <th className="py-2.5 px-3 font-medium">Attendance</th>
                    <th className="py-2.5 px-3 font-medium">Punctuality</th>
                    <th className="py-2.5 px-3 font-medium">Performance</th>
                    <th className="py-2.5 px-3 font-medium">Risk</th>
                    <th className="py-2.5 px-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(intern => (
                    <tr key={intern.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2.5 px-3"><p className="font-medium text-slate-900">{intern.full_name}</p><p className="text-xs text-slate-500">{intern.email}</p></td>
                      <td className="py-2.5 px-3 text-slate-600">{intern.department}</td>
                      <td className="py-2.5 px-3 text-slate-600">{intern.mentor}</td>
                      <td className="py-2.5 px-3 text-slate-700">{Math.round(intern.scores.att)}%</td>
                      <td className="py-2.5 px-3 text-slate-700">{Math.round(intern.scores.pun)}%</td>
                      <td className="py-2.5 px-3"><span className={`text-sm font-semibold ${getPerformanceBg(intern.scores.overall)}`}>{intern.scores.overall}%</span></td>
                      <td className="py-2.5 px-3"><Badge variant={intern.risk === 'healthy' ? 'green' : intern.risk === 'needs_attention' ? 'amber' : 'red'}>{getRiskLabel(intern.risk)}</Badge></td>
                      <td className="py-2.5 px-3"><a href={`/interns/${intern.id}`} onClick={(e) => { e.preventDefault(); navigate(`/interns/${intern.id}`); }} className="text-xs text-blue-600 hover:underline flex items-center gap-1">View <ArrowRight className="h-3 w-3" /></a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={<GraduationCap className="h-6 w-6" />} title="No Interns Found" message="No interns match your filters." />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
