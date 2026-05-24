import { ProtectedScreen } from '@/components/protected-screen';
import {
  Badge,
  Button,
  Card,
  CardMeta,
  CardTitle,
  ErrorState,
  LoadingState,
  MessageState,
} from '@/components/ui';
import { notifyAlertStateChanged } from '@/lib/alert-events';
import { formatDateTime, labelize } from '@/lib/format';
import { type NotificationItem, useMobileApi } from '@/lib/mobile-api';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

export default function NotificationsScreen() {
  const api = useMobileApi();
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (nextPage = 1, refreshing = false) => {
      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const response = await api.notifications(nextPage);
        setItems(response.items);
        setPage(response.page);
        setTotalPages(response.totalPages);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error ? caughtError.message : 'Unable to load notifications.',
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [api],
  );

  useFocusEffect(
    useCallback(() => {
      load(1);
    }, [load]),
  );

  async function markRead(id: number) {
    await api.readNotification(id);
    await load(page, true);
    notifyAlertStateChanged();
  }

  async function markAllRead() {
    await api.readAllNotifications();
    await load(page, true);
    notifyAlertStateChanged();
  }

  async function openNotification(item: NotificationItem) {
    const href = notificationHref(item.actionUrl);

    if (!href) {
      return;
    }

    if (!item.isRead) {
      await api.readNotification(item.id);
      notifyAlertStateChanged();
    }

    router.push(href);
  }

  return (
    <ProtectedScreen title="Notifications">
      {items.some((item) => !item.isRead) ? (
        <View style={styles.action}>
          <Button label="Mark All as Read" onPress={markAllRead} variant="secondary" />
        </View>
      ) : null}
      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => load(page)} />
      ) : items.length === 0 ? (
        <MessageState message="No notifications yet." />
      ) : (
        <>
          <FlatList
            contentContainerStyle={styles.list}
            data={items}
            keyExtractor={(item) => String(item.id)}
            onRefresh={() => load(1, true)}
            refreshing={isRefreshing}
            renderItem={({ item }) => {
              const href = notificationHref(item.actionUrl);

              return (
                <Card style={!item.isRead && styles.unread}>
                  <Pressable
                    accessibilityRole={href ? 'button' : undefined}
                    disabled={!href}
                    onPress={() => openNotification(item)}
                    style={({ pressed }) => [styles.cardContent, pressed && styles.pressed]}
                  >
                    <View style={styles.cardHeader}>
                      <Badge
                        label={item.isRead ? 'Read' : 'Unread'}
                        tone={item.isRead ? 'neutral' : 'blue'}
                      />
                      <Text style={styles.type}>{labelize(item.type)}</Text>
                    </View>
                    <CardTitle>{item.title}</CardTitle>
                    <Text style={styles.message}>{item.message}</Text>
                    <CardMeta>{formatDateTime(item.createdAt)}</CardMeta>
                    {href ? <Text style={styles.openHint}>Open</Text> : null}
                  </Pressable>
                  {!item.isRead ? (
                    <Button label="Mark as Read" onPress={() => markRead(item.id)} variant="secondary" />
                  ) : null}
                </Card>
              );
            }}
          />
          <View style={styles.pager}>
            <Button disabled={page <= 1} label="Previous" onPress={() => load(page - 1)} variant="secondary" />
            <Text style={styles.page}>Page {page} of {totalPages}</Text>
            <Button disabled={page >= totalPages} label="Next" onPress={() => load(page + 1)} variant="secondary" />
          </View>
        </>
      )}
    </ProtectedScreen>
  );
}

function notificationHref(actionUrl: string | null): Href | null {
  if (!actionUrl) {
    return null;
  }

  const leaveMatch = actionUrl.match(/^\/(?:manager\/|admin\/)?leave\/(\d+)$/);

  if (leaveMatch) {
    return { pathname: '/leaves/[id]', params: { id: leaveMatch[1] } };
  }

  const taskMatch = actionUrl.match(/^\/tasks\/(\d+)$/);

  if (taskMatch) {
    return { pathname: '/tasks/[id]', params: { id: taskMatch[1] } };
  }

  const shiftMatch = actionUrl.match(/^\/shifts\/(\d+)$/);

  if (shiftMatch) {
    return { pathname: '/shifts/[id]', params: { id: shiftMatch[1] } };
  }

  return null;
}

const styles = StyleSheet.create({
  action: {
    marginBottom: 14,
  },
  list: {
    gap: 8,
    paddingBottom: 6,
  },
  cardContent: {
    gap: 7,
    borderRadius: 8,
  },
  pressed: {
    opacity: 0.72,
  },
  unread: {
    borderColor: '#bfdbfe',
    backgroundColor: '#f8fbff',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  type: {
    flex: 1,
    color: '#64748b',
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'right',
    textTransform: 'uppercase',
  },
  message: {
    color: '#334155',
    fontSize: 13,
    lineHeight: 18,
  },
  openHint: {
    alignSelf: 'flex-start',
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '900',
  },
  pager: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    paddingTop: 12,
  },
  page: {
    color: '#374151',
    fontWeight: '700',
  },
});
