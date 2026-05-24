import { ProtectedScreen } from '@/components/protected-screen';
import { Badge, Card, ErrorState, LoadingState, MessageState } from '@/components/ui';
import { formatDate, labelize } from '@/lib/format';
import { type CalendarEvent, useMobileApi } from '@/lib/mobile-api';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

export default function CalendarDayScreen() {
  const { date } = useLocalSearchParams<{ date: string }>();
  const api = useMobileApi();
  const router = useRouter();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedDate = isIsoDate(date) ? date : new Date().toISOString().slice(0, 10);

  const load = useCallback(
    async (refreshing = false) => {
      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const response = await api.dashboard(selectedDate, selectedDate);
        setEvents(response.calendarEvents ?? []);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Unable to load activities for this day.',
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [api, selectedDate],
  );

  useEffect(() => {
    load();
  }, [load]);

  function openEvent(event: CalendarEvent) {
    const match = event.actionUrl.match(/\/(tasks|shifts|leave)\/(\d+)/);

    if (!match) {
      return;
    }

    const [, resource, id] = match;

    if (resource === 'tasks') {
      router.push({ pathname: '/tasks/[id]', params: { id } });
    } else if (resource === 'shifts') {
      router.push({ pathname: '/shifts/[id]', params: { id } });
    } else {
      router.push({ pathname: '/leaves/[id]', params: { id } });
    }
  }

  return (
    <ProtectedScreen title="Day Activities">
      <View style={styles.header}>
        <Text style={styles.date}>{formatDate(selectedDate)}</Text>
        <Text style={styles.count}>
          {events.length === 1 ? '1 activity' : `${events.length} activities`}
        </Text>
      </View>

      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => load()} />
      ) : events.length === 0 ? (
        <MessageState message="No activities for this day." />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={events}
          keyExtractor={(item) => item.id}
          onRefresh={() => load(true)}
          refreshing={isRefreshing}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => openEvent(item)}
              style={({ pressed }) => pressed && styles.pressed}
            >
              <Card style={[styles.activityCard, eventCardStyle(item.type)]}>
                <View style={styles.cardHeader}>
                  <Text numberOfLines={1} style={styles.title}>
                    {item.title}
                  </Text>
                  <View style={styles.badges}>
                    <Badge label={eventTypeLabel(item.type)} tone={eventTone(item.type)} />
                    {item.type === 'leave' && item.leaveType ? (
                      <Badge label={labelize(item.leaveType)} tone="neutral" />
                    ) : null}
                  </View>
                </View>
                <View style={styles.metaRow}>
                  <Text numberOfLines={1} style={styles.department}>
                    {item.departmentName}
                  </Text>
                  <Text style={styles.time}>{formatTimeRange(item)}</Text>
                </View>
              </Card>
            </Pressable>
          )}
        />
      )}
    </ProtectedScreen>
  );
}

function isIsoDate(value?: string) {
  return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

function eventTypeLabel(type: CalendarEvent['type']) {
  if (type === 'task_due') {
    return 'Task';
  }

  if (type === 'shift') {
    return 'Shift';
  }

  return 'Leave';
}

function eventTone(type: CalendarEvent['type']) {
  if (type === 'task_due') {
    return 'blue' as const;
  }

  if (type === 'shift') {
    return 'green' as const;
  }

  return 'amber' as const;
}

function eventCardStyle(type: CalendarEvent['type']) {
  if (type === 'task_due') {
    return styles.taskCard;
  }

  if (type === 'shift') {
    return styles.shiftCard;
  }

  return styles.leaveCard;
}

function formatTimeRange(event: CalendarEvent) {
  const start = new Date(event.start);
  const end = new Date(event.end);

  if (Number.isNaN(start.getTime()) || event.type !== 'shift') {
    return formatDate(event.start);
  }

  return `${start.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })} - ${end.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 14,
  },
  date: {
    color: '#0f172a',
    fontSize: 24,
    fontWeight: '900',
  },
  count: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 2,
  },
  list: {
    gap: 8,
    paddingBottom: 12,
  },
  pressed: {
    opacity: 0.72,
  },
  activityCard: {
    borderLeftWidth: 5,
  },
  taskCard: {
    borderLeftColor: '#2563eb',
  },
  shiftCard: {
    borderLeftColor: '#059669',
  },
  leaveCard: {
    borderLeftColor: '#d97706',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
    gap: 5,
  },
  title: {
    flex: 1,
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  department: {
    flex: 1,
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },
  time: {
    color: '#475569',
    fontSize: 11,
    fontWeight: '800',
  },
});
