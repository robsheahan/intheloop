'use client';

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';

interface SortableCardGridProps<T extends { id: string }> {
  items: T[];
  onReorder: (reorderedItems: T[]) => void;
  renderCard: (item: T) => React.ReactNode;
}

export function SortableCardGrid<T extends { id: string }>({
  items,
  onReorder,
  renderCard,
}: SortableCardGridProps<T>) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(items, oldIndex, newIndex);
    onReorder(reordered);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={rectSortingStrategy}>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => renderCard(item))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
