import { useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, CheckCheck } from 'lucide-react-native';
import { useCategories } from '@/hooks/useCategories';
import { successNotification } from '@/lib/haptics';
import { useAlerts, useMarkSeen, useMarkAllSeen } from '@/hooks/useAlerts';
import { getCategoryIcon } from '@/lib/category-icons';
import { getCategoryColor } from '@intheloop/shared/utils/category-colors';
import { renderAlertTitle, renderAlertDescription } from '@intheloop/shared/utils/alert-rendering';
import { formatRelativeTime } from '@intheloop/shared/utils/formatting';
import { AlertHistory } from '@intheloop/shared/types/database';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { AlertCardSkeleton } from '@/components/ui/Skeleton';

export default function CategoryDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { data: categories } = useCategories();
  const { data: alerts, isLoading, refetch } = useAlerts(slug);
  const markSeen = useMarkSeen();
  const markAllSeen = useMarkAllSeen();
  const [refreshing, setRefreshing] = useState(false);

  const category = categories?.find((c) => c.slug === slug);
  const Icon = getCategoryIcon(slug || '');
  const color = getCategoryColor(slug || '');
  const unseenCount = (alerts || []).filter((a) => !a.seen_at).length;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderItem = ({ item }: { item: AlertHistory }) => {
    const content = item.content;
    const type = content.type as string;
    const isUnseen = !item.seen_at;

    return (
      <View
        className={`mx-4 mb-2 rounded-xl border p-3 ${
          isUnseen ? 'bg-muted/30 border-primary/20' : 'border-border'
        }`}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-1">
            <Text className="font-medium text-sm text-foreground" numberOfLines={2}>
              {renderAlertTitle(content, type)}
            </Text>
            <Text className="text-xs text-muted-foreground mt-0.5">
              {renderAlertDescription(content, type)}
            </Text>
          </View>
          {isUnseen && (
            <Pressable onPress={() => {
              successNotification();
              markSeen.mutate(item.id);
            }} className="pl-2">
              <Badge className="bg-primary">
                <Text className="text-white text-[10px] font-medium">New</Text>
              </Badge>
            </Pressable>
          )}
        </View>
        <View className="flex-row items-center gap-2 mt-1">
          <Text className="text-[11px] text-muted-foreground">
            {item.tracked_entity?.entity_name}
          </Text>
          <Text className="text-[11px] text-muted-foreground">·</Text>
          <Text className="text-[11px] text-muted-foreground">
            {formatRelativeTime(item.created_at)}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <View className="flex-row items-center gap-2">
          <Pressable onPress={() => router.back()} className="p-1">
            <ArrowLeft size={22} color="#2c2d2f" />
          </Pressable>
          <Icon size={20} color={color} />
          <Text className="text-xl font-bold text-foreground">
            {category?.name || slug}
          </Text>
        </View>
        {unseenCount > 0 && (
          <Button
            variant="ghost"
            onPress={() => slug && markAllSeen.mutate(slug)}
          >
            <CheckCheck size={16} color="#ff751f" />
            <Text className="text-primary text-sm font-medium ml-1">Read all</Text>
          </Button>
        )}
      </View>

      {isLoading ? (
        <View className="px-4 gap-2 mt-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <AlertCardSkeleton key={i} />
          ))}
        </View>
      ) : (
        <FlatList
          data={alerts || []}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ff751f" />
          }
          ListEmptyComponent={
            <View className="items-center py-12">
              <Text className="text-muted-foreground">No alerts for this category.</Text>
            </View>
          }
          contentContainerStyle={{ paddingBottom: 16 }}
        />
      )}
    </SafeAreaView>
  );
}
