import { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CheckCheck } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { selectionChanged, successNotification } from '@/lib/haptics';
import { useOrderedCategories } from '@/hooks/useOrderedCategories';
import { useAlerts, useUnseenCounts, useMarkSeen, useMarkAllSeenGlobal } from '@/hooks/useAlerts';
import { useTrackedEntities } from '@/hooks/useTrackedEntities';
import { getCategoryIcon } from '@/lib/category-icons';
import { getCategoryColor } from '@intheloop/shared/utils/category-colors';
import { AlertCard } from '@/components/AlertCard';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { Category } from '@intheloop/shared/types/database';

export default function DashboardScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { data: categories, isLoading: catLoading } = useOrderedCategories();
  const { data: alerts, isLoading: alertsLoading, refetch: refetchAlerts } = useAlerts(undefined, false, 50);
  const { data: unseenCounts, refetch: refetchUnseen } = useUnseenCounts();
  const { data: entities } = useTrackedEntities();
  const markSeen = useMarkSeen();
  const markAllSeen = useMarkAllSeenGlobal();
  const [refreshing, setRefreshing] = useState(false);

  const totalUnseen = useMemo(() => {
    if (!unseenCounts) return 0;
    return Object.values(unseenCounts).reduce((a, b) => a + b, 0);
  }, [unseenCounts]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchAlerts(), refetchUnseen()]);
    setRefreshing(false);
  }, [refetchAlerts, refetchUnseen]);

  const isLoading = catLoading || alertsLoading;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView
        className="flex-1 px-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ff751f" />
        }
      >
        <View className="flex-row items-center justify-between mt-2 mb-4">
          <View>
            <Text className="text-2xl font-bold text-foreground">
              {profile?.full_name ? `Hi, ${profile.full_name.split(' ')[0]}` : 'Dashboard'}
            </Text>
            {totalUnseen > 0 && (
              <Text className="text-sm text-muted-foreground">
                {totalUnseen} new alert{totalUnseen !== 1 ? 's' : ''}
              </Text>
            )}
          </View>
          {totalUnseen > 0 && (
            <Button
              variant="ghost"
              onPress={() => markAllSeen.mutate()}
            >
              <CheckCheck size={18} color="#ff751f" />
              <Text className="text-primary text-sm font-medium ml-1">Mark all read</Text>
            </Button>
          )}
        </View>

        {/* Category pills */}
        {categories && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-4">
            <View className="flex-row gap-2">
              {categories.map((cat: Category) => {
                const Icon = getCategoryIcon(cat.slug);
                const color = getCategoryColor(cat.slug);
                const count = unseenCounts?.[cat.slug] || 0;
                const entityCount = entities?.filter(e => e.category_id === cat.id).length || 0;

                if (entityCount === 0) return null;

                return (
                  <Pressable
                    key={cat.id}
                    onPress={() => {
                      selectionChanged();
                      router.push(`/(dashboard)/category/${cat.slug}` as never);
                    }}
                    className="flex-row items-center gap-1.5 bg-card border border-border rounded-full px-3 py-2"
                  >
                    <Icon size={14} color={color} />
                    <Text className="text-sm text-foreground">{cat.name}</Text>
                    {count > 0 && (
                      <Badge className="bg-primary ml-1">
                        <Text className="text-white text-[10px] font-medium">{count}</Text>
                      </Badge>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* Alerts feed */}
        {isLoading ? (
          <DashboardSkeleton />
        ) : (
          <View className="gap-2 pb-8">
            {(alerts || []).length === 0 ? (
              <View className="items-center py-12">
                <Text className="text-muted-foreground text-center">
                  No alerts yet. Track some items to get started!
                </Text>
              </View>
            ) : (
              (alerts || []).map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  showCategory
                  onMarkSeen={!alert.seen_at ? (id) => {
                    successNotification();
                    markSeen.mutate(id);
                  } : undefined}
                />
              ))
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
