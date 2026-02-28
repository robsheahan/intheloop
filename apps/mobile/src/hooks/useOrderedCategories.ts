import { useMemo } from 'react';
import { useCategories } from './useCategories';
import { useCategoryOrder } from './useCategoryOrder';
import { Category } from '@intheloop/shared/types/database';

export function useOrderedCategories() {
  const { data: categories, isLoading: catLoading, isError: catError } = useCategories();
  const { data: categoryOrder, isLoading: orderLoading } = useCategoryOrder();

  const orderedCategories = useMemo(() => {
    if (!categories) return undefined;
    if (!categoryOrder || categoryOrder.length === 0) {
      return categories;
    }

    const positionMap = new Map(
      categoryOrder.map((co) => [co.category_id, co.position])
    );

    return [...categories].sort((a: Category, b: Category) => {
      const posA = positionMap.get(a.id);
      const posB = positionMap.get(b.id);
      if (posA !== undefined && posB !== undefined) return posA - posB;
      if (posA !== undefined) return -1;
      if (posB !== undefined) return 1;
      return a.sort_order - b.sort_order;
    });
  }, [categories, categoryOrder]);

  return {
    data: orderedCategories,
    isLoading: catLoading || orderLoading,
    isError: catError,
  };
}
