import { View, Text } from 'react-native';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
}

const variantStyles = {
  default: 'bg-primary',
  secondary: 'bg-secondary',
  destructive: 'bg-destructive',
  outline: 'bg-transparent border border-border',
};

const textStyles = {
  default: 'text-white',
  secondary: 'text-secondary-foreground',
  destructive: 'text-white',
  outline: 'text-foreground',
};

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <View className={`rounded-full px-2 py-0.5 ${variantStyles[variant]} ${className}`}>
      {typeof children === 'string' ? (
        <Text className={`text-xs font-medium ${textStyles[variant]}`}>{children}</Text>
      ) : (
        children
      )}
    </View>
  );
}
