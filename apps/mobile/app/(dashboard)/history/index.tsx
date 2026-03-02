import { useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Clock } from 'lucide-react-native';
import { useAlertHistory, useMarkSeen } from '@/hooks/useAlerts';
import { successNotification } from '@/lib/haptics';
import { AlertCard } from '@/components/AlertCard';
import { AlertHistory } from '@tmw/shared/types/database';
import { AlertCardSkeleton } from '@/components/ui/Skeleton';

const PAGE_SIZE = 30;

export default function HistoryScreen() {
  const [page, setPage] = useState(0);
  const { data, isLoading, refetch } = useAlertHistory(page, PAGE_SIZE);
  const markSeen = useMarkSeen();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const loadMore = () => {
    if (data && (page + 1) * PAGE_SIZE < data.total) {
      setPage((p) => p + 1);
    }
  };

  const renderItem = ({ item }: { item: AlertHistory }) => (
    <View className="px-4 mb-2">
      <AlertCard
        alert={item}
        showCategory
        onMarkSeen={!item.seen_at ? (id) => {
          successNotification();
          markSeen.mutate(id);
        } : undefined}
      />
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-4 mt-4 mb-3">
        <View className="rounded-xl bg-[#2d4a7a] p-5" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 }}>
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 rounded-lg bg-white/10 items-center justify-center">
              <Clock size={22} color="#ff751f" />
            </View>
            <View>
              <Text className="text-xl font-bold text-white">History</Text>
              <Text className="text-sm text-white/70">
                {data ? `${data.total} total alert${data.total !== 1 ? 's' : ''}` : 'Loading alerts...'}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {isLoading && !data ? (
        <View className="px-4 gap-2 mt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <AlertCardSkeleton key={i} />
          ))}
        </View>
      ) : (
        <FlatList
          data={data?.alerts || []}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ff751f" />
          }
          ListEmptyComponent={
            <View className="items-center py-12">
              <Text className="text-muted-foreground">No alerts yet.</Text>
            </View>
          }
          ListFooterComponent={
            data && (page + 1) * PAGE_SIZE < data.total ? (
              <ActivityIndicator size="small" color="#ff751f" className="py-4" />
            ) : null
          }
          contentContainerStyle={{ paddingBottom: 16 }}
        />
      )}
    </SafeAreaView>
  );
}
