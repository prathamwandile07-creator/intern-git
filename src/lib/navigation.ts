import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  CalendarCheck,
  Clock,
  CheckSquare,
  BarChart3,
  MessageSquare,
  Bell,
  User,
  Users,
  GraduationCap,
  Settings,
  FlaskConical,
  Briefcase,
} from 'lucide-react';
import type { UserRole } from '@/types';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: Record<UserRole, NavItem[]> = {
  intern: [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Attendance', path: '/attendance', icon: CalendarCheck },
    { label: 'Punctuality', path: '/punctuality', icon: Clock },
    { label: 'Tasks', path: '/tasks', icon: CheckSquare },
    { label: 'Performance', path: '/performance', icon: BarChart3 },
    { label: 'Feedback', path: '/feedback', icon: MessageSquare },
    { label: 'Alerts', path: '/alerts', icon: Bell },
    { label: 'Profile', path: '/profile', icon: User },
  ],
  mentor: [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'My Interns', path: '/interns', icon: Users },
    { label: 'Attendance', path: '/attendance', icon: CalendarCheck },
    { label: 'Tasks', path: '/tasks', icon: CheckSquare },
    { label: 'Performance', path: '/performance', icon: BarChart3 },
    { label: 'Feedback', path: '/feedback', icon: MessageSquare },
    { label: 'Alerts', path: '/alerts', icon: Bell },
    { label: 'Profile', path: '/profile', icon: User },
  ],
  admin: [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Interns', path: '/interns', icon: GraduationCap },
    { label: 'Mentors', path: '/mentors', icon: Briefcase },
    { label: 'Attendance', path: '/attendance', icon: CalendarCheck },
    { label: 'Tasks', path: '/tasks', icon: CheckSquare },
    { label: 'Performance', path: '/performance', icon: BarChart3 },
    { label: 'Analytics', path: '/analytics', icon: BarChart3 },
    { label: 'Alerts', path: '/alerts', icon: Bell },
    { label: 'Demo Mode', path: '/demo', icon: FlaskConical },
    { label: 'Settings', path: '/settings', icon: Settings },
  ],
};
