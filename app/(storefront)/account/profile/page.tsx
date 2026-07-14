'use client';

import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const { setTheme } = useTheme();
  const [name, setName] = useState(session?.user?.name || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');

  async function saveProfile() {
    const res = await fetch('/api/account/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    if (res.ok) {
      await update({ name });
      toast.success('Profile updated');
    } else {
      const data = await res.json();
      toast.error(data.error || 'Failed to save');
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.');
      return;
    }
    const res = await fetch('/api/account/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success('Password updated');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      toast.error(data.error || 'Failed to update password');
    }
  }

  async function saveTheme(value: 'LIGHT' | 'DARK' | 'SYSTEM') {
    const themeMap = { LIGHT: 'light', DARK: 'dark', SYSTEM: 'system' } as const;
    setTheme(themeMap[value]);
    await fetch('/api/account/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ themePreference: value }),
    });
  }

  async function requestDeletion() {
    if (!confirm('Permanently delete your account and personal data? This cannot be undone.')) return;
    const res = await fetch('/api/account/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ confirm: true, password: deletePassword || undefined }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success('Account deleted');
      await signOut({ callbackUrl: '/' });
    } else {
      toast.error(data.error || 'Deletion failed');
    }
  }

  return (
    <div className="container mx-auto max-w-lg px-4 py-8">
      <h1 className="text-2xl font-bold">Profile</h1>
      <div className="mt-6 space-y-4">
        <div>
          <Label>Full name</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Email</Label>
          <Input value={session?.user?.email || ''} disabled />
        </div>
        <div>
          <Label>Appearance</Label>
          <div className="mt-2 flex gap-2">
            {(['LIGHT', 'DARK', 'SYSTEM'] as const).map((t) => (
              <Button key={t} variant="outline" size="sm" onClick={() => saveTheme(t)}>
                {t.charAt(0) + t.slice(1).toLowerCase()}
              </Button>
            ))}
          </div>
        </div>
        <Button onClick={saveProfile}>Save changes</Button>
      </div>

      <form onSubmit={changePassword} className="mt-12 space-y-4 rounded-lg border p-4">
        <h2 className="font-semibold">Change password</h2>
        <div>
          <Label>Current password</Label>
          <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
        </div>
        <div>
          <Label>New password</Label>
          <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={8} />
        </div>
        <div>
          <Label>Confirm new password</Label>
          <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
        </div>
        <Button type="submit">Update password</Button>
      </form>

      <div className="mt-12 rounded-lg border border-destructive/30 p-4">
        <h2 className="font-semibold text-destructive">Delete account</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Permanently remove your account and personal data. Order records may be retained in anonymized form.
        </p>
        <div className="mt-4">
          <Label>Current password (required for email accounts)</Label>
          <Input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} className="mt-1" />
        </div>
        <Button variant="destructive" className="mt-4" onClick={requestDeletion}>Delete my account</Button>
      </div>
    </div>
  );
}
