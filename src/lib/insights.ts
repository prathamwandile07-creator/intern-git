import type {
  Attendance,
  Task,
  Feedback,
  Performance,
  Insight,
} from '@/types';
import {
  calcAttendanceScore,
  calcPunctualityScore,
  calcTaskScore,
  calcMentorScore,
  getLateCount,
  daysUntil,
} from './performance';

export function generateInsights(
  attendance: Attendance[],
  tasks: Task[],
  feedback: Feedback | null,
  performance: Performance[]
): Insight[] {
  const insights: Insight[] = [];

  const attendanceScore = calcAttendanceScore(attendance);
  const punctualityScore = calcPunctualityScore(attendance);
  const taskScore = calcTaskScore(tasks);
  const lateCount = getLateCount(attendance);

  // Low attendance
  if (attendanceScore < 75) {
    insights.push({
      id: 'low-attendance',
      title: 'Low Attendance',
      severity: 'critical',
      reason: `Attendance is at ${Math.round(attendanceScore)}%, below the recommended 75% threshold.`,
      action: 'Consistent attendance is required to maintain strong internship performance. Aim to be present every working day.',
      category: 'attendance',
    });
  }

  // Repeated late arrivals
  if (lateCount >= 3) {
    insights.push({
      id: 'repeated-late',
      title: 'Repeated Late Arrivals',
      severity: 'warning',
      reason: `${lateCount} late arrivals detected out of ${attendance.length} recorded days.`,
      action: 'Consider improving morning scheduling and arrival consistency. Plan to arrive 10 minutes early.',
      category: 'punctuality',
    });
  }

  // Overdue tasks
  const overdueTasks = tasks.filter((t) => t.status === 'overdue');
  if (overdueTasks.length > 0) {
    insights.push({
      id: 'overdue-tasks',
      title: 'Overdue Tasks',
      severity: 'critical',
      reason: `${overdueTasks.length} task${overdueTasks.length > 1 ? 's' : ''} past deadline.`,
      action: 'An overdue task requires immediate attention. Update progress or discuss with your mentor.',
      category: 'tasks',
    });
  }

  // Approaching deadlines with low progress
  const approachingTasks = tasks.filter((t) => {
    const days = daysUntil(t.deadline);
    return days >= 0 && days <= 3 && t.progress < 50 && t.status !== 'completed';
  });
  if (approachingTasks.length > 0) {
    insights.push({
      id: 'approaching-deadline',
      title: 'Approaching Deadlines',
      severity: 'warning',
      reason: `${approachingTasks.length} task${approachingTasks.length > 1 ? 's' : ''} due within 3 days with less than 50% progress.`,
      action: 'Task deadline is approaching with incomplete progress. Prioritize these tasks immediately.',
      category: 'tasks',
    });
  }

  // Declining performance
  if (performance.length >= 2) {
    const sorted = [...performance].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const recent = sorted[0].overall_score;
    const previous = sorted[1].overall_score;
    if (recent < previous - 5) {
      insights.push({
        id: 'declining-performance',
        title: 'Declining Performance',
        severity: 'warning',
        reason: `Performance dropped from ${Math.round(previous)}% to ${Math.round(recent)}% in the latest period.`,
        action: 'Performance has declined recently. Mentor intervention may be helpful. Review your recent activity.',
        category: 'performance',
      });
    }
  }

  // Low task completion
  if (taskScore < 60) {
    insights.push({
      id: 'low-task-completion',
      title: 'Low Task Completion',
      severity: 'warning',
      reason: `Task completion score is at ${Math.round(taskScore)}%.`,
      action: 'Focus on completing assigned tasks on time. Break large tasks into smaller steps.',
      category: 'tasks',
    });
  }

  // Low punctuality
  if (punctualityScore < 75 && lateCount < 3) {
    insights.push({
      id: 'low-punctuality',
      title: 'Below-Target Punctuality',
      severity: 'information',
      reason: `Punctuality score is at ${Math.round(punctualityScore)}%.`,
      action: 'Aim to arrive on time consistently to improve your punctuality score.',
      category: 'punctuality',
    });
  }

  // No mentor feedback
  if (!feedback) {
    insights.push({
      id: 'no-feedback',
      title: 'No Mentor Feedback Yet',
      severity: 'information',
      reason: 'No mentor evaluation has been submitted.',
      action: 'Request feedback from your mentor to complete your performance profile.',
      category: 'feedback',
    });
  }

  // Positive insight — high performance
  const mentorScore = calcMentorScore(feedback);
  const overall = attendanceScore * 0.25 + punctualityScore * 0.25 + taskScore * 0.25 + mentorScore * 0.25;
  if (overall >= 85 && insights.length === 0) {
    insights.push({
      id: 'strong-performance',
      title: 'Strong Performance',
      severity: 'information',
      reason: `Overall performance is ${Math.round(overall)}%, well above target.`,
      action: 'Keep up the excellent work. Consider taking on more challenging tasks to grow further.',
      category: 'performance',
    });
  }

  return insights;
}
