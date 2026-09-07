import { useEffect, useState, useMemo } from 'react';
import { CalendarCheck, LogIn, LogOut, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toast';
import { useInternData } from '@/lib/hooks';
import { getAttendanceStatus, formatTime, formatDateShort, calcAttendanceScore, calcPunctualityScore } from '@/lib/performance';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { KPICard } from '@/components/ui/KPICard';
import { SkeletonCard, EmptyState } from '@/components/ui/Skeleton';
import type { Internship, Attendance as AttType } from '@/types';

export function AttendancePage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [internship, setInternship] = useState<Internship | null>(null);
  const [loading, setLoading] = useState(true);
  const [todayAtt, setTodayAtt] = useState<AttType | null>(null);
  const [checkInLoading, setCheckInLoading] = useState(false);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      const { data } = await supabase
        .from('internships')
        .select('*, department:departments(*)')
        .eq('intern_id', profile.id)
        .maybeSingle();
      setInternship(data as Internship | null);
      setLoading(false);
    })();
  }, [profile]);

  const internshipId = internship?.id;
  const { attendance, refetch, loading: dataLoading } = useInternData(internshipId);

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
      setTodayAtt(data as AttType | null);
    })();
  }, [internshipId]);

  const attScore = useMemo(() => calcAttendanceScore(attendance), [attendance]);
  const punScore = useMemo(() => calcPunctualityScore(attendance), [attendance]);

  const sortedAttendance = useMemo(() => [...attendance].reverse(), [attendance]);

  const handleCheckIn = async () => {
    if (!internshipId || !internship) return;
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
    const { status, minutesDiff } = getAttendanceStatus(internship.expected_start_time, now);
    const { data } = await supabase
      .from('attendance')
      .insert({ internship_id: internshipId, date: todayStr, check_in_time: now.toISOString(), status, minutes_diff: minutesDiff })
      .select('*')
      .single();
    if (data) {
      setTodayAtt(data as AttType);
      toast(minutesDiff <= 0 ? `Checked in ${Math.abs(minutesDiff)} minutes early!` : minutesDiff <= 10 ? 'Checked in on time!' : `Checked in ${minutesDiff} minutes late`, minutesDiff > 10 ? 'warning' : 'success');
      refetch();
    }
    setCheckInLoading(false);
  };

  const handleCheckOut = async () => {
    if (!todayAtt) return;
    if (!todayAtt.check_in_time) { toast('You must check in before checking out', 'error'); return; }
    if (todayAtt.check_out_time) { toast('Already checked out', 'warning'); return; }
    setCheckInLoading(true);
    const { data } = await supabase
      .from('attendance')
      .update({ check_out_time: new Date().toISOString() })
      .eq('id', todayAtt.id)
      .select('*')
      .single();
    if (data) { setTodayAtt(data as AttType); toast('Checked out successfully', 'success'); }
    setCheckInLoading(false);
  };

  if (loading || dataLoading) {
    return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{[0,1,2].map(i => <SkeletonCard key={i} />)}</div>;
  }

  const [eh, em] = internship!.expected_start_time.split(':').map(Number);
  const expectedDisplay = new Date(); expectedDisplay.setHours(eh, em, 0, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard label="Attendance Rate" value={`${Math.round(attScore)}%`} icon={CalendarCheck} color="green" description={`${attendance.filter(a => a.status !== 'absent').length} of ${attendance.length} days present`} />
        <KPICard label="Punctuality Rate" value={`${Math.round(punScore)}%`} icon={CalendarCheck} color="blue" description={`${attendance.filter(a => a.status === 'late').length} late arrivals`} />
        <KPICard label="Total Records" value={attendance.length} icon={CalendarCheck} color="slate" description="Attendance days logged" />
      </div>

      <Card>
        <CardHeader title="Today's Check-in" subtitle={new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} />
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs text-slate-500 mb-1">Expected Start</p>
              <p className="text-xl font-semibold text-slate-900">{formatTime(expectedDisplay.toISOString())}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs text-slate-500 mb-1">Check-in Time</p>
              <p className="text-xl font-semibold text-slate-900">{formatTime(todayAtt?.check_in_time)}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs text-slate-500 mb-1">Status</p>
              {todayAtt ? (
                <Badge variant={todayAtt.status === 'early' ? 'green' : todayAtt.status === 'on_time' ? 'blue' : 'red'}>
                  {todayAtt.status === 'early' ? 'Early' : todayAtt.status === 'on_time' ? 'On Time' : 'Late'} ({todayAtt.minutes_diff <= 0 ? `${Math.abs(todayAtt.minutes_diff)}m early` : `${todayAtt.minutes_diff}m late`})
                </Badge>
              ) : <span className="text-sm text-slate-400">Not checked in</span>}
            </div>
          </div>
          {!todayAtt?.check_in_time ? (
            <Button size="lg" onClick={handleCheckIn} loading={checkInLoading}><LogIn className="h-4 w-4" /> Check In</Button>
          ) : !todayAtt.check_out_time ? (
            <Button size="lg" variant="success" onClick={handleCheckOut} loading={checkInLoading}><LogOut className="h-4 w-4" /> Check Out</Button>
          ) : (
            <Button size="lg" variant="outline" disabled><CheckCircle2 className="h-4 w-4" /> Checked Out for Today</Button>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Attendance History" subtitle="All recorded attendance" />
        <CardBody>
          {sortedAttendance.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500 uppercase tracking-wider">
                    <th className="py-2.5 px-3 font-medium">Date</th>
                    <th className="py-2.5 px-3 font-medium">Check In</th>
                    <th className="py-2.5 px-3 font-medium">Check Out</th>
                    <th className="py-2.5 px-3 font-medium">Status</th>
                    <th className="py-2.5 px-3 font-medium">Diff</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAttendance.map((a) => (
                    <tr key={a.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-2.5 px-3 text-slate-700">{formatDateShort(a.date)}</td>
                      <td className="py-2.5 px-3 text-slate-700">{formatTime(a.check_in_time)}</td>
                      <td className="py-2.5 px-3 text-slate-700">{formatTime(a.check_out_time)}</td>
                      <td className="py-2.5 px-3">
                        <Badge variant={a.status === 'early' ? 'green' : a.status === 'on_time' ? 'blue' : a.status === 'late' ? 'red' : 'gray'}>
                          {a.status === 'early' ? 'Early' : a.status === 'on_time' ? 'On Time' : a.status === 'late' ? 'Late' : 'Absent'}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {a.minutes_diff <= 0 ? `${Math.abs(a.minutes_diff)}m early` : `${a.minutes_diff}m late`}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState icon={<CalendarCheck className="h-6 w-6" />} title="No Attendance Records" message="Your attendance history will appear here once you start checking in." />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
