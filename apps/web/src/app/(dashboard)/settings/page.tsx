'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { useCategories } from '@/lib/hooks/useCategories';
import { useEmailPreferences, useToggleEmailPreference } from '@/lib/hooks/useEmailPreferences';
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account and notification preferences.
        </p>
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
