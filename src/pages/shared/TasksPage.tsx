import { useEffect, useState, useMemo } from 'react';
import { CheckSquare, Search, Filter } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toast';
import { useInternData } from '@/lib/hooks';
import { formatDateShort, daysUntil, calcTaskScore } from '@/lib/performance';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Modal } from '@/components/ui/Modal';
import { SkeletonCard, EmptyState } from '@/components/ui/Skeleton';
import { KPICard } from '@/components/ui/KPICard';
import type { Internship, Task, TaskStatus, TaskPriority } from '@/types';

const STATUS_LABELS: Record<TaskStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  overdue: 'Overdue',
};

const STATUS_VARIANTS: Record<TaskStatus, 'gray' | 'blue' | 'green' | 'red'> = {
  not_started: 'gray',
  in_progress: 'blue',
  completed: 'green',
  overdue: 'red',
};

const PRIORITY_VARIANTS: Record<TaskPriority, 'gray' | 'amber' | 'red'> = {
  low: 'gray',
  medium: 'gray',
  high: 'amber',
  critical: 'red',
};

export function TasksPage({ role }: { role: 'intern' | 'mentor' | 'admin' }) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [internship, setInternship] = useState<Internship | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editProgress, setEditProgress] = useState(0);
  const [editStatus, setEditStatus] = useState<TaskStatus>('not_started');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    (async () => {
      let query = supabase.from('internships').select('*');
      if (role === 'intern') query = query.eq('intern_id', profile.id);
      else if (role === 'mentor') query = query.eq('mentor_id', profile.id);
      const { data } = await query.maybeSingle();
      setInternship(data as Internship | null);
      setLoading(false);
    })();
  }, [profile, role]);

  const internshipId = internship?.id;
  const { tasks, refetch, loading: dataLoading } = useInternData(internshipId);

  const taskScore = useMemo(() => calcTaskScore(tasks), [tasks]);

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter && t.status !== statusFilter) return false;
      if (priorityFilter && t.priority !== priorityFilter) return false;
      return true;
    });
  }, [tasks, search, statusFilter, priorityFilter]);

  const handleOpenEdit = (task: Task) => {
    setEditingTask(task);
    setEditProgress(task.progress);
    setEditStatus(task.status);
  };

  const handleSaveTask = async () => {
    if (!editingTask) return;
    setSaving(true);
    let status = editStatus;
    let completionDate = editingTask.completion_date;
    if (editProgress === 100) { status = 'completed'; completionDate = new Date().toISOString().slice(0, 10); }
    else if (editProgress > 0 && status === 'not_started') status = 'in_progress';

    const { error } = await supabase
      .from('tasks')
      .update({ progress: editProgress, status, completion_date: completionDate })
      .eq('id', editingTask.id);

    if (error) { toast('Failed to update task', 'error'); }
    else { toast('Task updated successfully', 'success'); refetch(); setEditingTask(null); }
    setSaving(false);
  };

  if (loading || dataLoading) {
    return <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{[0,1,2].map(i => <SkeletonCard key={i} />)}</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <KPICard label="Total Tasks" value={tasks.length} icon={CheckSquare} color="slate" />
        <KPICard label="Completed" value={tasks.filter(t => t.status === 'completed').length} icon={CheckSquare} color="green" />
        <KPICard label="In Progress" value={tasks.filter(t => t.status === 'in_progress').length} icon={CheckSquare} color="blue" />
        <KPICard label="Overdue" value={tasks.filter(t => t.status === 'overdue').length} icon={CheckSquare} color="red" />
      </div>

      <Card>
        <CardHeader title="Tasks" subtitle={`Task completion score: ${Math.round(taskScore)}%`} />
        <CardBody>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2">
                <Search className="h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none w-full"
                />
              </div>
            </div>
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="sm:w-40">
              <option value="">All Statuses</option>
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
            </Select>
            <Select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="sm:w-40">
              <option value="">All Priorities</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </Select>
          </div>

          {filteredTasks.length > 0 ? (
            <div className="space-y-3">
              {filteredTasks.map((task) => {
                const days = daysUntil(task.deadline);
                return (
                  <div key={task.id} className="rounded-lg border border-slate-200 p-4 hover:shadow-sm transition-shadow">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{task.title}</p>
                        {task.description && <p className="text-xs text-slate-500 mt-1">{task.description}</p>}
                      </div>
                      <div className="flex gap-1.5 flex-shrink-0">
                        <Badge variant={STATUS_VARIANTS[task.status]}>{STATUS_LABELS[task.status]}</Badge>
                        <Badge variant={PRIORITY_VARIANTS[task.priority]}>{task.priority}</Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500 mb-2">
                      <span>Assigned: {formatDateShort(task.assigned_date)}</span>
                      <span>Due: {formatDateShort(task.deadline)}</span>
                      {days < 0 && task.status !== 'completed' && <span className="text-red-600 font-medium">{Math.abs(days)} days overdue</span>}
                      {days >= 0 && days <= 3 && task.status !== 'completed' && <span className="text-amber-600 font-medium">Due in {days} days</span>}
                    </div>
                    <div className="flex items-center gap-3">
                      <ProgressBar value={task.progress} size="sm" color={task.status === 'overdue' ? 'red' : task.status === 'completed' ? 'green' : 'blue'} showLabel />
                      {role === 'intern' && task.status !== 'completed' && (
                        <Button size="sm" variant="outline" onClick={() => handleOpenEdit(task)}>Update</Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState icon={<CheckSquare className="h-6 w-6" />} title="No Tasks Found" message="No tasks match your current filters. Try adjusting your search." />
          )}
        </CardBody>
      </Card>

      {/* Edit Task Modal */}
      <Modal open={!!editingTask} onClose={() => setEditingTask(null)} title="Update Task Progress" subtitle={editingTask?.title}>
        {editingTask && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Progress: {editProgress}%</label>
              <input
                type="range"
                min="0"
                max="100"
                value={editProgress}
                onChange={(e) => setEditProgress(Number(e.target.value))}
                className="w-full accent-slate-900"
              />
              <ProgressBar value={editProgress} size="lg" color="blue" />
            </div>
            <Select label="Status" value={editStatus} onChange={(e) => setEditStatus(e.target.value as TaskStatus)}>
              <option value="not_started">Not Started</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
            </Select>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setEditingTask(null)}>Cancel</Button>
              <Button onClick={handleSaveTask} loading={saving}>Save Changes</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
