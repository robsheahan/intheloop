import { useState } from 'react';
import { View, Text, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Settings } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { useCategories } from '@/hooks/useCategories';
import { supabase } from '@/lib/supabase/client';
import { getCategoryIcon } from '@/lib/category-icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Switch } from '@/components/ui/Switch';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

const SERVICE_OPTIONS = [
  { value: 'apple', label: 'Apple Music / Podcasts' },
  { value: 'spotify', label: 'Spotify' },
  { value: 'youtube_music', label: 'YouTube Music' },
  { value: 'amazon_music', label: 'Amazon Music' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const { profile, refreshProfile, signOut, user, isGuest } = useAuth();
  const { data: categories } = useCategories();
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [defaultCity, setDefaultCity] = useState(profile?.default_city || '');
  const [preferredService, setPreferredService] = useState(profile?.preferred_service || 'apple');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleUpdateProfile = async () => {
    setIsSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName, default_city: defaultCity || null, preferred_service: preferredService })
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

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all your data including tracked items, alerts, and preferences. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Account',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you sure?',
              'This is permanent. All your data will be deleted immediately.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete My Account',
                  style: 'destructive',
                  onPress: performDeleteAccount,
                },
              ]
            );
          },
        },
      ]
    );
  };

  const performDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession?.access_token) {
        Alert.alert('Error', 'Not authenticated');
        setIsDeleting(false);
        return;
      }

      const apiUrl = process.env.EXPO_PUBLIC_API_URL;
      const res = await fetch(`${apiUrl}/api/account/delete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${currentSession.access_token}` },
      });

      const data = await res.json();
      if (data.success) {
        await signOut();
        Alert.alert('Account Deleted', 'Your account and all data have been permanently deleted.');
      } else {
        Alert.alert('Error', data.error || 'Failed to delete account');
      }
    } catch {
      Alert.alert('Error', 'Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Guest mode: show sign in / sign up options
  if (isGuest) {
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
                  You're browsing as a guest.
                </Text>
              </View>
            </View>
          </View>
        </View>

        <ScrollView className="flex-1 px-4">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Create an Account</CardTitle>
            </CardHeader>
            <CardContent className="gap-3">
              <Text className="text-sm text-muted-foreground">
                Sign up to start tracking items and receiving personalized alerts for movies, music, stocks, weather, and more.
              </Text>
              <Button onPress={() => router.replace('/(auth)/signup')}>
                Sign Up
              </Button>
              <Button variant="outline" onPress={() => router.replace('/(auth)/login')}>
                Sign In
              </Button>
            </CardContent>
          </Card>
          <View className="pb-8" />
        </ScrollView>
      </SafeAreaView>
    );
  }

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
            <Select
              label="Preferred music service"
              value={preferredService}
              options={SERVICE_OPTIONS}
              onValueChange={setPreferredService}
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
          <CardContent className="gap-3">
            <Button variant="destructive" onPress={handleSignOut}>
              Sign out
            </Button>
            <Button variant="ghost" onPress={handleDeleteAccount} loading={isDeleting}>
              <Text className="text-sm text-destructive font-medium">Delete Account</Text>
            </Button>
          </CardContent>
        </Card>

        <View className="pb-8" />
      </ScrollView>
    </SafeAreaView>
  );
}
