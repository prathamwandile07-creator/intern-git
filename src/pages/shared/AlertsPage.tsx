import { useMemo } from 'react';
import { Bell, CheckCheck, AlertTriangle, Info, XCircle } from 'lucide-react';
import { useAlertsList } from '@/lib/hooks';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toast';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { SkeletonCard, EmptyState } from '@/components/ui/Skeleton';
import type { AlertSeverity } from '@/types';

const SEVERITY_CONFIG: Record<AlertSeverity, { icon: typeof AlertTriangle; color: string; bg: string; badge: 'red' | 'amber' | 'blue' }> = {
  critical: { icon: XCircle, color: 'text-red-600', bg: 'bg-red-50 border-red-200', badge: 'red' },
  warning: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200', badge: 'amber' },
  information: { icon: Info, color: 'text-blue-600', bg: 'bg-blue-50 border-blue-200', badge: 'blue' },
};

const CATEGORY_LABELS: Record<string, string> = {
  attendance: 'Attendance',
  punctuality: 'Punctuality',
  tasks: 'Tasks',
  performance: 'Performance',
  feedback: 'Mentor Feedback',
};

export function AlertsPage() {
  const { alerts, loading, refetch } = useAlertsList();
  const { toast } = useToast();

  const unreadCount = useMemo(() => alerts.filter(a => !a.is_read).length, [alerts]);

  const handleMarkRead = async (id: string) => {
    await supabase.from('alerts').update({ is_read: true }).eq('id', id);
    refetch();
  };

  const handleMarkAllRead = async () => {
    const { profile } = await supabase.auth.getUser();
    if (!profile.data.user) return;
    await supabase.from('alerts').update({ is_read: true }).eq('user_id', profile.data.user.id).eq('is_read', false);
    toast('All alerts marked as read', 'success');
    refetch();
  };

  if (loading) {
    return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{[0,1].map(i => <SkeletonCard key={i} />)}</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader
          title="Alerts Center"
          subtitle={`${alerts.length} total · ${unreadCount} unread`}
          action={unreadCount > 0 ? <Button size="sm" variant="outline" onClick={handleMarkAllRead}><CheckCheck className="h-4 w-4" /> Mark all read</Button> : undefined}
        />
        <CardBody>
          {alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.map(alert => {
                const config = SEVERITY_CONFIG[alert.severity];
                const Icon = config.icon;
                return (
                  <div key={alert.id} className={`rounded-lg border p-4 ${config.bg} ${!alert.is_read ? 'ring-1 ring-slate-200' : 'opacity-70'}`}>
                    <div className="flex items-start gap-3">
                      <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${config.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-slate-900">{alert.title}</p>
                          {!alert.is_read && <span className="h-2 w-2 rounded-full bg-blue-500 flex-shrink-0" />}
                        </div>
                        <p className="text-sm text-slate-600">{alert.message}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant={config.badge}>{CATEGORY_LABELS[alert.category]}</Badge>
                          <span className="text-xs text-slate-400">{new Date(alert.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                          {!alert.is_read && (
                            <button onClick={() => handleMarkRead(alert.id)} className="text-xs text-blue-600 hover:underline ml-auto">Mark as read</button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={<Bell className="h-6 w-6" />} title="No Alerts" message="You're all caught up! No alerts at this time." />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
