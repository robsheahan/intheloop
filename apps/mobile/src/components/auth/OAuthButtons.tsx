import { useState } from 'react';
import { View, Text, Platform } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { Button } from '@/components/ui/Button';
import { signInWithGoogle, signInWithApple } from '@/lib/auth/oauth';

function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <Path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <Path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <Path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </Svg>
  );
}

function AppleIcon({ size = 18 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <Path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" fill="#000" />
    </Svg>
  );
}

interface OAuthButtonsProps {
  onError: (message: string) => void;
  disabled?: boolean;
}

export function OAuthButtons({ onError, disabled }: OAuthButtonsProps) {
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isAppleLoading, setIsAppleLoading] = useState(false);

  const anyLoading = isGoogleLoading || isAppleLoading;

  const handleGoogle = async () => {
    try {
      setIsGoogleLoading(true);
      await signInWithGoogle();
    } catch (e: any) {
      if (e.message !== 'dismissed') {
        onError(e.message || 'Failed to sign in with Google');
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleApple = async () => {
    try {
      setIsAppleLoading(true);
      await signInWithApple();
    } catch (e: any) {
      if (e.code !== 'ERR_REQUEST_CANCELED') {
        onError(e.message || 'Failed to sign in with Apple');
      }
    } finally {
      setIsAppleLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onPress={handleGoogle}
        loading={isGoogleLoading}
        disabled={disabled || (anyLoading && !isGoogleLoading)}
      >
        <View className="flex-row items-center gap-2">
          <GoogleIcon />
          <Text className="text-base font-semibold text-foreground">
            Continue with Google
          </Text>
        </View>
      </Button>

      {Platform.OS === 'ios' && (
        <Button
          variant="outline"
          onPress={handleApple}
          loading={isAppleLoading}
          disabled={disabled || (anyLoading && !isAppleLoading)}
        >
          <View className="flex-row items-center gap-2">
            <AppleIcon />
            <Text className="text-base font-semibold text-foreground">
              Continue with Apple
            </Text>
          </View>
        </Button>
      )}

      <View className="flex-row items-center">
        <View className="flex-1 h-px bg-border" />
        <Text className="px-3 text-xs text-muted-foreground uppercase">
          or
        </Text>
        <View className="flex-1 h-px bg-border" />
      </View>
    </>
  );
}
