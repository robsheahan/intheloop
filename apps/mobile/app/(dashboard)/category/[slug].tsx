import { useState, useCallback, useMemo } from 'react';
import { View, Text, SectionList, Pressable, RefreshControl, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Check, CheckCheck, ExternalLink } from 'lucide-react-native';
import { useCategories } from '@/hooks/useCategories';
import { useAuth } from '@/context/AuthContext';
import { successNotification } from '@/lib/haptics';
import { useAlerts, useMarkSeen, useMarkAllSeen } from '@/hooks/useAlerts';
import { getCategoryIcon } from '@/lib/category-icons';
import { getCategoryColor } from '@tmw/shared/utils/category-colors';
import { getServiceUrl } from '@tmw/shared/utils/service-links';
import { AlertHistory } from '@tmw/shared/types/database';
import { AlertCardSkeleton } from '@/components/ui/Skeleton';

/** Render title without the entity name (since it's shown as the group heading) */
function renderTitle(content: Record<string, unknown>, type: string): string {
  switch (type) {
    case 'music':
      return content.title as string;
    case 'books':
      return content.title as string;
    case 'news':
      return content.title as string;
    case 'crypto':
      return `${content.instrument}: $${content.price}`;
    case 'stocks':
      return `${content.symbol}: $${content.price}`;
    case 'movies':
      return `${content.title} (${content.media_type})`;
    case 'tours':
      return content.title as string;
    case 'github':
      return `${content.repo}: ${content.tag}`;
    case 'steam':
      return `${content.name}: ${content.discount_percent}% off`;
    case 'podcasts':
      return content.episode_title as string;
    case 'weather':
      return `${content.city}: ${content.alert_type} alert`;
    case 'reddit':
      return content.title as string;
    case 'currency':
      return `${content.pair}: ${content.rate}`;
    default:
      return (content.title as string) || 'Alert';
  }
}

function renderDetail(content: Record<string, unknown>, type: string): string {
  switch (type) {
    case 'music':
      return `${content.release_type || 'Release'}${content.release_date ? ' · ' + new Date(content.release_date as string).toLocaleDateString() : ''}`;
    case 'books':
      return content.year ? `Published ${content.year}` : '';
    case 'news':
      return `Source: ${content.source}`;
    case 'crypto':
      return `Price went ${content.direction} target of $${content.target_price}`;
    case 'stocks':
      return `Price went ${content.direction} target of $${content.target_price}`;
    case 'movies':
      return content.release_date ? `Release: ${content.release_date}` : '';
    case 'tours':
      return [
        content.date ? new Date(content.date as string).toLocaleDateString() : '',
        content.country as string || '',
      ].filter(Boolean).join(' · ');
    case 'github':
      return (content.release_name as string) || '';
    case 'steam':
      return `$${content.original_price} → $${content.sale_price}`;
    case 'podcasts':
      return content.podcast_name as string || '';
    case 'weather':
      return `Value: ${content.value}, Threshold: ${content.threshold}`;
    case 'reddit':
      return `r/${content.subreddit} · Score: ${content.score}`;
    case 'currency':
      return `Rate went ${content.direction} target of ${content.target_rate}`;
    default:
      return (content.description as string) || '';
  }
}

function getContentDate(a: AlertHistory): number {
  const c = a.content;
  if (c.release_date) return new Date(c.release_date as string).getTime();
  if (c.year) return new Date(`${c.year}-01-01`).getTime();
  if (c.date) return new Date(c.date as string).getTime();
  return new Date(a.created_at).getTime();
}

interface Section {
  title: string;
  isUnseen?: boolean;
  data: AlertHistory[];
}

export default function CategoryDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { profile } = useAuth();
  const { data: categories } = useCategories();
  const { data: alerts, isLoading, refetch } = useAlerts(slug);
  const markSeen = useMarkSeen();
  const markAllSeen = useMarkAllSeen();
  const [refreshing, setRefreshing] = useState(false);

  const category = categories?.find((c) => c.slug === slug);
  const Icon = getCategoryIcon(slug || '');
  const color = getCategoryColor(slug || '');

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const sections = useMemo(() => {
    if (!alerts || alerts.length === 0) return [];

    const unseen = alerts.filter((a) => !a.seen_at);
    const seen = alerts.filter((a) => a.seen_at);

    const result: Section[] = [];

    if (unseen.length > 0) {
      result.push({
        title: `New (${unseen.length})`,
        isUnseen: true,
        data: [...unseen].sort((a, b) => getContentDate(b) - getContentDate(a)),
      });
    }

    // Group seen by entity
    const entityMap = new Map<string, AlertHistory[]>();
    for (const a of seen) {
      const name = a.tracked_entity?.entity_name || 'Unknown';
      const list = entityMap.get(name) || [];
      list.push(a);
      entityMap.set(name, list);
    }

    const groups = Array.from(entityMap.entries())
      .map(([name, groupAlerts]) => ({
        name,
        alerts: [...groupAlerts].sort((a, b) => getContentDate(b) - getContentDate(a)),
      }))
      .sort((a, b) => getContentDate(b.alerts[0]) - getContentDate(a.alerts[0]));

    for (const group of groups) {
      result.push({ title: group.name, data: group.alerts });
    }

    return result;
  }, [alerts]);

  const unseenCount = (alerts || []).filter((a) => !a.seen_at).length;

  const renderItem = ({ item }: { item: AlertHistory }) => {
    const content = item.content;
    const type = content.type as string;
    const isUnseen = !item.seen_at;
    const url = getServiceUrl(profile?.preferred_service, content, type);

    return (
      <View
        className={`mx-4 mb-1.5 rounded-lg border p-3 ${
          isUnseen ? 'bg-muted/30 border-primary/20' : 'border-border'
        }`}
      >
        <View className="flex-row items-start justify-between">
          <View className="flex-1 mr-2">
            <Text className="font-medium text-sm text-foreground" numberOfLines={2}>
              {renderTitle(content, type)}
            </Text>
            {renderDetail(content, type) ? (
              <Text className="text-xs text-muted-foreground mt-0.5">
                {renderDetail(content, type)}
              </Text>
            ) : null}
          </View>
          <View className="flex-row items-center gap-2">
            {url && (
              <Pressable onPress={() => Linking.openURL(url)} className="p-1">
                <ExternalLink size={14} color="#6b7280" />
              </Pressable>
            )}
            {isUnseen && (
              <Pressable
                onPress={() => {
                  successNotification();
                  markSeen.mutate(item.id);
                }}
                className="flex-row items-center gap-1 px-2 py-1 rounded-md bg-primary/10"
              >
                <Check size={12} color="#ff751f" />
                <Text className="text-[11px] text-primary font-medium">Dismiss</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderSectionHeader = ({ section }: { section: Section }) => (
    <View className="mx-4 mt-3 mb-1.5 rounded-lg px-3 py-2" style={{ backgroundColor: section.isUnseen ? '#ff751f' : '#ff751f' }}>
      <Text className="text-sm font-semibold text-white">
        {section.title}
      </Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-4 mt-4 mb-3">
        <View className="rounded-xl bg-[#2d4a7a] p-5" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 }}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <Pressable onPress={() => router.back()} className="p-1">
                <ArrowLeft size={22} color="#fff" />
              </Pressable>
              <View className="h-10 w-10 rounded-lg bg-white/10 items-center justify-center">
                <Icon size={22} color={color} />
              </View>
              <View>
                <Text className="text-xl font-bold text-white">
                  {category?.name || slug}
                </Text>
                <Text className="text-sm text-white/70">
                  {isLoading
                    ? 'Loading alerts...'
                    : `${(alerts || []).length} alert${(alerts || []).length !== 1 ? 's' : ''}${unseenCount > 0 ? ` · ${unseenCount} new` : ''}`}
                </Text>
              </View>
            </View>
            {unseenCount > 0 && (
              <Pressable
                onPress={() => {
                  successNotification();
                  slug && markAllSeen.mutate(slug);
                }}
                className="flex-row items-center gap-1 px-3 py-1.5"
              >
                <CheckCheck size={16} color="#ff751f" />
                <Text className="text-[#ff751f] text-sm font-medium">Read all</Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {isLoading ? (
        <View className="px-4 gap-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <AlertCardSkeleton key={i} />
          ))}
        </View>
      ) : (
        <SectionList
          sections={sections}
          renderItem={renderItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={false}
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
