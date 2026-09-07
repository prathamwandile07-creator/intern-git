import { useEffect, useState, useCallback } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';
import type {
  Internship,
  Attendance,
  Task,
  Feedback,
  Performance,
  Alert,
  Department,
  Profile,
} from '@/types';

export function useAlerts() {
  const { profile } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!profile) return;
    let mounted = true;

    const fetchCount = async () => {
      const { count } = await supabase
        .from('alerts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id)
        .eq('is_read', false);
      if (mounted) setUnreadCount(count || 0);
    };

    fetchCount();

    const channel = supabase
      .channel('alerts-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'alerts', filter: `user_id=eq.${profile.id}` },
        fetchCount
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, [profile]);

  return { unreadCount };
}

export function useInternship() {
  const { profile } = useAuth();
  const [internship, setInternship] = useState<Internship | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile) return;
    let mounted = true;

    const fetch = async () => {
      let query = supabase.from('internships').select(`
        *,
        department:departments(*),
        mentor:profiles!internships_mentor_id_fkey(*),
        intern:profiles!internships_intern_id_fkey(*)
      `);

      if (profile.role === 'intern') {
        query = query.eq('intern_id', profile.id);
      } else if (profile.role === 'mentor') {
        query = query.eq('mentor_id', profile.id);
      }

      const { data } = await query;
      if (mounted) {
        setInternship(data?.[0] as Internship | null);
        setLoading(false);
      }
    };

    fetch();
  }, [profile]);

  return { internship, loading };
}

export function useInternData(internshipId: string | undefined) {
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [performance, setPerformance] = useState<Performance[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!internshipId) return;
    setLoading(true);

    const [attRes, taskRes, fbRes, perfRes] = await Promise.all([
      supabase.from('attendance').select('*').eq('internship_id', internshipId).order('date', { ascending: true }),
      supabase.from('tasks').select('*').eq('internship_id', internshipId).order('created_at', { ascending: true }),
      supabase.from('feedback').select('*').eq('internship_id', internshipId).order('created_at', { ascending: false }).maybeSingle(),
      supabase.from('performance').select('*').eq('internship_id', internshipId).order('date', { ascending: true }),
    ]);

    setAttendance((attRes.data as Attendance[]) || []);
    setTasks((taskRes.data as Task[]) || []);
    setFeedback((fbRes.data as Feedback) || null);
    setPerformance((perfRes.data as Performance[]) || []);
    setLoading(false);
  }, [internshipId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { attendance, tasks, feedback, performance, loading, refetch };
}

export function useMentorInterns() {
  const { profile } = useAuth();
  const [interns, setInterns] = useState<(Profile & {
    internship: Internship & { department: Department | null };
  })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile || profile.role !== 'mentor') return;
    let mounted = true;

    const fetch = async () => {
      const { data } = await supabase
        .from('internships')
        .select(`
          *,
          intern:profiles!internships_intern_id_fkey(*),
          department:departments(*)
        `)
        .eq('mentor_id', profile.id)
        .eq('status', 'active');

      if (mounted) {
        const internList = (data || []).map((item: any) => ({
          ...item.intern,
          internship: { ...item, department: item.department },
        }));
        setInterns(internList);
        setLoading(false);
      }
    };

    fetch();
  }, [profile]);

  return { interns, loading };
}

export function useAllInterns() {
  const [interns, setInterns] = useState<(Profile & {
    internship: Internship & { department: Department | null; mentor: Profile | null };
  })[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    const { data } = await supabase
      .from('internships')
      .select(`
        *,
        intern:profiles!internships_intern_id_fkey(*),
        mentor:profiles!internships_mentor_id_fkey(*),
        department:departments(*)
      `)
      .order('created_at', { ascending: true });

    const internList = (data || []).map((item: any) => ({
      ...item.intern,
      internship: { ...item, department: item.department, mentor: item.mentor },
    }));
    setInterns(internList);
    setLoading(false);
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { interns, loading, refetch };
}

export function useAllMentors() {
  const [mentors, setMentors] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'mentor')
        .order('full_name');
      setMentors((data as Profile[]) || []);
      setLoading(false);
    };
    fetch();
  }, []);

  return { mentors, loading };
}

export function useAlertsList() {
  const { profile } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('alerts')
      .select('*')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false });
    setAlerts((data as Alert[]) || []);
    setLoading(false);
  }, [profile]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { alerts, loading, refetch };
}

export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from('departments').select('*').order('name');
      setDepartments((data as Department[]) || []);
      setLoading(false);
    };
    fetch();
  }, []);

  return { departments, loading };
}
