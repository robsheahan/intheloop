import { useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings } from 'lucide-react-native';
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
      <View className="px-4 mt-4 mb-3">
        <View className="rounded-xl bg-[#2d4a7a] p-5" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 }}>
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 rounded-lg bg-white/10 items-center justify-center">
              <Settings size={22} color="#ff751f" />
            </View>
            <View>
              <Text className="text-xl font-bold text-white">Settings</Text>
              <Text className="text-sm text-white/70">
                Manage your account and preferences.
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-4">
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
