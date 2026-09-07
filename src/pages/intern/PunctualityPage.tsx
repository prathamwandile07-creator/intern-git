import { useEffect, useState, useMemo } from 'react';
import { Clock, TrendingUp } from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useInternData } from '@/lib/hooks';
import { calcPunctualityScore, getLateCount, formatTime, formatDateShort } from '@/lib/performance';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { KPICard } from '@/components/ui/KPICard';
import { SkeletonCard, EmptyState } from '@/components/ui/Skeleton';
import type { Internship } from '@/types';

export function PunctualityPage() {
  const { profile } = useAuth();
  const [internship, setInternship] = useState<Internship | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data } = await supabase.from('internships').select('*').eq('intern_id', profile.id).maybeSingle();
      setInternship(data as Internship | null);
      setLoading(false);
    })();
  }, [profile]);

  const { attendance, loading: dataLoading } = useInternData(internship?.id);

  const punScore = useMemo(() => calcPunctualityScore(attendance), [attendance]);
  const lateCount = useMemo(() => getLateCount(attendance), [attendance]);
  const onTimeCount = useMemo(() => attendance.filter(a => a.status === 'early' || a.status === 'on_time').length, [attendance]);

  const chartData = useMemo(() => {
    return [...attendance].reverse().slice(0, 14).map(a => ({
      date: formatDateShort(a.date),
      minutes: a.minutes_diff,
      status: a.status,
    }));
  }, [attendance]);

  if (loading || dataLoading) {
    return <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{[0,1,2].map(i => <SkeletonCard key={i} />)}</div>;
  }

  const [eh, em] = internship!.expected_start_time.split(':').map(Number);
  const expectedDisplay = new Date(); expectedDisplay.setHours(eh, em, 0, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard label="Punctuality Score" value={`${Math.round(punScore)}%`} icon={Clock} color={punScore >= 75 ? 'green' : 'amber'} description="On-time arrival rate" />
        <KPICard label="Late Arrivals" value={lateCount} icon={Clock} color={lateCount > 0 ? 'red' : 'green'} description={`Out of ${attendance.length} days`} />
        <KPICard label="On-Time Arrivals" value={onTimeCount} icon={TrendingUp} color="blue" description="Early + on time" />
      </div>

      <Card>
        <CardHeader title="Expected vs Actual Arrival" subtitle={`Expected start time: ${formatTime(expectedDisplay.toISOString())}`} />
        <CardBody>
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 mb-4">
            <p className="text-sm text-blue-800">
              <span className="font-medium">How punctuality is calculated:</span> Each day, your check-in time is compared
              to the expected start time. Arriving at or before expected time = Early, 1-10 minutes late = On Time, more than 10 minutes late = Late.
            </p>
          </div>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '13px' }} formatter={(v: number) => [`${v <= 0 ? `${Math.abs(v)} min early` : `${v} min late`}`, 'Difference']} />
                <Bar dataKey="minutes" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.minutes <= 0 ? '#22c55e' : entry.minutes <= 10 ? '#3b82f6' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState icon={<Clock className="h-6 w-6" />} title="No Punctuality Data" message="Check in daily to build your punctuality record." />
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Recent Arrival Details" subtitle="Last 14 attendance records" />
        <CardBody>
          {chartData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3 font-medium">Date</th>
                    <th className="py-2.5 px-3 font-medium">Check In</th>
                    <th className="py-2.5 px-3 font-medium">Expected</th>
                    <th className="py-2.5 px-3 font-medium">Difference</th>
                    <th className="py-2.5 px-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {chartData.map((a) => {
                    const att = attendance.find(x => formatDateShort(x.date) === a.date);
                    return (
                      <tr key={a.date} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-2.5 px-3 text-slate-700">{a.date}</td>
                        <td className="py-2.5 px-3 text-slate-700">{formatTime(att?.check_in_time)}</td>
                        <td className="py-2.5 px-3 text-slate-700">{formatTime(expectedDisplay.toISOString())}</td>
                        <td className="py-2.5 px-3 text-slate-600">{a.minutes <= 0 ? `${Math.abs(a.minutes)}m early` : `${a.minutes}m late`}</td>
                        <td className="py-2.5 px-3">
                          <Badge variant={a.status === 'early' ? 'green' : a.status === 'on_time' ? 'blue' : 'red'}>
                            {a.status === 'early' ? 'Early' : a.status === 'on_time' ? 'On Time' : 'Late'}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={<Clock className="h-6 w-6" />} title="No Records" message="Punctuality details will appear here." />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
