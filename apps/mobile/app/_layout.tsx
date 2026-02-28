import '../global.css';
import { useEffect, useRef } from 'react';
import { Keyboard, View } from 'react-native';
import { Slot, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { addNotificationResponseReceivedListener, type Subscription } from 'expo-notifications';
import { AuthProvider } from '@/context/AuthContext';
import { QueryProvider } from '@/context/QueryProvider';

function NotificationHandler() {
  const router = useRouter();
  const responseListener = useRef<Subscription | null>(null);

  useEffect(() => {
    // Handle notification taps — navigate to dashboard
    responseListener.current = addNotificationResponseReceivedListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.screen === 'dashboard') {
        router.push('/(dashboard)/dashboard');
      } else if (data?.slug) {
        router.push(`/(dashboard)/category/${data.slug}` as never);
      }
    });

    return () => {
      responseListener.current?.remove();
    };
  }, [router]);

  return null;
}

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View
        style={{ flex: 1 }}
        onStartShouldSetResponder={() => {
          Keyboard.dismiss();
          return false;
        }}
      >
        <SafeAreaProvider>
          <QueryProvider>
            <AuthProvider>
              <StatusBar style="auto" />
              <NotificationHandler />
              <Slot />
            </AuthProvider>
          </QueryProvider>
        </SafeAreaProvider>
      </View>
    </GestureHandlerRootView>
  );
}
