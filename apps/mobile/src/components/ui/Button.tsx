import { Pressable, Text, ActivityIndicator, View } from 'react-native';
import { lightImpact } from '@/lib/haptics';

type ButtonVariant = 'primary' | 'outline' | 'ghost' | 'destructive';

interface ButtonProps {
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: ButtonVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<ButtonVariant, { container: string; text: string }> = {
  primary: {
    container: 'bg-primary',
    text: 'text-white font-semibold',
  },
  outline: {
    container: 'bg-transparent border border-border',
    text: 'text-foreground font-semibold',
  },
  ghost: {
    container: 'bg-transparent',
    text: 'text-foreground font-medium',
  },
  destructive: {
    container: 'bg-destructive',
    text: 'text-white font-semibold',
  },
};

export function Button({
  onPress,
  disabled = false,
  loading = false,
  variant = 'primary',
  children,
  className = '',
}: ButtonProps) {
  const styles = variantStyles[variant];

  return (
    <Pressable
      onPress={() => {
        lightImpact();
        onPress?.();
      }}
      disabled={disabled || loading}
      className={`flex-row items-center justify-center rounded-[10px] px-4 py-3 ${styles.container} ${
        disabled || loading ? 'opacity-50' : ''
      } ${className}`}
    >
      {loading && (
        <ActivityIndicator
          size="small"
          color={variant === 'primary' || variant === 'destructive' ? '#ffffff' : '#ff751f'}
          style={{ marginRight: 8 }}
        />
      )}
      {typeof children === 'string' ? (
        <Text className={`text-base ${styles.text}`}>{children}</Text>
      ) : (
        <View className="flex-row items-center">{children}</View>
      )}
    </Pressable>
  );
}
