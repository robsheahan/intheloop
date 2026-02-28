import { View, Text, ViewStyle } from 'react-native';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  style?: ViewStyle;
}

export function Card({ children, className = '', style }: CardProps) {
  return (
    <View
      className={`bg-card rounded-xl border border-border p-4 ${className}`}
      style={style}
    >
      {children}
    </View>
  );
}

export function CardHeader({ children, className = '' }: CardProps) {
  return <View className={`mb-3 ${className}`}>{children}</View>;
}

export function CardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <Text className={`text-lg font-semibold text-foreground ${className}`}>
      {children}
    </Text>
  );
}

export function CardDescription({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <Text className={`text-sm text-muted-foreground mt-0.5 ${className}`}>
      {children}
    </Text>
  );
}

export function CardContent({ children, className = '' }: CardProps) {
  return <View className={className}>{children}</View>;
}

export function CardFooter({ children, className = '' }: CardProps) {
  return <View className={`mt-4 ${className}`}>{children}</View>;
}
