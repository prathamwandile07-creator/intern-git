import { useState } from 'react';
import { User, Mail, Phone, Calendar, Building2, Save } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/lib/toast';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';

export function ProfilePage() {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [phone, setPhone] = useState(profile?.phone || '');
  const [bio, setBio] = useState(profile?.bio || '');

  if (!profile) return null;

  const roleLabel = profile.role.charAt(0).toUpperCase() + profile.role.slice(1);

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, phone, bio })
      .eq('id', profile.id);
    if (error) {
      toast('Failed to update profile', 'error');
    } else {
      await refreshProfile();
      toast('Profile updated successfully', 'success');
      setEditing(false);
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl">
      <Card>
        <CardHeader
          title="My Profile"
          subtitle="Your account information"
          action={!editing ? <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit Profile</Button> : undefined}
        />
        <CardBody>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-200 text-2xl font-bold text-slate-600">
              {profile.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">{profile.full_name}</h3>
              <p className="text-sm text-slate-500">{profile.email}</p>
              <Badge variant="blue" className="mt-1.5">{roleLabel}</Badge>
            </div>
          </div>

          {editing ? (
            <div className="space-y-4">
              <Input label="Full Name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
              <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Your phone number" />
              <Textarea label="Bio" rows={3} value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Tell us about yourself..." />
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setEditing(false); setFullName(profile.full_name); setPhone(profile.phone || ''); setBio(profile.bio || ''); }}>Cancel</Button>
                <Button onClick={handleSave} loading={saving}><Save className="h-4 w-4" /> Save Changes</Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                <Mail className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Email</p>
                  <p className="text-sm font-medium text-slate-900">{profile.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                <Phone className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Phone</p>
                  <p className="text-sm font-medium text-slate-900">{profile.phone || 'Not set'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg bg-slate-50 p-3">
                <User className="h-4 w-4 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500">Bio</p>
                  <p className="text-sm font-medium text-slate-900">{profile.bio || 'No bio set'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg bg-slate-50 p-3">
                <Calendar className="h-4 w-4 text-slate-400" />
                <div>
                  <p className="text-xs text-slate-500">Member Since</p>
                  <p className="text-sm font-medium text-slate-900">{new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                </div>
              </div>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
