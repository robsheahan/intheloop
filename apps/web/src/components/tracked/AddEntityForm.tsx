'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Category } from '@tmw/shared/types/database';
import { useAddTrackedEntity } from '@/lib/hooks/useTrackedEntities';
import { CATEGORY_FORM_CONFIGS, CategoryField } from '@tmw/shared/utils/category-fields';
import { AutocompleteInput } from '@/components/shared/AutocompleteInput';
import { SearchSuggestion } from '@tmw/shared/search/types';
import { useAuth } from '@/context/AuthContext';

const AUTOCOMPLETE_CATEGORIES = new Set([
  'music', 'tours', 'books', 'crypto', 'stocks', 'movies',
  'github', 'steam', 'weather', 'currency',
]);

function isFieldVisible(field: CategoryField, metadata: Record<string, string>): boolean {
  if (!field.visibleWhen) return true;
  return metadata[field.visibleWhen.field] === field.visibleWhen.value;
}

interface Props {
  category: Category;
  onSuccess?: () => void;
}

export function AddEntityForm({ category, onSuccess }: Props) {
  const config = CATEGORY_FORM_CONFIGS[category.slug];
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

  // Compute effective entity label/placeholder/searchSlug from overrides
  const overrideKey = Object.keys(config.entityOverrides || {}).find((key) => {
    const [field, value] = key.split(':');
    return metadata[field] === value;
  });
  const override = overrideKey ? config.entityOverrides?.[overrideKey] : undefined;
  const effectiveLabel = override?.entityLabel || config.entityLabel;
  const effectivePlaceholder = override?.entityPlaceholder || config.entityPlaceholder;
  const effectiveSearchSlug = override?.searchSlug || category.slug;
  const useAutocomplete = AUTOCOMPLETE_CATEGORIES.has(category.slug) || !!override?.searchSlug;

  // Filter fields by visibleWhen
  const visibleFields = config.fields.filter((f) => isFieldVisible(f, metadata));

  const handleTrackModeChange = (fieldName: string, value: string) => {
    const prev = metadata[fieldName];
    setMetadata((m) => ({ ...m, [fieldName]: value }));
    // Reset entity name when switching modes
    if (prev !== value && fieldName === 'track_mode') {
      setEntityName('');
      setEntitySelected(false);
    }
  };

  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    if (suggestion.metadata) {
      setMetadata((prev) => ({
        ...prev,
        ...Object.fromEntries(
          Object.entries(suggestion.metadata!).map(([k, v]) => [k, String(v)])
        ),
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!entityName.trim()) return;

    const parsedMetadata: Record<string, unknown> = {};
    for (const field of config.fields) {
      if (!isFieldVisible(field, metadata)) continue;
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
    // Include mode fields and metadata from suggestions (tmdb_id, media_type)
    for (const field of config.fields) {
      if (field.visibleWhen === undefined && metadata[field.name]) {
        parsedMetadata[field.name] = metadata[field.name];
      }
    }
    // Carry over tmdb_id and media_type from suggestion metadata
    if (metadata.tmdb_id) parsedMetadata.tmdb_id = parseInt(metadata.tmdb_id);
    if (metadata.media_type) parsedMetadata.media_type = metadata.media_type;

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
      {/* Render fields that come BEFORE the entity input (e.g. track_mode) */}
      {visibleFields
        .filter((f) => f.name === 'track_mode')
        .map((field) => (
          <div key={field.name} className="space-y-1.5">
            <Label>{field.label}</Label>
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm"
              value={metadata[field.name] || (field.options?.[0]?.value ?? '')}
              onChange={(e) => handleTrackModeChange(field.name, e.target.value)}
              required={field.required}
            >
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        ))}

      <div className="space-y-1.5">
        <Label>{effectiveLabel}</Label>
        {useAutocomplete ? (
          <AutocompleteInput
            value={entityName}
            onChange={setEntityName}
            placeholder={effectivePlaceholder}
            categorySlug={effectiveSearchSlug}
            onSelectionChange={setEntitySelected}
            onSuggestionSelect={handleSuggestionSelect}
          />
        ) : (
          <Input
            placeholder={effectivePlaceholder}
            value={entityName}
            onChange={(e) => setEntityName(e.target.value)}
          />
        )}
      </div>

      {visibleFields.filter((f) => f.name !== 'track_mode').map((field) => (
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
              initialSelected={!!fieldSelected[field.name]}
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
