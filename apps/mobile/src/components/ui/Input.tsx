import { TextInput, View, Text, TextInputProps } from 'react-native';
import { forwardRef } from 'react';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  containerClassName?: string;
}

export const Input = forwardRef<TextInput, InputProps>(
  ({ label, error, containerClassName = '', className = '', ...props }, ref) => {
    return (
      <View className={containerClassName}>
        {label && (
          <Text className="text-sm font-medium text-foreground mb-1.5">
            {label}
          </Text>
        )}
        <TextInput
          ref={ref}
          className={`border border-border rounded-[10px] px-3 py-3 text-base text-foreground bg-white ${
            error ? 'border-destructive' : ''
          } ${className}`}
          placeholderTextColor="#9ca3af"
          {...props}
        />
        {error && (
          <Text className="text-sm text-destructive mt-1">{error}</Text>
        )}
      </View>
    );
  }
);

Input.displayName = 'Input';
