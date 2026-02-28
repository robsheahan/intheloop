'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { SearchSuggestion } from '@intheloop/shared/search/types';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  categorySlug: string;
  disabled?: boolean;
  strict?: boolean;
  onSelectionChange?: (selected: boolean) => void;
}

export function AutocompleteInput({
  value,
  onChange,
  placeholder,
  categorySlug,
  disabled,
  strict,
  onSelectionChange,
}: Props) {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [wasSelected, setWasSelected] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const fetchSuggestions = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setSuggestions([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      try {
        const res = await fetch(
          `/api/search/${encodeURIComponent(categorySlug)}?q=${encodeURIComponent(query)}`
        );
        if (res.ok) {
          const data = await res.json();
          setSuggestions(data.suggestions || []);
          setIsOpen((data.suggestions || []).length > 0);
        }
      } catch {
        // Silently fail — user can still type manually
      } finally {
        setIsLoading(false);
      }
    },
    [categorySlug]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    setActiveIndex(-1);
    if (wasSelected) {
      setWasSelected(false);
      onSelectionChange?.(false);
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(val), 300);
  };

  const handleSelect = (suggestion: SearchSuggestion) => {
    onChange(suggestion.value);
    setSuggestions([]);
    setIsOpen(false);
    setActiveIndex(-1);
    setWasSelected(true);
    onSelectionChange?.(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i < suggestions.length - 1 ? i + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i > 0 ? i - 1 : suggestions.length - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIndex]);
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (suggestions.length > 0) setIsOpen(true);
        }}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        className={strict && value && !wasSelected ? 'border-amber-500 focus-visible:ring-amber-500' : ''}
      />
      {strict && value && !wasSelected && (
        <p className="text-xs text-amber-600 mt-1">Please select from the dropdown</p>
      )}

      {isLoading && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        </div>
      )}

      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 mt-1 w-full rounded-md border bg-popover shadow-md max-h-60 overflow-auto">
          {suggestions.map((s, i) => (
            <li
              key={`${s.value}-${i}`}
              className={`flex items-center gap-2 px-3 py-2 text-sm cursor-pointer ${
                i === activeIndex
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent/50'
              }`}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(s);
              }}
              onMouseEnter={() => setActiveIndex(i)}
            >
              {s.imageUrl && (
                <img
                  src={s.imageUrl}
                  alt=""
                  className="h-8 w-8 rounded object-cover shrink-0"
                />
              )}
              <div className="min-w-0">
                <div className="font-medium truncate">{s.label}</div>
                {s.subtitle && (
                  <div className="text-xs text-muted-foreground truncate">
                    {s.subtitle}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
