import { ProtectedScreen } from '@/components/protected-screen';
import { Button, Card } from '@/components/ui';
import { labelize } from '@/lib/format';
import { useMobileApi } from '@/lib/mobile-api';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

const leaveTypes = ['sick', 'vacation', 'unpaid', 'remote', 'personal', 'training'];
const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
type DateField = 'start' | 'end';

export default function CreateLeaveRequestScreen() {
  const api = useMobileApi();
  const router = useRouter();
  const [leaveType, setLeaveType] = useState('vacation');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activeDateField, setActiveDateField] = useState<DateField | null>(null);
  const [calendarMonth, setCalendarMonth] = useState(() => startOfMonth(new Date()));
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openDatePicker(field: DateField) {
    const selectedDate = field === 'start' ? startDate : endDate;
    setCalendarMonth(startOfMonth(parseIsoDate(selectedDate) ?? new Date()));
    setActiveDateField(field);
  }

  function selectDate(value: string) {
    if (activeDateField === 'start') {
      setStartDate(value);
    } else if (activeDateField === 'end') {
      setEndDate(value);
    }

    setActiveDateField(null);
  }

  async function submit() {
    const trimmedStartDate = startDate.trim();
    const trimmedEndDate = endDate.trim();
    const trimmedReason = reason.trim();

    if (!trimmedStartDate || !trimmedEndDate) {
      setError('Start date and end date are required.');
      return;
    }

    if (!isIsoDate(trimmedStartDate) || !isIsoDate(trimmedEndDate)) {
      setError('Enter dates in YYYY-MM-DD format.');
      return;
    }

    if (trimmedEndDate < trimmedStartDate) {
      setError('End date must be on or after the start date.');
      return;
    }

    if (trimmedReason.length > 1000) {
      setError('Keep the reason under 1000 characters.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await api.createLeave({
        leaveType,
        startDate: trimmedStartDate,
        endDate: trimmedEndDate,
        reason: trimmedReason || null,
      });
      router.replace({ pathname: '/leaves/[id]', params: { id: String(response.id) } });
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Unable to request leave.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ProtectedScreen title="Create Leave Request">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Card style={styles.form}>
            <Text style={styles.label}>Leave Type</Text>
            <View style={styles.types}>
              {leaveTypes.map((type) => (
                <Button
                  key={type}
                  disabled={isSubmitting}
                  label={labelize(type)}
                  onPress={() => setLeaveType(type)}
                  variant={leaveType === type ? 'primary' : 'secondary'}
                />
              ))}
            </View>
            <Text style={styles.label}>Start Date</Text>
            <DateFieldButton
              disabled={isSubmitting}
              label="Start date"
              onPress={() => openDatePicker('start')}
              value={startDate}
            />
            <Text style={styles.label}>End Date</Text>
            <DateFieldButton
              disabled={isSubmitting}
              label="End date"
              onPress={() => openDatePicker('end')}
              value={endDate}
            />
            <Text style={styles.label}>Reason</Text>
            <TextInput
              editable={!isSubmitting}
              maxLength={1000}
              multiline
              onChangeText={setReason}
              placeholder="Optional"
              style={[styles.input, styles.textarea]}
              value={reason}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Button
              disabled={isSubmitting}
              label={isSubmitting ? 'Submitting...' : 'Submit Request'}
              onPress={submit}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
      <CalendarPicker
        month={calendarMonth}
        onChangeMonth={setCalendarMonth}
        onClose={() => setActiveDateField(null)}
        onSelectDate={selectDate}
        selectedDate={activeDateField === 'start' ? startDate : endDate}
        title={activeDateField === 'start' ? 'Choose Start Date' : 'Choose End Date'}
        visible={activeDateField !== null}
      />
    </ProtectedScreen>
  );
}

function DateFieldButton({
  disabled,
  label,
  onPress,
  value,
}: {
  disabled: boolean;
  label: string;
  onPress: () => void;
  value: string;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.dateField,
        pressed && styles.pressed,
        disabled && styles.disabledField,
      ]}
    >
      <Text style={[styles.dateFieldText, !value && styles.placeholderText]}>
        {value || 'Choose date'}
      </Text>
      <Text style={styles.dateFieldIcon}>Calendar</Text>
    </Pressable>
  );
}

function CalendarPicker({
  month,
  onChangeMonth,
  onClose,
  onSelectDate,
  selectedDate,
  title,
  visible,
}: {
  month: Date;
  onChangeMonth: (value: Date) => void;
  onClose: () => void;
  onSelectDate: (value: string) => void;
  selectedDate: string;
  title: string;
  visible: boolean;
}) {
  const days = getCalendarDays(month);

  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.modalShell}>
        <Pressable accessibilityLabel="Close calendar" onPress={onClose} style={styles.backdrop} />
        <View style={styles.calendarPanel}>
          <View style={styles.calendarHeader}>
            <View>
              <Text style={styles.calendarTitle}>{title}</Text>
              <Text style={styles.calendarMonth}>{formatMonth(month)}</Text>
            </View>
            <Pressable
              accessibilityLabel="Close calendar"
              onPress={onClose}
              style={({ pressed }) => [styles.closeButton, pressed && styles.pressed]}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </Pressable>
          </View>
          <View style={styles.monthControls}>
            <Pressable
              accessibilityLabel="Previous month"
              onPress={() => onChangeMonth(addMonths(month, -1))}
              style={({ pressed }) => [styles.monthButton, pressed && styles.pressed]}
            >
              <Text style={styles.monthButtonText}>{'<'}</Text>
            </Pressable>
            <Pressable
              accessibilityLabel="Next month"
              onPress={() => onChangeMonth(addMonths(month, 1))}
              style={({ pressed }) => [styles.monthButton, pressed && styles.pressed]}
            >
              <Text style={styles.monthButtonText}>{'>'}</Text>
            </Pressable>
          </View>
          <View style={styles.weekdayGrid}>
            {weekdayLabels.map((weekday) => (
              <Text key={weekday} style={styles.weekday}>
                {weekday}
              </Text>
            ))}
          </View>
          <View style={styles.dayGrid}>
            {days.map((day, index) =>
              day ? (
                <Pressable
                  accessibilityLabel={`Select ${day.iso}`}
                  accessibilityRole="button"
                  key={day.iso}
                  onPress={() => onSelectDate(day.iso)}
                  style={({ pressed }) => [
                    styles.dayButton,
                    day.iso === selectedDate && styles.selectedDayButton,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.dayButtonText,
                      day.iso === selectedDate && styles.selectedDayButtonText,
                    ]}
                  >
                    {day.label}
                  </Text>
                </Pressable>
              ) : (
                <View key={`empty-${index}`} style={styles.dayButton} />
              ),
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

function parseIsoDate(value: string) {
  if (!isIsoDate(value)) {
    return null;
  }

  const [year, month, day] = value.split('-').map(Number);

  return new Date(year, month - 1, day);
}

function startOfMonth(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

function addMonths(value: Date, amount: number) {
  return new Date(value.getFullYear(), value.getMonth() + amount, 1);
}

function formatMonth(value: Date) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'long',
    year: 'numeric',
  }).format(value);
}

function getCalendarDays(month: Date) {
  const firstDay = startOfMonth(month);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const days: ({ iso: string; label: number } | null)[] = [];

  for (let index = 0; index < firstDay.getDay(); index += 1) {
    days.push(null);
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    days.push({
      iso: toLocalIsoDate(new Date(month.getFullYear(), month.getMonth(), day)),
      label: day,
    });
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
}

function toLocalIsoDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: 16,
  },
  form: {
    gap: 9,
  },
  label: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '700',
  },
  types: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  input: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    color: '#111827',
    fontSize: 14,
    paddingHorizontal: 12,
  },
  dateField: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
  },
  dateFieldText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '700',
  },
  placeholderText: {
    color: '#6b7280',
    fontWeight: '500',
  },
  dateFieldIcon: {
    color: '#2563eb',
    fontSize: 12,
    fontWeight: '800',
  },
  disabledField: {
    opacity: 0.55,
  },
  pressed: {
    opacity: 0.72,
  },
  textarea: {
    minHeight: 78,
    paddingTop: 12,
    textAlignVertical: 'top',
  },
  error: {
    color: '#b91c1c',
  },
  modalShell: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.38)',
  },
  calendarPanel: {
    gap: 14,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: '#ffffff',
    padding: 18,
    paddingBottom: 24,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  calendarTitle: {
    color: '#0f172a',
    fontSize: 18,
    fontWeight: '900',
  },
  calendarMonth: {
    marginTop: 3,
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
  },
  closeButton: {
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 12,
  },
  closeButtonText: {
    color: '#0f172a',
    fontSize: 13,
    fontWeight: '800',
  },
  monthControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  monthButton: {
    width: 46,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#dbe3ef',
    borderRadius: 8,
    backgroundColor: '#f8fafc',
  },
  monthButtonText: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '900',
  },
  weekdayGrid: {
    flexDirection: 'row',
  },
  weekday: {
    width: `${100 / 7}%`,
    color: '#64748b',
    fontSize: 11,
    fontWeight: '900',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayButton: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  selectedDayButton: {
    backgroundColor: '#2563eb',
  },
  dayButtonText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
  },
  selectedDayButtonText: {
    color: '#ffffff',
  },
});
