import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Settings as SettingsIcon, Database, Shield, Server } from 'lucide-react';

export function SettingsPage() {
  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <Card>
        <CardHeader title="System Settings" subtitle="InternTrack configuration" />
        <CardBody>
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50"><Database className="h-5 w-5 text-blue-600" /></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">Database</p>
                <p className="text-xs text-slate-500">Supabase PostgreSQL — connected and operational</p>
              </div>
              <Badge variant="green">Active</Badge>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50"><Shield className="h-5 w-5 text-green-600" /></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">Row Level Security</p>
                <p className="text-xs text-slate-500">All tables protected with role-based policies</p>
              </div>
              <Badge variant="green">Enabled</Badge>
            </div>
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50"><Server className="h-5 w-5 text-amber-600" /></div>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900">Edge Functions</p>
                <p className="text-xs text-slate-500">Demo data seeding function deployed</p>
              </div>
              <Badge variant="green">Deployed</Badge>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Performance Weights" subtitle="How overall performance is calculated" />
        <CardBody>
          <div className="space-y-3">
            {[
              { label: 'Attendance', weight: 25 },
              { label: 'Punctuality', weight: 25 },
              { label: 'Task Completion', weight: 25 },
              { label: 'Mentor Evaluation', weight: 25 },
            ].map(item => (
              <div key={item.label} className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                <span className="text-sm font-medium text-slate-700">{item.label}</span>
                <Badge variant="blue">{item.weight}%</Badge>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-4">Overall = Sum of (Score × Weight) across all four metrics.</p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="About InternTrack" />
        <CardBody>
          <p className="text-sm text-slate-600">InternTrack is a smart internship monitoring and performance platform that converts attendance, punctuality, task progress, and mentor evaluations into actionable performance insights.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {['Check-in', 'Track', 'Evaluate', 'Analyze', 'Improve'].map((step, i) => (
              <span key={step} className="text-xs text-slate-500">{step}{i < 4 && <span className="text-slate-300 mx-1">→</span>}</span>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
