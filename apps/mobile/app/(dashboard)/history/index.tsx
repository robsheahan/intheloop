import { useState, useCallback } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAlertHistory, useMarkSeen } from '@/hooks/useAlerts';
import { successNotification } from '@/lib/haptics';
import { AlertCard } from '@/components/AlertCard';
import { AlertHistory } from '@intheloop/shared/types/database';
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
      <View className="px-4 mt-2 mb-3">
        <Text className="text-2xl font-bold text-foreground">History</Text>
        {data && (
          <Text className="text-sm text-muted-foreground">
            {data.total} total alert{data.total !== 1 ? 's' : ''}
          </Text>
        )}
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
