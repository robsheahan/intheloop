'use client';

import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { TrackedEntity } from '@tmw/shared/types/database';
import { useRemoveTrackedEntity } from '@/lib/hooks/useTrackedEntities';

interface Props {
  entities: TrackedEntity[];
}

export function EntityList({ entities }: Props) {
  const removeEntity = useRemoveTrackedEntity();

  const handleRemove = async (entity: TrackedEntity) => {
    try {
      await removeEntity.mutateAsync(entity.id);
      toast.success(`Removed "${entity.entity_name}"`);
    } catch {
      toast.error('Failed to remove item');
    }
  };

  if (entities.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-2">
        No items tracked yet. Add one above.
      </p>
    );
  }

  return (
    <ul className="space-y-1 max-h-48 overflow-y-auto">
      {[...entities].sort((a, b) => a.entity_name.localeCompare(b.entity_name)).map((entity) => (
        <li
          key={entity.id}
          className="flex items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted/50"
        >
          <div className="min-w-0">
            <span className="text-sm font-medium">{entity.entity_name}</span>
            {Object.keys(entity.entity_metadata).length > 0 && (
              <span className="ml-2 text-xs text-muted-foreground">
                {Object.values(entity.entity_metadata)
                  .filter(Boolean)
                  .join(', ')}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={() => handleRemove(entity)}
            disabled={removeEntity.isPending}
          >
            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </li>
      ))}
    </ul>
  );
}
