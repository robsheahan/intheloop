import { useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/context/AuthContext';
import { useCategories } from '@/hooks/useCategories';
import { supabase } from '@/lib/supabase/client';
import { getCategoryIcon } from '@/lib/category-icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Switch } from '@/components/ui/Switch';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

export default function SettingsScreen() {
  const { profile, refreshProfile, signOut } = useAuth();
  const { data: categories } = useCategories();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [defaultCity, setDefaultCity] = useState(profile?.default_city || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleUpdateProfile = async () => {
    setIsSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, default_city: defaultCity || null })
      .eq('id', profile!.id);

    if (error) {
      Alert.alert('Error', 'Failed to update profile');
    } else {
      Alert.alert('Success', 'Profile updated');
      await refreshProfile();
    }
    setIsSaving(false);
  };

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView className="flex-1 px-4">
        <Text className="text-2xl font-bold text-foreground mt-2 mb-4">Settings</Text>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
          </CardHeader>
          <CardContent className="gap-3">
            <Input
              label="Email"
              value={profile?.email || ''}
              editable={false}
              className="opacity-60"
            />
            <Input
              label="Full name"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your name"
            />
            <Input
              label="Default city"
              value={defaultCity}
              onChangeText={setDefaultCity}
              placeholder="e.g. Melbourne"
            />
            <Button onPress={handleUpdateProfile} loading={isSaving}>
              Save changes
            </Button>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader>
            <CardTitle>Account</CardTitle>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onPress={handleSignOut}>
              Sign out
            </Button>
          </CardContent>
        </Card>

        <View className="pb-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
