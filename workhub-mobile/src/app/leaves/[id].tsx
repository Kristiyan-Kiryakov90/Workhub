import { ProtectedScreen } from '@/components/protected-screen';
import { Badge, Button, Card, CardTitle, ErrorState, LoadingState, Row } from '@/components/ui';
import { formatDate, labelize } from '@/lib/format';
import { type LeaveRequest, useMobileApi } from '@/lib/mobile-api';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

export default function LeaveDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const api = useMobileApi();
  const [leave, setLeave] = useState<LeaveRequest | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      setLeave(await api.leave(id));
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to load leave request.');
    } finally {
      setIsLoading(false);
    }
  }, [api, id]);

  useEffect(() => {
    load();
  }, [load]);

  async function review(decision: 'approved' | 'rejected') {
    if (!id) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (decision === 'approved') {
        await api.approveLeave(id);
      } else {
        await api.rejectLeave(id, reviewComment.trim() || null);
      }

      await load();
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to review request.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ProtectedScreen title="Leave Details">
      {isLoading ? (
        <LoadingState />
      ) : error && !leave ? (
        <ErrorState message={error} onRetry={load} />
      ) : leave ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Card>
            <CardTitle>{labelize(leave.type)}</CardTitle>
            <View style={styles.badges}>
              <Badge label={labelize(leave.status)} tone="amber" />
            </View>
          </Card>
          <Card>
            <Row label="Start Date" value={formatDate(leave.startDate)} />
            <Row label="End Date" value={formatDate(leave.endDate)} />
            <Row label="Reason" value={leave.reason || 'No reason provided'} />
            <Row label="Review Comment" value={leave.reviewComment || 'No review comment'} />
            <Row label="Reviewer" value={leave.reviewedByName || 'Not reviewed'} />
          </Card>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {leave.canReview ? (
            <Card style={styles.actions}>
              <TextInput
                editable={!isSubmitting}
                onChangeText={setReviewComment}
                placeholder="Review comment for rejection"
                style={styles.input}
                value={reviewComment}
              />
              <Button disabled={isSubmitting} label="Approve" onPress={() => review('approved')} />
              <Button
                disabled={isSubmitting}
                label="Reject"
                onPress={() => review('rejected')}
                variant="danger"
              />
            </Card>
          ) : null}
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
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    color: '#111827',
    fontSize: 16,
    paddingHorizontal: 12,
  },
  actions: {
    gap: 10,
  },
  error: {
    color: '#b91c1c',
    marginTop: 12,
  },
});
