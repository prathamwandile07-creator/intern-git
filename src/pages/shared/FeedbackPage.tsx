import { useEffect, useState } from 'react';
import { MessageSquare, Star, Send } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toast';
import { useInternData } from '@/lib/hooks';
import { calcMentorScore, calcOverall, calcAttendanceScore, calcPunctualityScore, calcTaskScore, formatDate } from '@/lib/performance';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Input';
import { SkeletonCard, EmptyState } from '@/components/ui/Skeleton';
import type { Internship, Feedback } from '@/types';

const RATING_FIELDS = [
  { key: 'technical_skills', label: 'Technical Skills' },
  { key: 'communication', label: 'Communication' },
  { key: 'teamwork', label: 'Teamwork' },
  { key: 'punctuality', label: 'Punctuality' },
  { key: 'task_discipline', label: 'Task Discipline' },
  { key: 'overall_rating', label: 'Overall Rating' },
] as const;

export function FeedbackPage({ role }: { role: 'intern' | 'mentor' | 'admin' }) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [internship, setInternship] = useState<Internship | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [ratings, setRatings] = useState<Record<string, number>>({
    technical_skills: 3, communication: 3, teamwork: 3, punctuality: 3, task_discipline: 3, overall_rating: 3,
  });
  const [writtenFeedback, setWrittenFeedback] = useState('');
  const [strengths, setStrengths] = useState('');
  const [improvements, setImprovements] = useState('');
  const [actions, setActions] = useState('');

  useEffect(() => {
    if (!profile) return;
    (async () => {
      let query = supabase.from('internships').select('*, intern:profiles!internships_intern_id_fkey(*)');
      if (role === 'intern') query = query.eq('intern_id', profile.id);
      else if (role === 'mentor') query = query.eq('mentor_id', profile.id);
      const { data } = await query.maybeSingle();
      setInternship(data as Internship | null);
      setLoading(false);
    })();
  }, [profile, role]);

  const { feedback, attendance, tasks, refetch } = useInternData(internship?.id);

  const handleSubmit = async () => {
    if (!internship || !profile) return;
    setSubmitting(true);

    const { error } = await supabase.from('feedback').upsert({
      internship_id: internship.id,
      mentor_id: profile.id,
      technical_skills: ratings.technical_skills,
      communication: ratings.communication,
      teamwork: ratings.teamwork,
      punctuality: ratings.punctuality,
      task_discipline: ratings.task_discipline,
      overall_rating: ratings.overall_rating,
      written_feedback: writtenFeedback,
      strengths: strengths,
      areas_for_improvement: improvements,
      recommended_actions: actions,
    }, { onConflict: 'internship_id' });

    if (error) {
      toast('Failed to submit feedback', 'error');
    } else {
      // Recalculate performance
      const mentorScore = (ratings.technical_skills + ratings.communication + ratings.teamwork + ratings.punctuality + ratings.task_discipline + ratings.overall_rating) / 6 * 20;
      const att = calcAttendanceScore(attendance);
      const pun = calcPunctualityScore(attendance);
      const task = calcTaskScore(tasks);
      const overall = calcOverall(att, pun, task, mentorScore);

      const today = new Date().toISOString().slice(0, 10);
      await supabase.from('performance').upsert({
        internship_id: internship.id,
        date: today,
        attendance_score: att,
        punctuality_score: pun,
        task_completion_score: task,
        mentor_evaluation_score: mentorScore,
        overall_score: overall.score,
        performance_level: overall.level,
      }, { onConflict: 'internship_id,date' });

      // Generate alert for intern
      await supabase.from('alerts').insert({
        user_id: internship.intern_id,
        internship_id: internship.id,
        category: 'feedback',
        severity: 'information',
        title: 'New Mentor Feedback Received',
        message: `Your mentor has submitted new feedback. Overall rating: ${ratings.overall_rating}/5. Check your performance page for updated scores.`,
        is_read: false,
      });

      toast('Feedback submitted! Performance recalculated.', 'success');
      refetch();
    }
    setSubmitting(false);
  };

  if (loading) {
    return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{[0,1].map(i => <SkeletonCard key={i} />)}</div>;
  }

  const isMentor = role === 'mentor' || role === 'admin';

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Existing Feedback (for intern view) */}
      {role === 'intern' && feedback && (
        <Card>
          <CardHeader title="Latest Mentor Feedback" subtitle={`Submitted on ${formatDate(feedback.created_at)}`} />
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {RATING_FIELDS.map(f => (
                <div key={f.key} className="rounded-lg bg-slate-50 p-3 text-center">
                  <p className="text-xs text-slate-500 mb-1">{f.label}</p>
                  <div className="flex items-center justify-center gap-0.5">
                    {[1,2,3,4,5].map(n => (
                      <Star key={n} className={`h-4 w-4 ${n <= (feedback as any)[f.key] ? 'fill-amber-400 text-amber-400' : 'text-slate-300'}`} />
                    ))}
                  </div>
                  <p className="text-sm font-semibold text-slate-900 mt-1">{(feedback as any)[f.key]}/5</p>
                </div>
              ))}
            </div>
            {feedback.written_feedback && (
              <div className="mb-3">
                <p className="text-xs font-medium text-slate-500 mb-1">Written Feedback</p>
                <p className="text-sm text-slate-700">{feedback.written_feedback}</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {feedback.strengths && (
                <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                  <p className="text-xs font-medium text-green-700 mb-1">Strengths</p>
                  <p className="text-sm text-green-800">{feedback.strengths}</p>
                </div>
              )}
              {feedback.areas_for_improvement && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                  <p className="text-xs font-medium text-amber-700 mb-1">Areas for Improvement</p>
                  <p className="text-sm text-amber-800">{feedback.areas_for_improvement}</p>
                </div>
              )}
              {feedback.recommended_actions && (
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                  <p className="text-xs font-medium text-blue-700 mb-1">Recommended Actions</p>
                  <p className="text-sm text-blue-800">{feedback.recommended_actions}</p>
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Submit Feedback (for mentor view) */}
      {isMentor && (
        <Card>
          <CardHeader title="Submit Mentor Feedback" subtitle={`Evaluating: ${(internship as any)?.intern?.full_name || 'Intern'}`} />
          <CardBody>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {RATING_FIELDS.map(f => (
                  <div key={f.key}>
                    <label className="block text-sm font-medium text-slate-700 mb-2">{f.label}</label>
                    <div className="flex items-center gap-2">
                      {[1,2,3,4,5].map(n => (
                        <button
                          key={n}
                          onClick={() => setRatings(prev => ({ ...prev, [f.key]: n }))}
                          className="p-1 transition-transform hover:scale-110"
                        >
                          <Star className={`h-6 w-6 ${n <= ratings[f.key] ? 'fill-amber-400 text-amber-400' : 'text-slate-300 hover:text-slate-400'}`} />
                        </button>
                      ))}
                      <span className="text-sm font-medium text-slate-700 ml-2">{ratings[f.key]}/5</span>
                    </div>
                  </div>
                ))}
              </div>

              <Textarea label="Written Feedback" rows={3} value={writtenFeedback} onChange={(e) => setWrittenFeedback(e.target.value)} placeholder="Provide overall written feedback..." />
              <Textarea label="Strengths" rows={2} value={strengths} onChange={(e) => setStrengths(e.target.value)} placeholder="What the intern does well..." />
              <Textarea label="Areas for Improvement" rows={2} value={improvements} onChange={(e) => setImprovements(e.target.value)} placeholder="Where the intern can improve..." />
              <Textarea label="Recommended Actions" rows={2} value={actions} onChange={(e) => setActions(e.target.value)} placeholder="Specific actions the intern should take..." />

              <div className="flex justify-end">
                <Button onClick={handleSubmit} loading={submitting} size="lg">
                  <Send className="h-4 w-4" /> Submit Feedback
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {role === 'intern' && !feedback && (
        <Card>
          <EmptyState icon={<MessageSquare className="h-6 w-6" />} title="No Feedback Yet" message="Your mentor hasn't submitted feedback yet. Check back later." />
        </Card>
      )}
    </div>
  );
}
