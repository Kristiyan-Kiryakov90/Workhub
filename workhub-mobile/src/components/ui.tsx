import { Link } from 'expo-router';
import type { Href } from 'expo-router';
import type { PropsWithChildren } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type GestureResponderEvent,
  type ViewStyle,
} from 'react-native';

export function LoadingState() {
  return (
    <View style={styles.center}>
      <ActivityIndicator />
    </View>
  );
}

export function MessageState({ message }: { message: string }) {
  return (
    <View style={styles.center}>
      <Text style={styles.message}>{message}</Text>
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.error}>{message}</Text>
      <Button label="Try Again" onPress={onRetry} variant="secondary" />
    </View>
  );
}

export function Button({
  disabled,
  label,
  onPress,
  variant = 'primary',
}: {
  disabled?: boolean;
  label: string;
  onPress?: (event: GestureResponderEvent) => void;
  variant?: 'primary' | 'secondary' | 'danger';
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.secondaryButton,
        variant === 'danger' && styles.dangerButton,
        (pressed || disabled) && styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          variant === 'secondary' && styles.secondaryButtonText,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function AppLink({ children, href }: PropsWithChildren<{ href: Href }>) {
  return (
    <Link href={href} asChild>
      <Pressable style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}>
        <Text style={styles.linkText}>{children}</Text>
      </Pressable>
    </Link>
  );
}

export function Row({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value ?? 'Not set'}</Text>
    </View>
  );
}

export function Card({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Badge({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'blue' | 'green' | 'amber' | 'red';
}) {
  return (
    <View style={[styles.badge, styles[`${tone}Badge`]]}>
      <Text style={[styles.badgeText, styles[`${tone}BadgeText`]]}>{label}</Text>
    </View>
  );
}

export function CardTitle({ children }: PropsWithChildren) {
  return <Text style={styles.cardTitle}>{children}</Text>;
}

export function CardMeta({ children }: PropsWithChildren) {
  return <Text style={styles.cardMeta}>{children}</Text>;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    padding: 24,
  },
  message: {
    color: '#4b5563',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  error: {
    color: '#b91c1c',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  button: {
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#2563eb',
    paddingHorizontal: 13,
    paddingVertical: 8,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
  },
  dangerButton: {
    backgroundColor: '#b91c1c',
  },
  pressed: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: '#111827',
  },
  linkButton: {
    minHeight: 38,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 9,
  },
  linkText: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '600',
  },
  row: {
    gap: 2,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingVertical: 8,
  },
  rowLabel: {
    color: '#6b7280',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  rowValue: {
    color: '#111827',
    fontSize: 14,
    lineHeight: 19,
  },
  card: {
    gap: 7,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    padding: 11,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '900',
    lineHeight: 19,
  },
  cardMeta: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 17,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  neutralBadge: {
    backgroundColor: '#f1f5f9',
  },
  neutralBadgeText: {
    color: '#334155',
  },
  blueBadge: {
    backgroundColor: '#dbeafe',
  },
  blueBadgeText: {
    color: '#1d4ed8',
  },
  greenBadge: {
    backgroundColor: '#dcfce7',
  },
  greenBadgeText: {
    color: '#047857',
  },
  amberBadge: {
    backgroundColor: '#fef3c7',
  },
  amberBadgeText: {
    color: '#b45309',
  },
  redBadge: {
    backgroundColor: '#fee2e2',
  },
  redBadgeText: {
    color: '#b91c1c',
  },
});
