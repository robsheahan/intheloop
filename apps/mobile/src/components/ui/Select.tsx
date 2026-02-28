import { useState } from 'react';
import { View, Text, Pressable, Modal, FlatList } from 'react-native';
import { ChevronDown } from 'lucide-react-native';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label?: string;
  value: string;
  options: SelectOption[];
  onValueChange: (value: string) => void;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
}

export function Select({
  label,
  value,
  options,
  onValueChange,
  placeholder = 'Select...',
  error,
  disabled,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find((o) => o.value === value);

  return (
    <View>
      {label && (
        <Text className="text-sm font-medium text-foreground mb-1.5">
          {label}
        </Text>
      )}

      <Pressable
        onPress={() => !disabled && setIsOpen(true)}
        className={`flex-row items-center justify-between border rounded-[10px] px-3 py-3 ${
          error ? 'border-destructive' : 'border-border'
        } ${disabled ? 'opacity-50' : ''}`}
      >
        <Text
          className={`text-base ${
            selectedOption ? 'text-foreground' : 'text-muted-foreground'
          }`}
        >
          {selectedOption?.label ?? placeholder}
        </Text>
        <ChevronDown size={18} color="#6b7280" />
      </Pressable>

      {error && (
        <Text className="text-sm text-destructive mt-1">{error}</Text>
      )}

      <Modal visible={isOpen} transparent animationType="slide">
        <Pressable
          className="flex-1 bg-black/40 justify-end"
          onPress={() => setIsOpen(false)}
        >
          <View className="bg-white rounded-t-2xl max-h-[50%]" onStartShouldSetResponder={() => true}>
            <View className="flex-row justify-between items-center px-4 py-3 border-b border-border">
              <Text className="text-lg font-semibold text-foreground">
                {label ?? 'Select'}
              </Text>
              <Pressable onPress={() => setIsOpen(false)}>
                <Text className="text-primary font-medium">Done</Text>
              </Pressable>
            </View>

            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => {
                    onValueChange(item.value);
                    setIsOpen(false);
                  }}
                  className={`flex-row items-center justify-between px-4 py-3.5 border-b border-border/50 ${
                    item.value === value ? 'bg-primary/5' : ''
                  }`}
                >
                  <Text
                    className={`text-base ${
                      item.value === value
                        ? 'text-primary font-medium'
                        : 'text-foreground'
                    }`}
                  >
                    {item.label}
                  </Text>
                  {item.value === value && (
                    <Text className="text-primary font-bold">✓</Text>
                  )}
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}
