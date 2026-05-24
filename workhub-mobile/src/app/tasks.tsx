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
import { type Task, useMobileApi } from '@/lib/mobile-api';
import { Link } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

export default function TasksScreen() {
  const api = useMobileApi();
  const [tasks, setTasks] = useState<Task[]>([]);
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
        const response = await api.tasks(nextPage);
        setTasks(response.items);
        setPage(response.page);
        setTotalPages(response.totalPages);
      } catch (caughtError) {
        setError(caughtError instanceof Error ? caughtError.message : 'Unable to load tasks.');
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
    <ProtectedScreen title="Tasks">
      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => load(page)} />
      ) : tasks.length === 0 ? (
        <MessageState message="No tasks found." />
      ) : (
        <>
          <FlatList
            contentContainerStyle={styles.list}
            data={tasks}
            keyExtractor={(item) => String(item.id)}
            onRefresh={() => load(1, true)}
            refreshing={isRefreshing}
            renderItem={({ item }) => (
              <Link href={{ pathname: '/tasks/[id]', params: { id: String(item.id) } }} asChild>
                <Pressable style={({ pressed }) => pressed && styles.pressed}>
                  <Card>
                    <View style={styles.cardHeader}>
                      <CardTitle>{item.title}</CardTitle>
                      <Badge label={labelize(item.priority)} tone={priorityTone(item.priority)} />
                    </View>
                    <CardMeta>{item.department}</CardMeta>
                    <View style={styles.metaRow}>
                      <Badge label={labelize(item.status)} tone={statusTone(item.status)} />
                      <Text style={styles.dueDate}>Due {formatDate(item.dueDate)}</Text>
                    </View>
                  </Card>
                </Pressable>
              </Link>
            )}
          />
          <View style={styles.pager}>
            <Button
              disabled={page <= 1}
              label="Previous"
              onPress={() => load(page - 1)}
              variant="secondary"
            />
            <Text style={styles.page}>Page {page} of {totalPages}</Text>
            <Button
              disabled={page >= totalPages}
              label="Next"
              onPress={() => load(page + 1)}
              variant="secondary"
            />
          </View>
        </>
      )}
    </ProtectedScreen>
  );
}

function statusTone(status: string) {
  if (status === 'completed') {
    return 'green' as const;
  }

  if (status === 'cancelled') {
    return 'red' as const;
  }

  if (status === 'in_progress') {
    return 'blue' as const;
  }

  return 'neutral' as const;
}

function priorityTone(priority: string) {
  if (priority === 'high' || priority === 'urgent') {
    return 'red' as const;
  }

  if (priority === 'medium') {
    return 'amber' as const;
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  dueDate: {
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
