import { useEffect, useState, useMemo } from 'react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, PieChart, Pie, Cell,
} from 'recharts';
import { BarChart3, Filter } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAllInterns, useDepartments } from '@/lib/hooks';
import { calcAttendanceScore, calcPunctualityScore, calcTaskScore, calcMentorScore, calcOverall, formatDateShort } from '@/lib/performance';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Select } from '@/components/ui/Input';
import { SkeletonCard, EmptyState } from '@/components/ui/Skeleton';
import type { Performance, Attendance, Task, Feedback } from '@/types';

const PIE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444'];

export function AnalyticsPage() {
  const { interns, loading } = useAllInterns();
  const { departments } = useDepartments();
  const [allPerf, setAllPerf] = useState<Performance[]>([]);
  const [allAtt, setAllAtt] = useState<Attendance[]>([]);
  const [deptFilter, setDeptFilter] = useState('');
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [perfRes, attRes] = await Promise.all([
        supabase.from('performance').select('*').order('date'),
        supabase.from('attendance').select('*').order('date'),
      ]);
      setAllPerf((perfRes.data as Performance[]) || []);
      setAllAtt((attRes.data as Attendance[]) || []);
      setDataLoading(false);
    })();
  }, []);

  const attendanceTrend = useMemo(() => {
    const grouped: Record<string, { date: string; total: number; count: number }> = {};
    allPerf.forEach(p => {
      const d = formatDateShort(p.date);
      if (!grouped[d]) grouped[d] = { date: d, total: 0, count: 0 };
      grouped[d].total += p.attendance_score;
      grouped[d].count++;
    });
    return Object.values(grouped).map(g => ({ date: g.date, Attendance: Math.round(g.total / g.count) }));
  }, [allPerf]);

  const punctualityTrend = useMemo(() => {
    const grouped: Record<string, { date: string; total: number; count: number }> = {};
    allPerf.forEach(p => {
      const d = formatDateShort(p.date);
      if (!grouped[d]) grouped[d] = { date: d, total: 0, count: 0 };
      grouped[d].total += p.punctuality_score;
      grouped[d].count++;
    });
    return Object.values(grouped).map(g => ({ date: g.date, Punctuality: Math.round(g.total / g.count) }));
  }, [allPerf]);

  const lateArrivalTrend = useMemo(() => {
    const grouped: Record<string, number> = {};
    allAtt.filter(a => a.status === 'late').forEach(a => {
      const d = formatDateShort(a.date);
      grouped[d] = (grouped[d] || 0) + 1;
    });
    return Object.entries(grouped).map(([date, count]) => ({ date, Late: count }));
  }, [allAtt]);

  const departmentPerf = useMemo(() => {
    const deptMap: Record<string, { total: number; count: number }> = {};
    interns.forEach(intern => {
      const deptName = intern.internship.department?.name || 'General';
      if (deptFilter && deptName !== deptFilter) return;
      // We'd need scores here, but let's use performance data
    });
    // Use performance data grouped by internship
    const internDeptMap: Record<string, string> = {};
    interns.forEach(i => { internDeptMap[i.internship.id] = i.internship.department?.name || 'General'; });
    allPerf.forEach(p => {
      const dept = internDeptMap[p.internship_id];
      if (!dept) return;
      if (deptFilter && dept !== deptFilter) return;
      if (!deptMap[dept]) deptMap[dept] = { total: 0, count: 0 };
      deptMap[dept].total += p.overall_score;
      deptMap[dept].count++;
    });
    return Object.entries(deptMap).map(([dept, val]) => ({ department: dept, Performance: Math.round(val.total / val.count) }));
  }, [interns, allPerf, deptFilter]);

  const distributionData = useMemo(() => {
    const grouped: Record<string, number> = { Excellent: 0, Good: 0, 'Needs Improvement': 0, 'At Risk': 0 };
    allPerf.forEach(p => {
      if (p.overall_score >= 90) grouped['Excellent']++;
      else if (p.overall_score >= 75) grouped['Good']++;
      else if (p.overall_score >= 60) grouped['Needs Improvement']++;
      else grouped['At Risk']++;
    });
    return Object.entries(grouped).map(([name, value]) => ({ name, value }));
  }, [allPerf]);

  if (loading || dataLoading) {
    return <div className="space-y-6"><div className="grid grid-cols-1 lg:grid-cols-2 gap-6">{[0,1,2,3].map(i => <SkeletonCard key={i} />)}</div></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Filters */}
      <Card>
        <CardBody className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="flex items-center gap-2 text-sm text-slate-500"><Filter className="h-4 w-4" /> Filters:</div>
          <Select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)} className="sm:w-48">
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </Select>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Attendance Trend" subtitle="Organization-wide average" />
          <CardBody>
            {attendanceTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={attendanceTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                  <Line type="monotone" dataKey="Attendance" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <EmptyState icon={<BarChart3 className="h-6 w-6" />} title="No Data" message="No attendance trend data available." />}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Punctuality Trend" subtitle="Organization-wide average" />
          <CardBody>
            {punctualityTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={punctualityTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                  <Line type="monotone" dataKey="Punctuality" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <EmptyState icon={<BarChart3 className="h-6 w-6" />} title="No Data" message="No punctuality trend data available." />}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Performance Distribution" subtitle="Across all performance snapshots" />
          <CardBody>
            <ResponsiveContainer width="100%" height={260}>
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
          <CardHeader title="Late Arrival Trend" subtitle="Number of late arrivals per day" />
          <CardBody>
            {lateArrivalTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={lateArrivalTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                  <Bar dataKey="Late" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <EmptyState icon={<BarChart3 className="h-6 w-6" />} title="No Late Arrivals" message="No late arrival data available." />}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Department Performance Comparison" subtitle="Average performance by department" />
        <CardBody>
          {departmentPerf.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={departmentPerf} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis type="category" dataKey="department" tick={{ fontSize: 12, fill: '#64748b' }} width={140} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }} />
                <Bar dataKey="Performance" fill="#0f172a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState icon={<BarChart3 className="h-6 w-6" />} title="No Department Data" message="No department performance data available." />}
        </CardBody>
      </Card>
    </div>
  );
}
