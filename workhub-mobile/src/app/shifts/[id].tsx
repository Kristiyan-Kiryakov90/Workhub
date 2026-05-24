import { ProtectedScreen } from '@/components/protected-screen';
import { Badge, Card, CardTitle, ErrorState, LoadingState, Row } from '@/components/ui';
import { formatDateTime, labelize } from '@/lib/format';
import { type Shift, useMobileApi } from '@/lib/mobile-api';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

export default function ShiftDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const api = useMobileApi();
  const [shift, setShift] = useState<Shift | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      setShift(await api.shift(id));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to load shift.');
    } finally {
      setIsLoading(false);
    }
  }, [api, id]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ProtectedScreen title="Shift Details">
      {isLoading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : shift ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Card>
            <CardTitle>{shift.title}</CardTitle>
            <View style={styles.badges}>
              <Badge label={labelize(shift.status)} tone="blue" />
              <Badge label={shift.department} />
            </View>
          </Card>
          <Card>
            <Row label="Start Time" value={formatDateTime(shift.startTime)} />
            <Row label="End Time" value={formatDateTime(shift.endTime)} />
            <Row label="Location" value={shift.location} />
            <Row
              label="Assigned Employees"
              value={
                shift.assignedEmployees?.map((employee) => employee.name).join(', ') ||
                'No assigned employees'
              }
            />
            <Row label="Notes" value={shift.notes || 'No notes'} />
          </Card>
        </ScrollView>
      ) : null}
    </ProtectedScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 9,
    paddingBottom: 16,
  },
  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
});
