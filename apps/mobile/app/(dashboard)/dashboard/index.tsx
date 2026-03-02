import { useState, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, Pressable, RefreshControl, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, CheckCheck, ChevronRight, LayoutDashboard, Plus, RefreshCw } from 'lucide-react-native';
import { useAuth } from '@/context/AuthContext';
import { selectionChanged, successNotification } from '@/lib/haptics';
import { useOrderedCategories } from '@/hooks/useOrderedCategories';
import { useAlerts, useUnseenCounts, useMarkSeen, useMarkAllSeenGlobal } from '@/hooks/useAlerts';
import { useTrackedEntities, useAddTrackedEntity } from '@/hooks/useTrackedEntities';
import { getCategoryIcon } from '@/lib/category-icons';
import { getCategoryColor } from '@tmw/shared/utils/category-colors';
import { CATEGORY_FORM_CONFIGS } from '@tmw/shared/utils/category-fields';
import { AlertCard } from '@/components/AlertCard';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { Category } from '@tmw/shared/types/database';
import { supabase } from '@/lib/supabase/client';

export default function DashboardScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { data: categories, isLoading: catLoading } = useOrderedCategories();
  const { data: alerts, isLoading: alertsLoading, refetch: refetchAlerts } = useAlerts(undefined, false, 50);
  const { data: unseenCounts, refetch: refetchUnseen } = useUnseenCounts();
  const { data: entities } = useTrackedEntities();
  const markSeen = useMarkSeen();
  const markAllSeen = useMarkAllSeenGlobal();
  const addEntity = useAddTrackedEntity();
  const [refreshing, setRefreshing] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [entityName, setEntityName] = useState('');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});

  const handleSearchAlerts = useCallback(async () => {
    setIsRunning(true);
    try {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      if (!currentSession?.access_token) {
        Alert.alert('Error', 'Not authenticated');
        return;
      }
      const apiUrl = process.env.EXPO_PUBLIC_API_URL;
      const res = await fetch(`${apiUrl}/api/pipelines/run`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${currentSession.access_token}` },
      });
      const data = await res.json();
      if (data.success) {
        const totalNew = Object.values(data.summary as Record<string, { new: number }>)
          .reduce((sum, s) => sum + s.new, 0);
        successNotification();
        await Promise.all([refetchAlerts(), refetchUnseen()]);
        Alert.alert('Done', `${totalNew} new alert${totalNew !== 1 ? 's' : ''} found`);
      } else {
        Alert.alert('Error', data.error || 'Pipeline run failed');
      }
    } catch {
      Alert.alert('Error', 'Failed to search for new alerts');
    } finally {
      setIsRunning(false);
    }
  }, [refetchAlerts, refetchUnseen]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchAlerts(), refetchUnseen()]);
    setRefreshing(false);
  }, [refetchAlerts, refetchUnseen]);

  const handleAdd = (cat: Category) => {
    if (!entityName.trim()) return;
    const config = CATEGORY_FORM_CONFIGS[cat.slug];
    const metadata: Record<string, unknown> = {};
    if (config) {
      for (const field of config.fields) {
        if (fieldValues[field.name]) {
          metadata[field.name] = fieldValues[field.name];
        }
      }
    }
    addEntity.mutate(
      { categoryId: cat.id, entityName: entityName.trim(), entityMetadata: metadata },
      {
        onSuccess: () => {
          setEntityName('');
          setFieldValues({});
          setAddingTo(null);
        },
      }
    );
  };

  const isLoading = catLoading || alertsLoading;

  // Split alerts into unseen and seen
  const unseenAlerts = useMemo(
    () => (alerts || []).filter((a) => !a.seen_at),
    [alerts]
  );
  const seenAlerts = useMemo(
    () => (alerts || []).filter((a) => a.seen_at),
    [alerts]
  );

  // Group seen alerts by category slug
  const seenByCategory = useMemo(
    () =>
      seenAlerts.reduce<Record<string, typeof seenAlerts>>((acc, a) => {
        const slug = a.tracked_entity?.category?.slug;
        if (slug) {
          if (!acc[slug]) acc[slug] = [];
          acc[slug]!.push(a);
        }
        return acc;
      }, {}),
    [seenAlerts]
  );

  // Group unseen alerts by category slug
  const unseenByCategory = useMemo(
    () =>
      unseenAlerts.reduce<Record<string, typeof unseenAlerts>>((acc, a) => {
        const slug = a.tracked_entity?.category?.slug;
        if (slug) {
          if (!acc[slug]) acc[slug] = [];
          acc[slug]!.push(a);
        }
        return acc;
      }, {}),
    [unseenAlerts]
  );

  const totalUnseen = useMemo(() => {
    if (!unseenCounts) return 0;
    return Object.values(unseenCounts).reduce((a, b) => a + b, 0);
  }, [unseenCounts]);

  const entitiesCountByCategory = (entities || []).reduce<Record<string, number>>((acc, e) => {
    acc[e.category_id] = (acc[e.category_id] || 0) + 1;
    return acc;
  }, {});

  const activeCategories = (categories || []).filter(
    (c: Category) => (entitiesCountByCategory[c.id] || 0) > 0
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView
        className="flex-1 px-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ff751f" />
        }
      >
        {/* Header */}
        <View className="rounded-xl bg-[#2d4a7a] p-5 mt-4 mb-4" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 }}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <View className="h-10 w-10 rounded-lg bg-white/10 items-center justify-center">
                <LayoutDashboard size={22} color="#ff751f" />
              </View>
              <View>
                <Text className="text-xl font-bold text-white">
                  {profile?.full_name ? `Hi, ${profile.full_name.split(' ')[0]}` : 'Dashboard'}
                </Text>
                <Text className="text-sm text-white/70">
                  {totalUnseen > 0
                    ? `${totalUnseen} new alert${totalUnseen !== 1 ? 's' : ''}`
                    : 'You\u2019re all caught up.'}
                </Text>
              </View>
            </View>
            {totalUnseen > 0 && (
              <Pressable
                onPress={() => {
                  successNotification();
                  markAllSeen.mutate();
                }}
                className="flex-row items-center gap-1 px-3 py-1.5"
              >
                <CheckCheck size={16} color="#ff751f" />
                <Text className="text-[#ff751f] text-sm font-medium">Read all</Text>
              </Pressable>
            )}
          </View>
        </View>

        <Pressable
          onPress={handleSearchAlerts}
          disabled={isRunning}
          className="flex-row items-center justify-center gap-2 mb-4 py-3 rounded-xl"
          style={{
            backgroundColor: isRunning ? '#cc5e19' : '#ff751f',
            shadowColor: '#ff751f',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 6,
            elevation: 4,
            opacity: isRunning ? 0.8 : 1,
          }}
        >
          {isRunning ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <RefreshCw size={18} color="#fff" />
          )}
          <Text className="text-white font-semibold text-base">
            {isRunning ? 'Searching...' : 'Search new alerts'}
          </Text>
        </Pressable>

        {isLoading ? (
          <DashboardSkeleton />
        ) : activeCategories.length === 0 ? (
          <Card>
            <CardContent>
              <View className="items-center py-8">
                <Text className="text-muted-foreground text-center">
                  No tracked items yet. Start tracking to see alerts here!
                </Text>
              </View>
            </CardContent>
          </Card>
        ) : (
          <View className="gap-4 pb-8">
            {/* New Events section — only if unseen alerts exist */}
            {unseenAlerts.length > 0 && (
              <Card className="border-primary/20">
                <CardHeader className="mb-2">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <Bell size={16} color="#ff751f" />
                      <Text className="text-base font-semibold text-foreground">New Events</Text>
                      <Badge className="bg-primary">
                        <Text className="text-white text-[10px] font-medium">{unseenAlerts.length}</Text>
                      </Badge>
                    </View>
                  </View>
                </CardHeader>
                <CardContent className="gap-2">
                  {unseenAlerts.map((a) => (
                    <AlertCard
                      key={a.id}
                      alert={a}
                      showCategory
                      onMarkSeen={(id) => {
                        successNotification();
                        markSeen.mutate(id);
                      }}
                    />
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Category cards with recent alerts */}
            {activeCategories.map((cat: Category) => {
              const Icon = getCategoryIcon(cat.slug);
              const color = getCategoryColor(cat.slug);
              const catUnseen = unseenByCategory[cat.slug] || [];
              const catSeen = (seenByCategory[cat.slug] || []).slice(0, 3);
              const unseenCount = unseenCounts?.[cat.slug] || 0;

              return (
                <Card key={cat.id}>
                  <CardHeader className="mb-2">
                    <Pressable
                      onPress={() => {
                        selectionChanged();
                        router.push(`/(dashboard)/category/${cat.slug}` as never);
                      }}
                      className="flex-row items-center justify-between"
                    >
                      <View className="flex-row items-center gap-2">
                        <Icon size={16} color={color} />
                        <Text className="text-base font-semibold text-foreground">{cat.name}</Text>
                        {unseenCount > 0 && (
                          <Badge className="bg-primary">
                            <Text className="text-white text-[10px] font-medium">{unseenCount}</Text>
                          </Badge>
                        )}
                      </View>
                      <ChevronRight size={16} color="#6b7280" />
                    </Pressable>
                  </CardHeader>
                  <CardContent className="gap-2">
                    {catSeen.length > 0 ? (
                      catSeen.map((a) => (
                        <AlertCard key={a.id} alert={a} />
                      ))
                    ) : catUnseen.length === 0 ? (
                      <Text className="text-xs text-muted-foreground py-1">
                        No recent alerts.
                      </Text>
                    ) : null}

                    {addingTo === cat.id ? (() => {
                      const config = CATEGORY_FORM_CONFIGS[cat.slug];
                      return (
                        <View className="mt-2 gap-3">
                          <Input
                            label={config?.entityLabel || 'Name'}
                            value={entityName}
                            onChangeText={setEntityName}
                            placeholder={config?.entityPlaceholder || 'Enter name'}
                          />
                          {config?.fields.map((field) => {
                            if (field.type === 'select' && field.options) {
                              return (
                                <Select
                                  key={field.name}
                                  label={field.label}
                                  value={fieldValues[field.name] || ''}
                                  options={field.options}
                                  onValueChange={(val) =>
                                    setFieldValues((prev) => ({ ...prev, [field.name]: val }))
                                  }
                                />
                              );
                            }
                            if (field.type === 'number' || field.type === 'text') {
                              return (
                                <Input
                                  key={field.name}
                                  label={field.label}
                                  value={fieldValues[field.name] || ''}
                                  onChangeText={(val) =>
                                    setFieldValues((prev) => ({ ...prev, [field.name]: val }))
                                  }
                                  placeholder={field.placeholder}
                                  keyboardType={field.type === 'number' ? 'numeric' : 'default'}
                                />
                              );
                            }
                            return null;
                          })}
                          <View className="flex-row gap-2">
                            <Button
                              onPress={() => handleAdd(cat)}
                              loading={addEntity.isPending}
                              className="flex-1"
                            >
                              Add
                            </Button>
                            <Button
                              variant="outline"
                              onPress={() => {
                                setAddingTo(null);
                                setEntityName('');
                                setFieldValues({});
                              }}
                              className="flex-1"
                            >
                              Cancel
                            </Button>
                          </View>
                        </View>
                      );
                    })() : (
                      <View className="flex-row items-center justify-between mt-1">
                        <Pressable
                          onPress={() => {
                            selectionChanged();
                            router.push(`/(dashboard)/category/${cat.slug}` as never);
                          }}
                        >
                          <Text className="text-xs text-muted-foreground">View all</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => {
                            setAddingTo(cat.id);
                            setEntityName('');
                            const config = CATEGORY_FORM_CONFIGS[cat.slug];
                            const prefill: Record<string, string> = {};
                            if (config?.fields.some((f) => f.name === 'city') && profile?.default_city) {
                              prefill.city = profile.default_city;
                            }
                            setFieldValues(prefill);
                          }}
                          className="flex-row items-center gap-1"
                        >
                          <Plus size={14} color="#ff751f" />
                          <Text className="text-xs text-primary font-medium">Add item</Text>
                        </Pressable>
                      </View>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
