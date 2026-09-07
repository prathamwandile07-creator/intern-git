import { useEffect, useState } from 'react';
import { Briefcase, Search } from 'lucide-react';
import { useAllMentors } from '@/lib/hooks';
import { supabase } from '@/lib/supabase';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { SkeletonCard, EmptyState } from '@/components/ui/Skeleton';

export function AdminMentorsPage() {
  const { mentors, loading } = useAllMentors();
  const [search, setSearch] = useState('');
  const [mentorData, setMentorData] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (loading || mentors.length === 0) { setDataLoading(false); return; }
    let mounted = true;
    (async () => {
      const results = await Promise.all(mentors.map(async (mentor) => {
        const { count } = await supabase.from('internships').select('id', { count: 'exact', head: true }).eq('mentor_id', mentor.id).eq('status', 'active');
        return { ...mentor, internCount: count || 0 };
      }));
      if (mounted) { setMentorData(results); setDataLoading(false); }
    })();
    return () => { mounted = false; };
  }, [mentors, loading]);

  const filtered = mentorData.filter(m => !search || m.full_name.toLowerCase().includes(search.toLowerCase()) || m.email.toLowerCase().includes(search.toLowerCase()));

  if (loading || dataLoading) return <div className="space-y-6"><SkeletonCard /></div>;

  return (
    <div className="space-y-6 animate-fade-in">
      <Card>
        <CardHeader title="All Mentors" subtitle={`${filtered.length} mentors`} />
        <CardBody>
          <div className="mb-4">
            <div className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 max-w-md">
              <Search className="h-4 w-4 text-slate-400" />
              <input type="text" placeholder="Search mentors..." value={search} onChange={(e) => setSearch(e.target.value)} className="bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none w-full" />
            </div>
          </div>

          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map(mentor => (
                <div key={mentor.id} className="rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-sm font-bold text-slate-600">
                      {mentor.full_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">{mentor.full_name}</p>
                      <p className="text-xs text-slate-500 truncate">{mentor.email}</p>
                    </div>
                  </div>
                  <Badge variant="blue">{mentor.internCount} active {mentor.internCount === 1 ? 'intern' : 'interns'}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState icon={<Briefcase className="h-6 w-6" />} title="No Mentors Found" message="No mentors match your search." />
          )}
        </CardBody>
      </Card>
    </div>
  );
}
