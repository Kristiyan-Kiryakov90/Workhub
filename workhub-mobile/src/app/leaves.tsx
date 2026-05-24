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
import { formatDate, labelize } from '@/lib/format';
import { type LeaveRequest, useMobileApi } from '@/lib/mobile-api';
import { useFocusEffect } from '@react-navigation/native';
import { Link, useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

export default function LeavesScreen() {
  const api = useMobileApi();
  const router = useRouter();
  const [items, setItems] = useState<LeaveRequest[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasLoadedRef = useRef(false);

  const load = useCallback(
    async (nextPage = 1, refreshing = false) => {
      if (refreshing || hasLoadedRef.current) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      try {
        const response = await api.leaves(nextPage);
        setItems(response.items);
        setPage(response.page);
        setTotalPages(response.totalPages);
      } catch (caughtError) {
        setError(
          caughtError instanceof Error ? caughtError.message : 'Unable to load leave requests.',
        );
      } finally {
        hasLoadedRef.current = true;
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

  return (
    <ProtectedScreen title="Leave Requests">
      <View style={styles.action}>
        <Button label="Request Leave" onPress={() => router.push('/leaves/create')} />
      </View>
      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => load(page)} />
      ) : items.length === 0 ? (
        <MessageState message="No leave requests found." />
      ) : (
        <>
          <FlatList
            contentContainerStyle={styles.list}
            data={items}
            keyExtractor={(item) => String(item.id)}
            onRefresh={() => load(1, true)}
            refreshing={isRefreshing}
            renderItem={({ item }) => (
              <Link href={{ pathname: '/leaves/[id]', params: { id: String(item.id) } }} asChild>
                <Pressable style={({ pressed }) => pressed && styles.pressed}>
                  <Card>
                    <View style={styles.cardHeader}>
                      <CardTitle>{labelize(item.type)}</CardTitle>
                      <Badge label={labelize(item.status)} tone={leaveTone(item.status)} />
                    </View>
                    <CardMeta>{item.department ?? item.departmentName ?? 'Department not set'}</CardMeta>
                    <View style={styles.dateRow}>
                      <View>
                        <Text style={styles.dateLabel}>Starts</Text>
                        <Text style={styles.dateValue}>{formatDate(item.startDate)}</Text>
                      </View>
                      <View>
                        <Text style={styles.dateLabel}>Ends</Text>
                        <Text style={styles.dateValue}>{formatDate(item.endDate)}</Text>
                      </View>
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

function leaveTone(status: string) {
  if (status === 'approved') {
    return 'green' as const;
  }

  if (status === 'rejected') {
    return 'red' as const;
  }

  if (status === 'pending') {
    return 'amber' as const;
  }

  return 'neutral' as const;
}

const styles = StyleSheet.create({
  action: {
    marginBottom: 14,
  },
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
  dateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  dateLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  dateValue: {
    color: '#0f172a',
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
