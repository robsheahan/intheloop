import { View, Text, Pressable, Linking } from 'react-native';
import { Check } from 'lucide-react-native';
import { AlertHistory } from '@tmw/shared/types/database';
import { formatRelativeTime } from '@tmw/shared/utils/formatting';
import { renderAlertTitle, renderAlertDescription } from '@tmw/shared/utils/alert-rendering';
import { getCategoryColor } from '@tmw/shared/utils/category-colors';
import { getServiceUrl } from '@tmw/shared/utils/service-links';
import { getCategoryIcon } from '@/lib/category-icons';

interface Props {
  alert: AlertHistory;
  onMarkSeen?: (id: string) => void;
  showCategory?: boolean;
  preferredService?: string | null;
}

export function AlertCard({ alert, onMarkSeen, showCategory = false, preferredService }: Props) {
  const content = alert.content;
  const type = content.type as string;
  const isUnseen = !alert.seen_at;
  const categorySlug = alert.tracked_entity?.category?.slug || '';
  const Icon = getCategoryIcon(categorySlug);
  const color = getCategoryColor(categorySlug);

  const url = getServiceUrl(preferredService, content, type);

  return (
    <View
      className={`rounded-xl border p-3 ${
        isUnseen ? 'bg-muted/30 border-primary/20' : 'border-border'
      }`}
    >
      <View className="flex-row items-start justify-between gap-2">
        <View className="flex-row items-center gap-2 flex-1">
          {showCategory && (
            <Icon size={14} color={color} />
          )}
          <Text className="font-medium text-sm text-foreground flex-1" numberOfLines={1}>
            {renderAlertTitle(content, type)}
          </Text>
        </View>
        {isUnseen && onMarkSeen && (
          <Pressable
            onPress={() => onMarkSeen(alert.id)}
            className="flex-row items-center gap-1 px-2 py-1 rounded-md bg-primary/10"
          >
            <Check size={12} color="#ff751f" />
            <Text className="text-[11px] text-primary font-medium">Dismiss</Text>
          </Pressable>
        )}
      </View>

      <Text className="text-xs text-muted-foreground mt-1">
        {renderAlertDescription(content, type)}
      </Text>

      <View className="flex-row items-center gap-2 mt-1">
        <Text className="text-[11px] text-muted-foreground">
          {alert.tracked_entity?.entity_name}
        </Text>
        <Text className="text-[11px] text-muted-foreground">·</Text>
        <Text className="text-[11px] text-muted-foreground">
          {formatRelativeTime(alert.created_at)}
        </Text>
        {url && (
          <>
            <Text className="text-[11px] text-muted-foreground">·</Text>
            <Pressable onPress={() => Linking.openURL(url)}>
              <Text className="text-[11px] text-primary">View</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}
