import { View, Text, Switch as RNSwitch, SwitchProps } from 'react-native';

interface StyledSwitchProps extends Omit<SwitchProps, 'trackColor' | 'thumbColor'> {
  label?: string;
  description?: string;
}

export function Switch({ label, description, ...props }: StyledSwitchProps) {
  return (
    <View className="flex-row items-center justify-between">
      {(label || description) && (
        <View className="flex-1 mr-3">
          {label && (
            <Text className="text-sm font-medium text-foreground">{label}</Text>
          )}
          {description && (
            <Text className="text-xs text-muted-foreground mt-0.5">
              {description}
            </Text>
          )}
        </View>
      )}
      <RNSwitch
        trackColor={{ false: '#e5e7eb', true: '#ff751f' }}
        thumbColor="#ffffff"
        ios_backgroundColor="#e5e7eb"
        {...props}
      />
    </View>
  );
}
