import { useEffect, useRef } from 'react';
import { View, Animated } from 'react-native';

interface SkeletonProps {
  className?: string;
}

function SkeletonPulse({ className = '' }: SkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={{ opacity }}
      className={`bg-muted rounded-lg ${className}`}
    />
  );
}

export function AlertCardSkeleton() {
  return (
    <View className="rounded-xl border border-border p-3 gap-2">
      <View className="flex-row items-center gap-2">
        <SkeletonPulse className="w-5 h-5 rounded-full" />
        <SkeletonPulse className="h-4 flex-1 max-w-[60%]" />
      </View>
      <SkeletonPulse className="h-3 w-[80%]" />
      <SkeletonPulse className="h-3 w-[40%]" />
    </View>
  );
}

export function CategoryPillSkeleton() {
  return (
    <View className="flex-row gap-2">
      {[1, 2, 3, 4].map((i) => (
        <SkeletonPulse key={i} className="h-9 w-24 rounded-full" />
      ))}
    </View>
  );
}

export function DashboardSkeleton() {
  return (
    <View className="gap-4">
      <CategoryPillSkeleton />
      <View className="gap-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <AlertCardSkeleton key={i} />
        ))}
      </View>
    </View>
  );
}

export function TrackedSkeleton() {
  return (
    <View className="gap-3">
      {[1, 2, 3, 4].map((i) => (
        <View key={i} className="rounded-xl border border-border p-4">
          <View className="flex-row items-center gap-2">
            <SkeletonPulse className="w-5 h-5 rounded-full" />
            <SkeletonPulse className="h-4 w-32" />
          </View>
        </View>
      ))}
    </View>
  );
}
