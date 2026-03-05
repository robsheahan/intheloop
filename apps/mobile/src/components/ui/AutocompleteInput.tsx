import { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Image,
  Keyboard,
  Dimensions,
} from 'react-native';
import { Input } from './Input';
import { SearchSuggestion } from '@tmw/shared/search/types';
import { supabase } from '@/lib/supabase/client';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  categorySlug: string;
  label?: string;
  onSelectionChange?: (selected: boolean) => void;
  onSuggestionSelect?: (suggestion: SearchSuggestion) => void;
  initialSelected?: boolean;
}

export function AutocompleteInput({
  value,
  onChange,
  placeholder,
  categorySlug,
  label,
  onSelectionChange,
  onSuggestionSelect,
  initialSelected = false,
}: Props) {
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [wasSelected, setWasSelected] = useState(initialSelected);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const inputRef = useRef<TextInput>(null);
  const isFocusedRef = useRef(false);

  // Close dropdown when keyboard is dismissed externally (e.g. drag)
  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidHide', () => {
      // Small delay to allow Pressable onPress to fire first
      setTimeout(() => {
        if (!isFocusedRef.current) {
          setIsOpen(false);
        }
      }, 150);
    });
    return () => sub.remove();
  }, []);

  const fetchSuggestions = useCallback(
    async (query: string) => {
      if (query.length < 2) {
        setSuggestions([]);
        setIsOpen(false);
        return;
      }

      setIsLoading(true);
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) return;

        const apiUrl = process.env.EXPO_PUBLIC_API_URL;
        const res = await fetch(
          `${apiUrl}/api/search/${encodeURIComponent(categorySlug)}?q=${encodeURIComponent(query)}`,
          { headers: { Authorization: `Bearer ${session.access_token}` } }
        );
        if (res.ok) {
          const data = await res.json();
          const results: SearchSuggestion[] = data.suggestions || [];
          setSuggestions(results);
          if (results.length > 0) {
            setIsOpen(true);
          }
        }
      } catch {
        // Silently fail — user can still type manually
      } finally {
        setIsLoading(false);
      }
    },
    [categorySlug]
  );

  const handleChangeText = (text: string) => {
    onChange(text);
    if (wasSelected) {
      setWasSelected(false);
      onSelectionChange?.(false);
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchSuggestions(text), 300);
  };

  const handleSelect = (suggestion: SearchSuggestion) => {
    onChange(suggestion.value);
    setSuggestions([]);
    setIsOpen(false);
    setWasSelected(true);
    onSelectionChange?.(true);
    onSuggestionSelect?.(suggestion);
    Keyboard.dismiss();
  };

  const handleFocus = () => {
    isFocusedRef.current = true;
    if (suggestions.length > 0) setIsOpen(true);
  };

  const handleBlur = () => {
    isFocusedRef.current = false;
    // Delay closing so Pressable onPress on suggestions can fire first
    setTimeout(() => {
      if (!isFocusedRef.current) {
        setIsOpen(false);
      }
    }, 200);
  };

  return (
    <View className="relative" style={{ zIndex: 50 }}>
      <View>
        <Input
          ref={inputRef}
          label={label}
          value={value}
          onChangeText={handleChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          autoComplete="off"
          autoCorrect={false}
        />
        {isLoading && (
          <View className="absolute right-3 top-0 bottom-0 justify-center" style={label ? { top: 24 } : undefined}>
            <ActivityIndicator size="small" color="#9ca3af" />
          </View>
        )}
      </View>
      {isOpen && suggestions.length > 0 && (
        <>
          <Pressable
            style={{
              position: 'absolute',
              top: -1000,
              left: -1000,
              width: Dimensions.get('window').width + 2000,
              height: Dimensions.get('window').height + 2000,
              zIndex: 40,
            }}
            onPress={() => setIsOpen(false)}
          />
          <View
            className="absolute left-0 right-0 bg-white border border-border rounded-lg shadow-lg"
            style={{ top: '100%', marginTop: 4, zIndex: 50, maxHeight: 240 }}
          >
            <ScrollView keyboardShouldPersistTaps="handled" nestedScrollEnabled>
              {suggestions.map((item, i) => (
                <Pressable
                  key={`${item.value}-${i}`}
                  onPress={() => handleSelect(item)}
                  className="flex-row items-center gap-2.5 px-3 py-2.5 border-b border-border/30 active:bg-gray-100"
                >
                  {item.imageUrl && (
                    <Image
                      source={{ uri: item.imageUrl }}
                      className="h-9 w-9 rounded"
                      resizeMode="cover"
                    />
                  )}
                  <View className="flex-1 min-w-0">
                    <Text className="text-sm font-medium text-foreground" numberOfLines={1}>
                      {item.label}
                    </Text>
                    {item.subtitle && (
                      <Text className="text-xs text-muted-foreground" numberOfLines={1}>
                        {item.subtitle}
                      </Text>
                    )}
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </>
      )}
    </View>
  );
}
