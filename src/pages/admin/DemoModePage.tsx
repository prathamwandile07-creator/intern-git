import { useState } from 'react';
import { FlaskConical, Clock, CheckCircle2, AlertTriangle, RotateCcw, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toast';
import { useAllInterns } from '@/lib/hooks';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export function DemoModePage() {
  const { toast } = useToast();
  const { refetch } = useAllInterns();
  const [loading, setLoading] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const callSeedFunction = async () => {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/seed-demo-data`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SUPABASE_ANON_KEY}`, 'Content-Type': 'application/json' },
    });
    return res;
  };

  const handleSimulateLate = async () => {
    setLoading('late');
    try {
      // Find first intern's internship and add a late attendance record for today
      const { data: internships } = await supabase.from('internships').select('*').limit(1);
      if (!internships || internships.length === 0) { toast('No internships found', 'error'); return; }
      const internship = internships[0];
      const today = new Date().toISOString().slice(0, 10);
      // Check if record exists
      const { data: existing } = await supabase.from('attendance').select('id').eq('internship_id', internship.id).eq('date', today).maybeSingle();
      if (existing) {
        // Update to late
        const lateTime = new Date(); lateTime.setHours(9, 52, 0, 0);
        await supabase.from('attendance').update({ check_in_time: lateTime.toISOString(), status: 'late', minutes_diff: 22 }).eq('id', existing.id);
      } else {
        const lateTime = new Date(); lateTime.setHours(9, 52, 0, 0);
        await supabase.from('attendance').insert({ internship_id: internship.id, date: today, check_in_time: lateTime.toISOString(), status: 'late', minutes_diff: 22 });
      }
      // Create alert
      const { data: intern } = await supabase.from('profiles').select('*').eq('id', internship.intern_id).maybeSingle();
      if (intern) {
        await supabase.from('alerts').insert({ user_id: intern.id, internship_id: internship.id, category: 'punctuality', severity: 'warning', title: 'Simulated Late Arrival', message: 'A late arrival has been simulated for demo purposes. Check-in was 22 minutes late.', is_read: false });
      }
      toast('Late arrival simulated! Check the dashboard and alerts.', 'success');
      refetch();
    } catch { toast('Failed to simulate late arrival', 'error'); }
    setLoading(null);
  };

  const handleSimulateOnTime = async () => {
    setLoading('ontime');
    try {
      const { data: internships } = await supabase.from('internships').select('*').limit(1);
      if (!internships || internships.length === 0) { toast('No internships found', 'error'); return; }
      const internship = internships[0];
      const today = new Date().toISOString().slice(0, 10);
      const { data: existing } = await supabase.from('attendance').select('id').eq('internship_id', internship.id).eq('date', today).maybeSingle();
      const onTime = new Date(); onTime.setHours(9, 25, 0, 0);
      if (existing) {
        await supabase.from('attendance').update({ check_in_time: onTime.toISOString(), status: 'early', minutes_diff: -5 }).eq('id', existing.id);
      } else {
        await supabase.from('attendance').insert({ internship_id: internship.id, date: today, check_in_time: onTime.toISOString(), status: 'early', minutes_diff: -5 });
      }
      toast('On-time arrival simulated! Check the dashboard.', 'success');
      refetch();
    } catch { toast('Failed to simulate on-time arrival', 'error'); }
    setLoading(null);
  };

  const handleSimulateOverdue = async () => {
    setLoading('overdue');
    try {
      const { data: internships } = await supabase.from('internships').select('*').limit(1);
      if (!internships || internships.length === 0) { toast('No internships found', 'error'); return; }
      const internship = internships[0];
      const pastDate = new Date(); pastDate.setDate(pastDate.getDate() - 3);
      await supabase.from('tasks').insert({
        internship_id: internship.id,
        title: 'Demo: Overdue Task (Simulated)',
        description: 'This task was created by Demo Mode to simulate an overdue task scenario.',
        priority: 'high',
        status: 'overdue',
        progress: 35,
        assigned_date: new Date(pastDate.getTime() - 7 * 86400000).toISOString().slice(0, 10),
        deadline: pastDate.toISOString().slice(0, 10),
      });
      const { data: intern } = await supabase.from('profiles').select('*').eq('id', internship.intern_id).maybeSingle();
      if (intern) {
        await supabase.from('alerts').insert({ user_id: intern.id, internship_id: internship.id, category: 'tasks', severity: 'critical', title: 'Simulated Overdue Task', message: 'An overdue task has been simulated for demo purposes.', is_read: false });
      }
      toast('Overdue task simulated! Check tasks and alerts.', 'success');
      refetch();
    } catch { toast('Failed to simulate overdue task', 'error'); }
    setLoading(null);
  };

  const handleGenerateAlert = async () => {
    setLoading('alert');
    try {
      const { data: internships } = await supabase.from('internships').select('*, intern:profiles!internships_intern_id_fkey(*)').limit(1);
      if (!internships || internships.length === 0) { toast('No internships found', 'error'); return; }
      const internship = internships[0];
      const intern = (internship as any).intern;
      if (intern) {
        await supabase.from('alerts').insert({
          user_id: intern.id, internship_id: internship.id,
          category: 'performance', severity: 'warning',
          title: 'Simulated Performance Alert',
          message: 'A performance alert has been generated for demo purposes. Performance has declined recently.',
          is_read: false,
        });
      }
      toast('Performance alert generated! Check the alerts page.', 'success');
    } catch { toast('Failed to generate alert', 'error'); }
    setLoading(null);
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      // Re-run the seed function to restore original demo data
      toast('Re-seeding demo data... This may take a moment.', 'info');
      await callSeedFunction();
      toast('Demo data reset successfully!', 'success');
      refetch();
    } catch { toast('Failed to reset demo data', 'error'); }
    setResetting(false);
  };

  const actions = [
    { id: 'late', label: 'Simulate Late Arrival', desc: 'Creates a realistic late attendance record', icon: Clock, color: 'amber', handler: handleSimulateLate },
    { id: 'ontime', label: 'Simulate On-Time Arrival', desc: 'Creates an on-time attendance record', icon: CheckCircle2, color: 'green', handler: handleSimulateOnTime },
    { id: 'overdue', label: 'Simulate Overdue Task', desc: 'Creates an overdue task with alert', icon: AlertTriangle, color: 'red', handler: handleSimulateOverdue },
    { id: 'alert', label: 'Generate Performance Alert', desc: 'Creates a performance-related alert', icon: AlertTriangle, color: 'amber', handler: handleGenerateAlert },
  ];

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <Card>
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-3 flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-amber-600" />
          <div>
            <p className="text-sm font-semibold text-amber-900">Hackathon Demo Mode</p>
            <p className="text-xs text-amber-700">These controls are for demonstration purposes only. They simulate real-world scenarios for live presentation.</p>
          </div>
        </div>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {actions.map(action => {
              const Icon = action.icon;
              return (
                <div key={action.id} className="rounded-lg border border-slate-200 p-4 hover:shadow-sm transition-shadow">
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-${action.color}-50 text-${action.color}-600`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{action.label}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{action.desc}</p>
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={action.handler} disabled={loading !== null || resetting} className="w-full">
                    {loading === action.id ? <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</> : `Run Simulation`}
                  </Button>
                </div>
              );
            })}
          </div>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <div className="rounded-lg border border-red-200 bg-red-50 p-4">
              <div className="flex items-start gap-3 mb-3">
                <RotateCcw className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-900">Reset Demo Data</p>
                  <p className="text-xs text-red-700 mt-0.5">Restores the original demo state by re-seeding all data. This may take a moment.</p>
                </div>
              </div>
              <Button variant="danger" size="sm" onClick={handleReset} disabled={loading !== null || resetting}>
                {resetting ? <><Loader2 className="h-4 w-4 animate-spin" /> Resetting...</> : <><RotateCcw className="h-4 w-4" /> Reset Demo Data</>}
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Demo Flow Guide" subtitle="Recommended presentation sequence" />
        <CardBody>
          <ol className="space-y-2">
            {[
              'Login as Intern → Show expected start time → Check in',
              'Show punctuality calculation on dashboard',
              'Open Tasks → Update task progress',
              'Open Performance → Show Smart Performance Insights',
              'Logout → Login as Mentor',
              'Open intern profile → Show 360° view',
              'Submit mentor feedback → Show recalculated performance',
              'Open Analytics → Show organization trends',
              'Use Demo Mode to simulate scenarios',
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-slate-700">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-white text-xs font-bold flex-shrink-0">{i + 1}</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </CardBody>
      </Card>
    </div>
  );
}
