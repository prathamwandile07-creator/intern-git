import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Briefcase, ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/lib/toast';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

const DEMO_ACCOUNTS = [
  { label: 'Continue as Intern Demo', email: 'arjun.sharma@interntrack.com', role: 'Intern', icon: GraduationCap, color: 'blue' },
  { label: 'Continue as Mentor Demo', email: 'mentor.suresh@interntrack.com', role: 'Mentor', icon: Briefcase, color: 'amber' },
  { label: 'Continue as Admin Demo', email: 'admin@interntrack.com', role: 'Admin', icon: ShieldCheck, color: 'slate' },
];

const DEMO_PASSWORD = 'demo1234';

export function LoginPage() {
  const { signIn } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState<string | null>(null);

  const handleSignIn = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast('Please enter your email and password', 'error');
      return;
    }
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast(error, 'error');
    } else {
      toast('Welcome back!', 'success');
      navigate('/dashboard');
    }
  };

  const handleDemoLogin = async (demoEmail: string, label: string) => {
    setDemoLoading(label);
    const { error } = await signIn(demoEmail, DEMO_PASSWORD);
    setDemoLoading(null);
    if (error) {
      toast(`Demo login failed: ${error}. Run demo data seeding first.`, 'error');
    } else {
      toast(`Logged in as ${label.replace('Continue as ', '').replace(' Demo', '')}`, 'success');
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left panel — branding */}
      <div className="lg:w-1/2 bg-slate-900 text-white flex flex-col justify-between p-8 lg:p-12 relative overflow-hidden">
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)',
          backgroundSize: '24px 24px',
        }} />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600">
              <span className="text-white font-bold text-xl">IT</span>
            </div>
            <div>
              <p className="text-lg font-semibold">InternTrack</p>
              <p className="text-sm text-slate-400">Smart Internship Monitoring</p>
            </div>
          </div>

          <h1 className="text-3xl lg:text-4xl font-bold leading-tight mb-4">
            From attendance data to<br />actionable performance insights.
          </h1>
          <p className="text-slate-400 text-lg mb-8">
            Track punctuality, task progress, and mentor evaluations — all in one
            professional monitoring platform.
          </p>

          <div className="flex flex-wrap gap-2">
            {['Check-in', 'Track', 'Evaluate', 'Analyze', 'Improve'].map((step, i) => (
              <span key={step} className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1.5 text-sm text-slate-300">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs font-bold">{i + 1}</span>
                {step}
                {i < 4 && <ArrowRight className="h-3 w-3 text-slate-600 ml-1" />}
              </span>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-sm text-slate-500 mt-8">
          <p>Attendance + Punctuality + Tasks + Mentor Evaluation + Analytics + Smart Alerts</p>
        </div>
      </div>

      {/* Right panel — login */}
      <div className="lg:w-1/2 flex items-center justify-center p-6 lg:p-12 bg-slate-50">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold text-slate-900 mb-1">Sign In</h2>
          <p className="text-sm text-slate-500 mb-6">Enter your credentials to access the platform</p>

          <form onSubmit={handleSignIn} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              id="email"
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              id="password"
            />
            <Button type="submit" className="w-full" size="lg" loading={loading}>
              Sign In
            </Button>
          </form>

          <div className="mt-8">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-slate-50 px-3 text-xs text-slate-500 uppercase tracking-wider font-medium">
                  Hackathon Demo Accounts
                </span>
              </div>
            </div>

            <div className="mt-4 space-y-2.5">
              {DEMO_ACCOUNTS.map((acc) => {
                const Icon = acc.icon;
                return (
                  <button
                    key={acc.label}
                    onClick={() => handleDemoLogin(acc.email, acc.label)}
                    disabled={demoLoading !== null}
                    className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-slate-300 hover:shadow-sm transition-all disabled:opacity-50"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100">
                      <Icon className="h-4 w-4 text-slate-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-900">{acc.label}</p>
                      <p className="text-xs text-slate-500">{acc.email}</p>
                    </div>
                    {demoLoading === acc.label ? (
                      <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                    ) : (
                      <ArrowRight className="h-4 w-4 text-slate-400" />
                    )}
                  </button>
                );
              })}
            </div>

            <p className="mt-4 text-center text-xs text-slate-400">
              All demo accounts use password: <span className="font-mono font-medium text-slate-500">demo1234</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
