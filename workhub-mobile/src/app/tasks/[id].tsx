import { ProtectedScreen } from '@/components/protected-screen';
import { Badge, Button, Card, CardTitle, ErrorState, LoadingState, Row } from '@/components/ui';
import { formatDate, labelize } from '@/lib/format';
import { type Task, useMobileApi } from '@/lib/mobile-api';
import { useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const statuses = ['todo', 'in_progress', 'completed', 'cancelled'];

export default function TaskDetailsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const api = useMobileApi();
  const [task, setTask] = useState<Task | null>(null);
  const [notes, setNotes] = useState('');
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const nextTask = await api.task(id);
      setTask(nextTask);
      setNotes(nextTask.notes ?? '');
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to load task.');
    } finally {
      setIsLoading(false);
    }
  }, [api, id]);

  useEffect(() => {
    load();
  }, [load]);

  async function updateStatus(status: string) {
    if (!id || !task || task.status === status) {
      return;
    }

    const previousTask = task;
    setTask({ ...task, status });

    const didUpdate = await runUpdate(async () => {
      await api.updateTaskStatus(id, status);
    }, 'Unable to update task status.');

    if (!didUpdate) {
      setTask(previousTask);
    }
  }

  async function saveNotes() {
    if (!id) {
      return;
    }

    await runUpdate(async () => {
      await api.updateTaskNotes(id, notes.trim() || null);
      await load();
    }, 'Unable to save notes.');
  }

  async function addChecklistItem() {
    if (!id || !newChecklistTitle.trim()) {
      return;
    }

    await runUpdate(async () => {
      await api.addTaskChecklistItem(id, newChecklistTitle.trim());
      setNewChecklistTitle('');
      await load();
    }, 'Unable to add checklist item.');
  }

  async function toggleChecklistItem(itemId: number, isCompleted: boolean) {
    if (!id) {
      return;
    }

    await runUpdate(async () => {
      await api.toggleTaskChecklistItem(id, itemId, !isCompleted);
      await load();
    }, 'Unable to update checklist item.');
  }

  async function deleteChecklistItem(itemId: number) {
    if (!id) {
      return;
    }

    await runUpdate(async () => {
      await api.deleteTaskChecklistItem(id, itemId);
      await load();
    }, 'Unable to delete checklist item.');
  }

  async function runUpdate(action: () => Promise<void>, message: string) {
    setIsUpdating(true);
    setError(null);

    try {
      await action();
      return true;
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : message);
      return false;
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <ProtectedScreen title="Task Details">
      {isLoading ? (
        <LoadingState />
      ) : error && !task ? (
        <ErrorState message={error} onRetry={load} />
      ) : task ? (
        <ScrollView contentContainerStyle={styles.content}>
          <Card>
            <CardTitle>{task.title}</CardTitle>
            <View style={styles.badges}>
              <Badge label={labelize(task.status)} tone="blue" />
              <Badge label={labelize(task.priority)} tone="amber" />
            </View>
          </Card>

          <Card>
            <Row label="Description" value={task.description || 'No description'} />
            <Row label="Department" value={task.department} />
            <Row label="Assigned User" value={task.assignedUser} />
            <Row label="Due Date" value={formatDate(task.dueDate)} />
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Notes</Text>
            <TextInput
              editable={!isUpdating}
              multiline
              onChangeText={setNotes}
              placeholder="Add task notes"
              style={styles.textarea}
              value={notes}
            />
            <Button disabled={isUpdating} label="Save Notes" onPress={saveNotes} variant="secondary" />
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Checklist</Text>
            {task.checklistItems && task.checklistItems.length > 0 ? (
              <View style={styles.checklist}>
                {task.checklistItems.map((item) => (
                  <View key={item.id} style={styles.checklistItem}>
                    <Pressable
                      disabled={isUpdating}
                      onPress={() => toggleChecklistItem(item.id, item.isCompleted)}
                      style={[styles.checkbox, item.isCompleted && styles.checkboxDone]}
                    >
                      <Text style={styles.checkboxText}>{item.isCompleted ? '✓' : ''}</Text>
                    </Pressable>
                    <Text
                      numberOfLines={2}
                      style={[styles.checklistTitle, item.isCompleted && styles.checklistTitleDone]}
                    >
                      {item.title}
                    </Text>
                    <Pressable
                      disabled={isUpdating}
                      onPress={() => deleteChecklistItem(item.id)}
                      style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
                    >
                      <Text style={styles.deleteButtonText}>Delete</Text>
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.emptyText}>No checklist items.</Text>
            )}
            <View style={styles.addChecklist}>
              <TextInput
                editable={!isUpdating}
                onChangeText={setNewChecklistTitle}
                placeholder="New checklist item"
                style={styles.input}
                value={newChecklistTitle}
              />
              <Button disabled={isUpdating || !newChecklistTitle.trim()} label="Add" onPress={addChecklistItem} />
            </View>
          </Card>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <Card style={styles.actions}>
            <Text style={styles.sectionTitle}>Status</Text>
            {statuses.map((status) => (
              <Button
                key={status}
                disabled={isUpdating || task.status === status}
                label={labelize(status)}
                onPress={() => updateStatus(status)}
                variant={task.status === status ? 'primary' : 'secondary'}
              />
            ))}
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
  sectionTitle: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  textarea: {
    minHeight: 86,
    borderWidth: 1,
    borderColor: '#dbe3ef',
    borderRadius: 8,
    color: '#111827',
    fontSize: 14,
    paddingHorizontal: 10,
    paddingTop: 9,
    textAlignVertical: 'top',
  },
  input: {
    flex: 1,
    minHeight: 38,
    borderWidth: 1,
    borderColor: '#dbe3ef',
    borderRadius: 8,
    color: '#111827',
    fontSize: 14,
    paddingHorizontal: 10,
  },
  checklist: {
    gap: 8,
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    backgroundColor: '#ffffff',
  },
  checkboxDone: {
    borderColor: '#047857',
    backgroundColor: '#dcfce7',
  },
  checkboxText: {
    color: '#047857',
    fontSize: 15,
    fontWeight: '900',
  },
  checklistTitle: {
    flex: 1,
    color: '#0f172a',
    fontSize: 14,
    fontWeight: '700',
  },
  checklistTitleDone: {
    color: '#64748b',
    textDecorationLine: 'line-through',
  },
  deleteButton: {
    borderRadius: 8,
    backgroundColor: '#fee2e2',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  deleteButtonText: {
    color: '#b91c1c',
    fontSize: 11,
    fontWeight: '900',
  },
  addChecklist: {
    flexDirection: 'row',
    gap: 8,
  },
  emptyText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
  },
  actions: {
    gap: 8,
  },
  error: {
    color: '#b91c1c',
    marginTop: 4,
  },
  pressed: {
    opacity: 0.72,
  },
});
