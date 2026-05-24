import { ErrorState, LoadingState, MessageState } from '@/components/ui';
import { formatDate, monthRange } from '@/lib/format';
import { type CalendarEvent, useMobileApi } from '@/lib/mobile-api';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { ProtectedScreen } from '@/components/protected-screen';

export default function DashboardScreen() {
  const api = useMobileApi();
  const router = useRouter();
  const [month, setMonth] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<'month' | 'list'>('month');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const range = useMemo(() => monthRange(month), [month]);
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const days = useMemo(() => buildMonthDays(month, events), [events, month]);
  const listEvents = useMemo(
    () => events.filter((event) => event.end.slice(0, 10) >= today),
    [events, today],
  );
  const monthTitle = month.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  });

  const load = useCallback(
    async (refreshing = false) => {
      if (refreshing) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const response = await api.dashboard(range.startDate, range.endDate);
        setEvents(response.calendarEvents ?? []);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : 'Unable to load calendar events.',
        );
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [api, range.endDate, range.startDate],
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

  function openDay(date: string) {
    router.push({ pathname: '/calendar/[date]', params: { date } });
  }

  return (
    <ProtectedScreen>
      <View style={styles.calendarPanel}>
        <View style={styles.toolbar}>
          <Pressable
            accessibilityLabel="Previous month"
            onPress={() => setMonth((value) => addMonths(value, -1))}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <Text style={styles.iconText}>{'<'}</Text>
          </Pressable>
          <View style={styles.monthBlock}>
            <Text style={styles.month}>{monthTitle}</Text>
            <Text style={styles.eventCount}>
              {isLoading
                ? 'Loading events...'
                : events.length === 1
                  ? '1 event'
                  : `${events.length} events`}
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Next month"
            onPress={() => setMonth((value) => addMonths(value, 1))}
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
          >
            <Text style={styles.iconText}>{'>'}</Text>
          </Pressable>
        </View>

        <View style={styles.segment}>
          {(['month', 'list'] as const).map((mode) => (
            <Pressable
              key={mode}
              onPress={() => setViewMode(mode)}
              style={[styles.segmentItem, viewMode === mode && styles.segmentItemActive]}
            >
              <Text style={[styles.segmentText, viewMode === mode && styles.segmentTextActive]}>
                {mode === 'month' ? 'Month' : 'List'}
              </Text>
            </Pressable>
          ))}
        </View>

        {error ? (
          <ErrorState message={error} onRetry={() => load()} />
        ) : viewMode === 'month' ? (
          <>
            {isLoading ? (
              <View style={styles.inlineLoading}>
                <ActivityIndicator />
              </View>
            ) : null}
            <View style={styles.weekdays}>
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <Text key={day} style={styles.weekday}>
                  {day}
                </Text>
              ))}
            </View>
            <FlatList
              key="calendar-month"
              data={days}
              keyExtractor={(item) => item.date}
              numColumns={7}
              onRefresh={() => load(true)}
              refreshing={isRefreshing}
              renderItem={({ item }) => (
                <Pressable
                  onPress={() => openDay(item.date)}
                  style={[
                    styles.day,
                    !item.inMonth && styles.dayMuted,
                    item.date === today && styles.today,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayText,
                      !item.inMonth && styles.dayTextMuted,
                      item.date === today && styles.todayText,
                    ]}
                  >
                    {Number(item.date.slice(-2))}
                  </Text>
                  <View style={styles.dayEvents}>
                    {item.events.slice(0, 2).map((event) => (
                      <View key={event.id} style={[styles.eventLine, eventTypeStyle(event.type)]} />
                    ))}
                    {item.events.length > 2 ? (
                      <Text style={styles.moreEvents}>+{item.events.length - 2}</Text>
                    ) : null}
                  </View>
                </Pressable>
              )}
            />
            <View style={styles.legend}>
              <LegendItem color="#2563eb" label="Tasks" />
              <LegendItem color="#059669" label="Shifts" />
              <LegendItem color="#d97706" label="Leave" />
            </View>
          </>
        ) : isLoading ? (
          <LoadingState />
        ) : listEvents.length === 0 ? (
          <MessageState message="No calendar events for this period." />
        ) : (
          <FlatList
            key="calendar-list"
            data={listEvents}
            keyExtractor={(item) => item.id}
            onRefresh={() => load(true)}
            refreshing={isRefreshing}
            renderItem={({ item }) => (
              <Pressable
                onPress={() => openEvent(item)}
                style={({ pressed }) => [styles.event, pressed && styles.pressed]}
              >
                <View style={[styles.eventStripe, eventTypeStyle(item.type)]} />
                <View style={styles.eventBody}>
                  <Text style={styles.eventTitle}>{item.title}</Text>
                  <Text style={styles.eventMeta}>
                    {formatDate(item.start)} - {item.departmentName}
                  </Text>
                </View>
                <Text style={styles.eventType}>{eventTypeLabel(item.type)}</Text>
              </Pressable>
            )}
          />
        )}
      </View>
    </ProtectedScreen>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={styles.legendText}>{label}</Text>
    </View>
  );
}

function addMonths(value: Date, amount: number) {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1);
}

function buildMonthDays(month: Date, events: CalendarEvent[]) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const gridStart = new Date(first);
  gridStart.setDate(first.getDate() - first.getDay());
  const eventsByDay = new Map<string, CalendarEvent[]>();

  events.forEach((event) => {
    const key = event.start.slice(0, 10);
    eventsByDay.set(key, [...(eventsByDay.get(key) ?? []), event]);
  });

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(gridStart.getDate() + index);
    const isoDate = date.toISOString().slice(0, 10);

    return {
      date: isoDate,
      events: eventsByDay.get(isoDate) ?? [],
      inMonth: date.getMonth() === month.getMonth(),
    };
  });
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

function eventTypeStyle(type: CalendarEvent['type']) {
  if (type === 'task_due') {
    return styles.taskDue;
  }

  if (type === 'shift') {
    return styles.shift;
  }

  return styles.leave;
}

const styles = StyleSheet.create({
  calendarPanel: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    padding: 12,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  iconButton: {
    width: 42,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dbe3ef',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  iconText: {
    color: '#0f172a',
    fontSize: 22,
    fontWeight: '900',
  },
  monthBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  month: {
    color: '#0f172a',
    fontSize: 19,
    fontWeight: '900',
    textAlign: 'center',
  },
  eventCount: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
  },
  segment: {
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: '#dbe3ef',
    borderRadius: 8,
    marginBottom: 16,
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  segmentItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
  },
  segmentItemActive: {
    backgroundColor: '#0f172a',
  },
  segmentText: {
    color: '#475569',
    fontWeight: '800',
  },
  segmentTextActive: {
    color: '#ffffff',
  },
  inlineLoading: {
    position: 'absolute',
    top: 86,
    right: 16,
    zIndex: 2,
  },
  weekdays: {
    flexDirection: 'row',
    paddingBottom: 8,
  },
  weekday: {
    width: `${100 / 7}%`,
    color: '#64748b',
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  day: {
    width: `${100 / 7}%`,
    minHeight: 66,
    borderWidth: 1,
    borderColor: '#eef2f7',
    backgroundColor: '#ffffff',
    padding: 7,
    gap: 4,
  },
  dayMuted: {
    backgroundColor: '#f8fafc',
  },
  today: {
    borderColor: '#2563eb',
    backgroundColor: '#eff6ff',
  },
  dayText: {
    color: '#0f172a',
    fontSize: 12,
    fontWeight: '900',
  },
  dayTextMuted: {
    color: '#94a3b8',
  },
  todayText: {
    color: '#1d4ed8',
  },
  dayEvents: {
    gap: 4,
  },
  eventLine: {
    height: 5,
    borderRadius: 999,
  },
  moreEvents: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '800',
  },
  taskDue: {
    backgroundColor: '#2563eb',
  },
  shift: {
    backgroundColor: '#059669',
  },
  leave: {
    backgroundColor: '#d97706',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14,
    paddingTop: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
  },
  legendText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '800',
  },
  event: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingVertical: 13,
  },
  eventStripe: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 999,
  },
  eventBody: {
    flex: 1,
    gap: 4,
  },
  eventTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '900',
  },
  eventMeta: {
    color: '#64748b',
    fontSize: 14,
  },
  eventType: {
    color: '#334155',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  pressed: {
    opacity: 0.72,
  },
});
