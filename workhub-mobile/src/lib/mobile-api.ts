import { withQuery } from './api';
import { useAuth } from './auth';
import { useMemo } from 'react';

const mobilePageSize = 5;

export type PagedResponse<T> = {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
};

export type CalendarEvent = {
  id: string;
  title: string;
  type: 'task_due' | 'shift' | 'leave';
  start: string;
  end: string;
  leaveType?: string | null;
  departmentName: string;
  actionUrl: string;
};

export type DashboardResponse = {
  calendarEvents: CalendarEvent[];
};

export type Task = {
  id: number;
  title: string;
  description: string | null;
  notes: string | null;
  department: string;
  assignedUser: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  checklistItems?: TaskChecklistItem[];
};

export type TaskChecklistItem = {
  id: number;
  title: string;
  isCompleted: boolean;
  position: number;
};

export type Shift = {
  id: number;
  title: string;
  department: string;
  startTime: string;
  endTime: string;
  location: string | null;
  status: string;
  assignedEmployeeCount?: number;
  assignedEmployees?: { id: number; name: string; email: string }[];
  notes?: string | null;
};

export type LeaveRequest = {
  id: number;
  type: string;
  startDate: string;
  endDate: string;
  reason: string | null;
  status: string;
  reviewComment: string | null;
  reviewedAt?: string | null;
  createdAt?: string;
  employeeName?: string;
  employeeEmail?: string;
  department?: string;
  departmentName?: string;
  reviewedByName?: string | null;
  canReview?: boolean;
};

export type NotificationItem = {
  id: number;
  type: string;
  title: string;
  message: string;
  actionUrl: string | null;
  isRead: boolean;
  createdAt: string;
};

export type LeaveInput = {
  leaveType: string;
  startDate: string;
  endDate: string;
  reason: string | null;
};

export function useMobileApi() {
  const { authenticatedGet, authenticatedPost } = useAuth();

  return useMemo(
    () => ({
      dashboard: (startDate: string, endDate: string, departmentId?: number) =>
        authenticatedGet<DashboardResponse>(
          withQuery('/dashboard', { startDate, endDate, departmentId, summary: '0' }),
        ),
      tasks: (page: number) =>
        authenticatedGet<PagedResponse<Task>>(withQuery('/tasks', { page, pageSize: mobilePageSize })),
      task: (id: string | number) => authenticatedGet<Task>(`/tasks/${id}`),
      updateTaskStatus: (id: string | number, status: string) =>
        authenticatedPost<{ ok: true; status: string }>(`/tasks/${id}/status`, { status }),
      updateTaskNotes: (id: string | number, notes: string | null) =>
        authenticatedPost<{ ok: true }>(`/tasks/${id}/notes`, { notes }),
      addTaskChecklistItem: (id: string | number, title: string) =>
        authenticatedPost<{ ok: true; item: TaskChecklistItem }>(`/tasks/${id}/checklist`, { title }),
      toggleTaskChecklistItem: (
        id: string | number,
        itemId: string | number,
        isCompleted: boolean,
      ) =>
        authenticatedPost<{ ok: true }>(`/tasks/${id}/checklist/${itemId}/toggle`, {
          isCompleted,
        }),
      deleteTaskChecklistItem: (id: string | number, itemId: string | number) =>
        authenticatedPost<{ ok: true }>(`/tasks/${id}/checklist/${itemId}/delete`),
      shifts: (page: number) =>
        authenticatedGet<PagedResponse<Shift>>(withQuery('/shifts', { page, pageSize: mobilePageSize })),
      shift: (id: string | number) => authenticatedGet<Shift>(`/shifts/${id}`),
      leaves: (page: number) =>
        authenticatedGet<PagedResponse<LeaveRequest>>(
          withQuery('/leave', { page, pageSize: mobilePageSize, count: '0' }),
        ),
      leave: (id: string | number) => authenticatedGet<LeaveRequest>(`/leave/${id}`),
      createLeave: (input: LeaveInput) =>
        authenticatedPost<{ id: number; status: string }>('/leave', input),
      approveLeave: (id: string | number) =>
        authenticatedPost<{ ok: true }>(`/leave/${id}/approve`),
      rejectLeave: (id: string | number, reviewComment: string | null) =>
        authenticatedPost<{ ok: true }>(`/leave/${id}/reject`, { reviewComment }),
      notifications: (page: number) =>
        authenticatedGet<PagedResponse<NotificationItem>>(
          withQuery('/notifications', { page, pageSize: mobilePageSize }),
        ),
      unreadNotificationCount: () =>
        authenticatedGet<{ unreadCount: number }>('/notifications/unread-count'),
      readNotification: (id: string | number) =>
        authenticatedPost<{ ok: true }>(`/notifications/${id}/read`),
      readAllNotifications: () => authenticatedPost<{ ok: true }>('/notifications/read-all'),
    }),
    [authenticatedGet, authenticatedPost],
  );
}
