import { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, Alert } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Logo } from '@/components/Logo';
import { OAuthButtons } from '@/components/auth/OAuthButtons';

export default function SignupScreen() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = async () => {
    if (!email || !password) {
      setError('Please enter email and password');
      return;
    }

    setLoading(true);
    setError('');

    const { error: authError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() || null },
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else {
      Alert.alert(
        'Check your email',
        'We sent you a confirmation link. Please confirm your email to continue.',
        [{ text: 'OK', onPress: () => router.replace('/(auth)/login') }]
      );
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}
          keyboardShouldPersistTaps="handled"
          className="px-6"
        >
          <View className="items-center mb-8">
            <Logo height={120} />
            <Text className="text-sm text-muted-foreground mt-3">
              Create your account
            </Text>
          </View>

          <View className="gap-4">
            <OAuthButtons
              onError={(msg) => setError(msg)}
              disabled={loading}
            />

            <Input
              label="Full name"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your name"
              autoComplete="name"
            />

            <Input
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <Input
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Choose a password"
              secureTextEntry
              autoComplete="new-password"
            />

            {error ? (
              <Text className="text-sm text-destructive">{error}</Text>
            ) : null}

            <Button onPress={handleSignup} loading={loading}>
              Create account
            </Button>

            <View className="flex-row justify-center mt-2">
              <Text className="text-sm text-muted-foreground">
                Already have an account?{' '}
              </Text>
              <Link href="/(auth)/login" asChild>
                <Text className="text-sm text-primary font-medium">Sign in</Text>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
