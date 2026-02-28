'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Category } from '@intheloop/shared/types/database';
import { useAddTrackedEntity } from '@/lib/hooks/useTrackedEntities';
import { CATEGORY_FORM_CONFIGS } from '@intheloop/shared/utils/category-fields';
import { AutocompleteInput } from '@/components/shared/AutocompleteInput';
import { useAuth } from '@/context/AuthContext';

const AUTOCOMPLETE_CATEGORIES = new Set([
  'music', 'tours', 'books', 'crypto', 'stocks', 'movies',
  'github', 'steam', 'podcasts', 'weather', 'currency',
]);

const STRICT_AUTOCOMPLETE_CATEGORIES = new Set([
  'crypto', 'stocks', 'currency', 'github',
]);

interface Props {
  category: Category;
  onSuccess?: () => void;
}

export function AddEntityForm({ category, onSuccess }: Props) {
  const config = CATEGORY_FORM_CONFIGS[category.slug];
  const isStrict = STRICT_AUTOCOMPLETE_CATEGORIES.has(category.slug);
  const { profile } = useAuth();
  const hasCityField = config?.fields.some((f) => f.name === 'city');
  const prefillCity = hasCityField && profile?.default_city ? profile.default_city : '';
  const [entityName, setEntityName] = useState('');
  const [metadata, setMetadata] = useState<Record<string, string>>(
    prefillCity ? { city: prefillCity } : {}
  );
  const [entitySelected, setEntitySelected] = useState(false);
  const [fieldSelected, setFieldSelected] = useState<Record<string, boolean>>(
    prefillCity ? { city: true } : {}
  );
  const addEntity = useAddTrackedEntity();

  if (!config) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entityName.trim()) return;

    if (isStrict && !entitySelected) {
      toast.error('Please select an item from the dropdown');
      return;
    }

    const parsedMetadata: Record<string, unknown> = {};
    for (const field of config.fields) {
      const val = metadata[field.name];
      if (field.required && !val) {
        toast.error(`${field.label} is required`);
        return;
      }
      if (field.type === 'autocomplete' && field.required && !fieldSelected[field.name]) {
        toast.error(`Please select ${field.label.toLowerCase()} from the dropdown`);
        return;
      }
      if (val) {
        parsedMetadata[field.name] = field.type === 'number' ? parseFloat(val) : val;
      }
    }

    try {
      await addEntity.mutateAsync({
        categoryId: category.id,
        entityName: entityName.trim(),
        entityMetadata: parsedMetadata,
      });
      toast.success(`Added "${entityName.trim()}" to ${category.name}`);
      setEntityName('');
      setMetadata({});
      setEntitySelected(false);
      setFieldSelected({});
      onSuccess?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add item';
      if (message.includes('duplicate') || message.includes('unique')) {
        toast.error('You are already tracking this item');
      } else {
        toast.error(message);
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="space-y-1.5">
        <Label>{config.entityLabel}</Label>
        {AUTOCOMPLETE_CATEGORIES.has(category.slug) ? (
          <AutocompleteInput
            value={entityName}
            onChange={setEntityName}
            placeholder={config.entityPlaceholder}
            categorySlug={category.slug}
            strict={isStrict}
            onSelectionChange={setEntitySelected}
          />
        ) : (
          <Input
            placeholder={config.entityPlaceholder}
            value={entityName}
            onChange={(e) => setEntityName(e.target.value)}
          />
        )}
      </div>

      {config.fields.map((field) => (
        <div key={field.name} className="space-y-1.5">
          <Label>{field.label}</Label>
          {field.type === 'autocomplete' && field.searchSlug ? (
            <AutocompleteInput
              value={metadata[field.name] || ''}
              onChange={(val) =>
                setMetadata((prev) => ({ ...prev, [field.name]: val }))
              }
              placeholder={field.placeholder}
              categorySlug={field.searchSlug}
              strict={field.required}
              onSelectionChange={(selected) =>
                setFieldSelected((prev) => ({ ...prev, [field.name]: selected }))
              }
            />
          ) : field.type === 'select' ? (
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              value={metadata[field.name] || (field.options?.[0]?.value ?? '')}
              onChange={(e) =>
                setMetadata((prev) => ({ ...prev, [field.name]: e.target.value }))
              }
              required={field.required}
            >
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : (
            <Input
              type={field.type === 'autocomplete' ? 'text' : field.type}
              step={field.type === 'number' ? 'any' : undefined}
              placeholder={field.placeholder}
              value={metadata[field.name] || ''}
              onChange={(e) =>
                setMetadata((prev) => ({ ...prev, [field.name]: e.target.value }))
              }
              required={field.required}
            />
          )}
        </div>
      ))}

      <Button type="submit" size="sm" disabled={addEntity.isPending}>
        {addEntity.isPending ? 'Adding...' : 'Add'}
      </Button>
    </form>
  );
}
