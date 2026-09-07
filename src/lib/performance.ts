import type {
  Attendance,
  Task,
  Feedback,
  PerformanceLevel,
} from '@/types';

export function formatTime(dateStr: string | null): string {
  if (!dateStr) return '--:--';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatDateShort(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export function getAttendanceStatus(
  expectedStart: string,
  actualCheckIn: Date
): { status: 'early' | 'on_time' | 'late'; minutesDiff: number } {
  const [expHour, expMin] = expectedStart.split(':').map(Number);
  const expected = new Date();
  expected.setHours(expHour, expMin, 0, 0);

  const diffMs = actualCheckIn.getTime() - expected.getTime();
  const diffMin = Math.round(diffMs / (1000 * 60));

  let status: 'early' | 'on_time' | 'late';
  if (diffMin <= 0) {
    status = 'early';
  } else if (diffMin <= 10) {
    status = 'on_time';
  } else {
    status = 'late';
  }

  return { status, minutesDiff: diffMin };
}

export function calcAttendanceScore(records: Attendance[]): number {
  if (records.length === 0) return 0;
  const present = records.filter((r) => r.status !== 'absent').length;
  return (present / records.length) * 100;
}

export function calcPunctualityScore(records: Attendance[]): number {
  if (records.length === 0) return 0;
  const present = records.filter((r) => r.status !== 'absent').length;
  if (present === 0) return 0;
  const late = records.filter((r) => r.status === 'late').length;
  return ((present - late) / records.length) * 100;
}

export function calcTaskScore(tasks: Task[]): number {
  if (tasks.length === 0) return 0;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  const avgProgress = tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length;
  return (completed / tasks.length) * 50 + (avgProgress / 100) * 50;
}

export function calcMentorScore(feedback: Feedback | null): number {
  if (!feedback) return 0;
  const avg =
    (feedback.technical_skills +
      feedback.communication +
      feedback.teamwork +
      feedback.punctuality +
      feedback.task_discipline +
      feedback.overall_rating) /
    6;
  return (avg / 5) * 100;
}

export function calcOverall(
  attendance: number,
  punctuality: number,
  taskCompletion: number,
  mentorEval: number
): { score: number; level: PerformanceLevel } {
  const overall = attendance * 0.25 + punctuality * 0.25 + taskCompletion * 0.25 + mentorEval * 0.25;
  let level: PerformanceLevel = 'at_risk';
  if (overall >= 90) level = 'excellent';
  else if (overall >= 75) level = 'good';
  else if (overall >= 60) level = 'needs_improvement';
  return { score: Math.round(overall), level };
}

export function getLateCount(records: Attendance[]): number {
  return records.filter((r) => r.status === 'late').length;
}

export function getPerformanceColor(score: number): string {
  if (score >= 90) return 'text-green-600';
  if (score >= 75) return 'text-blue-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-red-600';
}

export function getPerformanceBg(score: number): string {
  if (score >= 90) return 'bg-green-100 text-green-700';
  if (score >= 75) return 'bg-blue-100 text-blue-700';
  if (score >= 60) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-700';
}

export function getPerformanceLabel(level: PerformanceLevel): string {
  switch (level) {
    case 'excellent': return 'Excellent';
    case 'good': return 'Good';
    case 'needs_improvement': return 'Needs Improvement';
    case 'at_risk': return 'At Risk';
  }
}

export function getRiskLevel(score: number): 'healthy' | 'needs_attention' | 'at_risk' {
  if (score >= 75) return 'healthy';
  if (score >= 60) return 'needs_attention';
  return 'at_risk';
}

export function getRiskColor(risk: 'healthy' | 'needs_attention' | 'at_risk'): string {
  switch (risk) {
    case 'healthy': return 'bg-green-100 text-green-700';
    case 'needs_attention': return 'bg-amber-100 text-amber-700';
    case 'at_risk': return 'bg-red-100 text-red-700';
  }
}

export function getRiskLabel(risk: 'healthy' | 'needs_attention' | 'at_risk'): string {
  switch (risk) {
    case 'healthy': return 'Healthy';
    case 'needs_attention': return 'Needs Attention';
    case 'at_risk': return 'At Risk';
  }
}
