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
import { formatDateTime, labelize } from '@/lib/format';
import { type Shift, useMobileApi } from '@/lib/mobile-api';
import { Link } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

export default function ShiftsScreen() {
  const api = useMobileApi();
  const [items, setItems] = useState<Shift[]>([]);
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
        const response = await api.shifts(nextPage);
        setItems(response.items);
        setPage(response.page);
        setTotalPages(response.totalPages);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Unable to load shifts.');
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [api],
  );

  useEffect(() => {
    load(1);
  }, [load]);

  return (
    <ProtectedScreen title="Shifts">
      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => load(page)} />
      ) : items.length === 0 ? (
        <MessageState message="No shifts found." />
      ) : (
        <>
          <FlatList
            contentContainerStyle={styles.list}
            data={items}
            keyExtractor={(item) => String(item.id)}
            onRefresh={() => load(1, true)}
            refreshing={isRefreshing}
            renderItem={({ item }) => (
              <Link href={{ pathname: '/shifts/[id]', params: { id: String(item.id) } }} asChild>
                <Pressable style={({ pressed }) => pressed && styles.pressed}>
                  <Card>
                    <View style={styles.cardHeader}>
                      <CardTitle>{item.title}</CardTitle>
                      <Badge label={labelize(item.status)} tone={shiftTone(item.status)} />
                    </View>
                    <CardMeta>{item.department}</CardMeta>
                    <View style={styles.timeBlock}>
                      <Text style={styles.time}>{formatDateTime(item.startTime)}</Text>
                      <Text style={styles.timeMuted}>to {formatDateTime(item.endTime)}</Text>
                    </View>
                    <View style={styles.metaRow}>
                      <Text style={styles.location}>{item.location ?? 'No location'}</Text>
                      <Text style={styles.count}>{item.assignedEmployeeCount ?? 0} assigned</Text>
                    </View>
                  </Card>
                </Pressable>
              </Link>
            )}
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

function shiftTone(status: string) {
  if (status === 'scheduled') {
    return 'blue' as const;
  }

  if (status === 'completed') {
    return 'green' as const;
  }

  if (status === 'cancelled') {
    return 'red' as const;
  }

  return 'neutral' as const;
}

const styles = StyleSheet.create({
  list: {
    gap: 8,
    paddingBottom: 6,
  },
  pressed: {
    opacity: 0.72,
  },
  cardHeader: {
    gap: 6,
  },
  timeBlock: {
    gap: 2,
  },
  time: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '900',
  },
  timeMuted: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  location: {
    flex: 1,
    color: '#475569',
    fontSize: 12,
    fontWeight: '800',
  },
  count: {
    color: '#475569',
    fontSize: 12,
    fontWeight: '800',
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
