import { useState, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, Pressable, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Trash2, Plus, ChevronDown, ChevronUp, Radar } from 'lucide-react-native';
import { useOrderedCategories } from '@/hooks/useOrderedCategories';
import { mediumImpact, selectionChanged } from '@/lib/haptics';
import { useTrackedEntities, useAddTrackedEntity, useRemoveTrackedEntity } from '@/hooks/useTrackedEntities';
import { getCategoryIcon } from '@/lib/category-icons';
import { getCategoryColor } from '@intheloop/shared/utils/category-colors';
import { CATEGORY_FORM_CONFIGS } from '@intheloop/shared/utils/category-fields';
import { useAuth } from '@/context/AuthContext';
import { Category, TrackedEntity } from '@intheloop/shared/types/database';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { TrackedSkeleton } from '@/components/ui/Skeleton';

export default function TrackedScreen() {
  const { profile } = useAuth();
  const { data: categories, isLoading: catLoading } = useOrderedCategories();
  const { data: allEntities, isLoading: entitiesLoading, refetch: refetchEntities } = useTrackedEntities();
  const addEntity = useAddTrackedEntity();
  const removeEntity = useRemoveTrackedEntity();
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [entityName, setEntityName] = useState('');
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchEntities();
    setRefreshing(false);
  }, [refetchEntities]);

  const handleAdd = async (cat: Category) => {
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

  const handleRemove = (entity: TrackedEntity) => {
    Alert.alert('Remove item', `Remove "${entity.entity_name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: () => {
          mediumImpact();
          removeEntity.mutate(entity.id);
        },
      },
    ]);
  };

  const isLoading = catLoading || entitiesLoading;

  const entitiesByCat = useMemo(() => {
    const map: Record<string, TrackedEntity[]> = {};
    for (const e of allEntities || []) {
      if (!map[e.category_id]) map[e.category_id] = [];
      map[e.category_id].push(e);
    }
    return map;
  }, [allEntities]);

  const allCats = categories || [];
  const trackedCats = useMemo(
    () => allCats
      .filter((cat) => (entitiesByCat[cat.id] || []).length > 0)
      .sort((a, b) => (entitiesByCat[b.id] || []).length - (entitiesByCat[a.id] || []).length),
    [allCats, entitiesByCat]
  );
  const untrackedCats = useMemo(
    () => allCats
      .filter((cat) => (entitiesByCat[cat.id] || []).length === 0)
      .sort((a, b) => a.name.localeCompare(b.name)),
    [allCats, entitiesByCat]
  );

  const renderCard = (cat: Category) => {
    const Icon = getCategoryIcon(cat.slug);
    const color = getCategoryColor(cat.slug);
    const catEntities = entitiesByCat[cat.id] || [];
    const isExpanded = expandedCategory === cat.id;
    const isAdding = addingTo === cat.id;
    const config = CATEGORY_FORM_CONFIGS[cat.slug];

    return (
      <Card key={cat.id}>
        <Pressable
          onPress={() => {
            selectionChanged();
            setExpandedCategory(isExpanded ? null : cat.id);
          }}
          className="flex-row items-center justify-between"
        >
          <View className="flex-row items-center gap-2">
            <Icon size={18} color={color} />
            <CardTitle>{cat.name}</CardTitle>
            <Text className="text-sm text-muted-foreground">
              ({catEntities.length})
            </Text>
          </View>
          {isExpanded ? (
            <ChevronUp size={18} color="#6b7280" />
          ) : (
            <ChevronDown size={18} color="#6b7280" />
          )}
        </Pressable>

        {isExpanded && (
          <CardContent className="mt-3">
            {catEntities.map((entity) => (
              <View
                key={entity.id}
                className="flex-row items-center justify-between py-2 border-b border-border/50"
              >
                <View className="flex-1">
                  <Text className="text-sm text-foreground">{entity.entity_name}</Text>
                  {Object.keys(entity.entity_metadata || {}).length > 0 && (
                    <Text className="text-xs text-muted-foreground">
                      {Object.values(entity.entity_metadata)
                        .filter(Boolean)
                        .join(', ')}
                    </Text>
                  )}
                </View>
                <Pressable onPress={() => handleRemove(entity)} className="p-2">
                  <Trash2 size={16} color="#ef4444" />
                </Pressable>
              </View>
            ))}

            {isAdding ? (
              <View className="mt-3 gap-3">
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
            ) : (
              <Pressable
                onPress={() => {
                  setAddingTo(cat.id);
                  setEntityName('');
                  const prefill: Record<string, string> = {};
                  if (config?.fields.some((f) => f.name === 'city') && profile?.default_city) {
                    prefill.city = profile.default_city;
                  }
                  setFieldValues(prefill);
                }}
                className="flex-row items-center gap-1 mt-3"
              >
                <Plus size={16} color="#ff751f" />
                <Text className="text-sm text-primary font-medium">Add item</Text>
              </Pressable>
            )}
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <ScrollView
        className="flex-1 px-4"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ff751f" />
        }
      >
        <View className="rounded-xl bg-[#2d4a7a] p-5 mt-4 mb-4" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 6 }}>
          <View className="flex-row items-center gap-3">
            <View className="h-10 w-10 rounded-lg bg-white/10 items-center justify-center">
              <Radar size={22} color="#ff751f" />
            </View>
            <View>
              <Text className="text-xl font-bold text-white">Tracked Items</Text>
              <Text className="text-sm text-white/70">
                {(allEntities || []).length > 0
                  ? `Tracking ${(allEntities || []).length} item${(allEntities || []).length === 1 ? '' : 's'} across your categories.`
                  : 'Add items to start getting alerts.'}
              </Text>
            </View>
          </View>
        </View>

        {isLoading ? (
          <TrackedSkeleton />
        ) : (
          <View className="gap-3 pb-8">
            {trackedCats.length > 0 && (
              <>
                <Text className="text-sm font-medium text-muted-foreground">Tracking</Text>
                {trackedCats.map(renderCard)}
              </>
            )}

            {untrackedCats.length > 0 && (
              <>
                <Text className="text-sm font-medium text-muted-foreground mt-2">Not tracking</Text>
                {untrackedCats.map(renderCard)}
              </>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
