'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useCategories } from '@/lib/hooks/useCategories';
import { useEmailPreferences, useToggleEmailPreference } from '@/lib/hooks/useEmailPreferences';
import { Settings } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { getCategoryIcon } from '@/lib/utils/categories';
import { AutocompleteInput } from '@/components/shared/AutocompleteInput';

export default function SettingsPage() {
  const { profile, refreshProfile } = useAuth();
  const { data: categories } = useCategories();
  const { data: emailPrefs } = useEmailPreferences();
  const toggleEmail = useToggleEmailPreference();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [defaultCity, setDefaultCity] = useState(profile?.default_city || '');
  const [citySelected, setCitySelected] = useState(!!profile?.default_city);
  const [isSaving, setIsSaving] = useState(false);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    const supabase = createClient();
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, default_city: citySelected ? defaultCity : null })
      .eq('id', profile!.id);

    if (error) {
      toast.error('Failed to update profile');
    } else {
      toast.success('Profile updated');
      await refreshProfile();
    }
    setIsSaving(false);
  };

  const getEmailEnabled = (catId: string) => {
    return emailPrefs?.find((p) => p.category_id === catId)?.enabled ?? false;
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-[oklch(0.38_0.10_250)] to-[oklch(0.30_0.08_250)] p-6 shadow-lg">
        <div className="absolute -right-6 -top-6 h-32 w-32 rounded-full bg-[#ff751f]/15 blur-2xl" />
        <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-[oklch(0.52_0.11_250)]/20 blur-xl" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/10 backdrop-blur-sm">
            <Settings className="h-6 w-6 text-[#ff751f]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Settings</h1>
            <p className="text-sm text-white/70">
              Manage your account and notification preferences.
            </p>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={profile?.email || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fullName">Full name</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultCity">Default city</Label>
              <AutocompleteInput
                value={defaultCity}
                onChange={(val) => {
                  setDefaultCity(val);
                  if (!val) setCitySelected(false);
                }}
                placeholder="e.g. Melbourne"
                categorySlug="cities"
                onSelectionChange={setCitySelected}
              />
              <p className="text-xs text-muted-foreground">
                Pre-fills the city field when tracking tours
              </p>
            </div>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save changes'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Enable email alerts for categories you want notifications for.
          </p>
          <Separator />
          {(categories || []).map((cat) => {
            const Icon = getCategoryIcon(cat.slug);
            return (
              <div key={cat.id} className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{cat.name}</span>
                </div>
                <Switch
                  checked={getEmailEnabled(cat.id)}
                  onCheckedChange={(checked) =>
                    toggleEmail.mutate({ categoryId: cat.id, enabled: checked })
                  }
                />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
