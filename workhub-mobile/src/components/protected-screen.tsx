import { Link, Redirect, usePathname, useRouter, type Href } from 'expo-router';
import type { PropsWithChildren } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';

import { subscribeToAlertChanges } from '@/lib/alert-events';
import { useAuth } from '@/lib/auth';
import { useMobileApi } from '@/lib/mobile-api';

type ProtectedScreenProps = {
  title?: string;
  showNavigation?: boolean;
} & PropsWithChildren;

const navigationItems: { href: Href; label: string; match: string }[] = [
  { href: '/', label: 'Home', match: '/' },
  { href: '/tasks', label: 'Tasks', match: '/tasks' },
  { href: '/shifts', label: 'Shifts', match: '/shifts' },
  { href: '/leaves', label: 'Leave', match: '/leaves' },
  { href: '/profile', label: 'Profile', match: '/profile' },
];

export function ProtectedScreen({
  children,
  showNavigation = true,
  title,
}: ProtectedScreenProps) {
  const { isLoading, isLoggedIn } = useAuth();
  const api = useMobileApi();
  const pathname = usePathname();
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [hasUnreadAlerts, setHasUnreadAlerts] = useState(false);
  const backHref = getBackHref(pathname);
  const showBackButton = pathname !== '/' && pathname !== '/dashboard';
  const activeItem = useMemo(
    () =>
      navigationItems.find(
        (item) =>
          item.match === '/'
            ? pathname === '/' || pathname === '/dashboard'
            : pathname === item.match || pathname.startsWith(`${item.match}/`),
      ),
    [pathname],
  );
  const refreshUnreadAlerts = useCallback(async () => {
    if (!isLoggedIn || !showNavigation) {
      return;
    }

    try {
      const response = await api.unreadNotificationCount();
      setHasUnreadAlerts(response.unreadCount > 0);
    } catch {
      setHasUnreadAlerts(false);
    }
  }, [api, isLoggedIn, showNavigation]);

  useFocusEffect(
    useCallback(() => {
      refreshUnreadAlerts();
    }, [refreshUnreadAlerts]),
  );

  useEffect(() => {
    if (!isLoggedIn || !showNavigation) {
      return undefined;
    }

    const unsubscribe = subscribeToAlertChanges(refreshUnreadAlerts);
    const intervalId = setInterval(refreshUnreadAlerts, 10000);

    return () => {
      unsubscribe();
      clearInterval(intervalId);
    };
  }, [isLoggedIn, refreshUnreadAlerts, showNavigation]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!isLoggedIn) {
    return <Redirect href="/login" />;
  }

  return (
    <View style={styles.container}>
      {showNavigation ? (
        <View style={styles.header}>
          {showBackButton ? (
            <Pressable
              accessibilityLabel="Go back"
              onPress={() => {
                setIsMenuOpen(false);
                router.replace(backHref);
              }}
              style={({ pressed }) => [styles.backButton, pressed && styles.navItemPressed]}
            >
              <Text style={styles.backButtonText}>{'<'}</Text>
            </Pressable>
          ) : null}
          <View style={styles.headerTitle}>
            <Text style={styles.brand}>WorkHub</Text>
            <Text numberOfLines={1} style={styles.section}>
              {title ?? activeItem?.label ?? 'Dashboard'}
            </Text>
          </View>
          <Pressable
            accessibilityLabel={hasUnreadAlerts ? 'Open alerts. Unread alerts available.' : 'Open alerts'}
            onPress={() => {
              setIsMenuOpen(false);
              router.push('/notifications');
            }}
            style={({ pressed }) => [
              styles.alertButton,
              pathname === '/notifications' && styles.alertButtonActive,
              pressed && styles.navItemPressed,
            ]}
          >
            <View style={styles.alertIcon}>
              <Text style={styles.alertIconText}>!</Text>
            </View>
            {hasUnreadAlerts ? <View style={styles.alertDot} /> : null}
          </Pressable>
          <Pressable
            accessibilityLabel="Open navigation menu"
            onPress={() => setIsMenuOpen((value) => !value)}
            style={({ pressed }) => [styles.menuButton, pressed && styles.navItemPressed]}
          >
            <Text style={styles.menuButtonText}>Menu</Text>
          </Pressable>
        </View>
      ) : null}

      {showNavigation && isMenuOpen ? (
        <View style={styles.menu}>
          {navigationItems.map((item) => {
            const isActive = pathname === item.match || pathname.startsWith(`${item.match}/`);

            return (
              <Link key={item.match} href={item.href} asChild>
                <Pressable
                  onPress={() => setIsMenuOpen(false)}
                  style={({ pressed }) => [
                    styles.menuItem,
                    isActive && styles.menuItemActive,
                    pressed && styles.navItemPressed,
                  ]}
                >
                  <Text style={[styles.menuLabel, isActive && styles.menuLabelActive]}>
                    {item.label}
                  </Text>
                </Pressable>
              </Link>
            );
          })}
        </View>
      ) : null}

      <View style={styles.content}>
        {!showNavigation && title ? <Text style={styles.title}>{title}</Text> : null}
        {children}
      </View>
    </View>
  );
}

function getBackHref(pathname: string): Href {
  if (pathname.startsWith('/tasks/')) {
    return '/tasks';
  }

  if (pathname.startsWith('/shifts/')) {
    return '/shifts';
  }

  if (pathname.startsWith('/leaves/')) {
    return '/leaves';
  }

  if (pathname.startsWith('/calendar/')) {
    return '/';
  }

  if (
    pathname === '/tasks' ||
    pathname === '/shifts' ||
    pathname === '/leaves' ||
    pathname === '/notifications' ||
    pathname === '/profile'
  ) {
    return '/';
  }

  return '/';
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  title: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    backgroundColor: '#ffffff',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dbe3ef',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  backButtonText: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '900',
  },
  headerTitle: {
    flex: 1,
  },
  brand: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  section: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '900',
  },
  menuButton: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#0f172a',
    paddingHorizontal: 16,
  },
  menuButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  alertButton: {
    position: 'relative',
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dbe3ef',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  alertButtonActive: {
    borderColor: '#93c5fd',
    backgroundColor: '#eff6ff',
  },
  alertIcon: {
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#0f172a',
    borderRadius: 9,
  },
  alertIconText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '900',
    lineHeight: 14,
  },
  alertDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 9,
    height: 9,
    borderWidth: 2,
    borderColor: '#ffffff',
    borderRadius: 5,
    backgroundColor: '#dc2626',
  },
  navItemPressed: {
    opacity: 0.72,
  },
  menu: {
    position: 'absolute',
    top: 70,
    left: 20,
    right: 20,
    zIndex: 20,
    borderWidth: 1,
    borderColor: '#dbe3ef',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    padding: 8,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 18,
    elevation: 8,
  },
  menuItem: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: 8,
    paddingHorizontal: 14,
  },
  menuItemActive: {
    backgroundColor: '#eff6ff',
  },
  menuLabel: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '800',
  },
  menuLabelActive: {
    color: '#1d4ed8',
  },
});
