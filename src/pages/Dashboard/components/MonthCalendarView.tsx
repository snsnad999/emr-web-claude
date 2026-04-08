import { useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Skeleton,
  IconButton,
  Tooltip,
  alpha,
} from '@mui/material';
import {
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  CalendarMonth as CalendarIcon,
} from '@mui/icons-material';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
} from 'date-fns';
import type { QueueEntry } from '@/types';

interface MonthCalendarViewProps {
  queue: QueueEntry[];
  selectedDate: string;
  isLoading: boolean;
  onDateChange: (date: string) => void;
  onViewDay: (date: string) => void;
}

const statusDotColors: Record<string, string> = {
  Waiting: '#f59e0b',
  Ongoing: '#3b82f6',
  Completed: '#10b981',
  Cancelled: '#ef4444',
};

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export default function MonthCalendarView({
  queue,
  selectedDate,
  isLoading,
  onDateChange,
  onViewDay,
}: MonthCalendarViewProps) {
  const selectedDateObj = new Date(selectedDate + 'T00:00:00');

  const monthStart = useMemo(() => startOfMonth(selectedDateObj), [selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps
  const monthEnd = useMemo(() => endOfMonth(selectedDateObj), [selectedDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Calendar grid: start from Monday of the week containing monthStart
  const calendarStart = useMemo(() => startOfWeek(monthStart, { weekStartsOn: 1 }), [monthStart]);
  const calendarEnd = useMemo(() => endOfWeek(monthEnd, { weekStartsOn: 1 }), [monthEnd]);

  const calendarDays = useMemo(() => {
    const days: Date[] = [];
    let current = calendarStart;
    while (current <= calendarEnd) {
      days.push(current);
      current = addDays(current, 1);
    }
    return days;
  }, [calendarStart, calendarEnd]);

  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < calendarDays.length; i += 7) {
      result.push(calendarDays.slice(i, i + 7));
    }
    return result;
  }, [calendarDays]);

  // Group queue entries by date
  const queueByDate = useMemo(() => {
    const map = new Map<string, QueueEntry[]>();
    for (const entry of queue) {
      const dateKey = entry.queueDate?.split('T')[0] ?? selectedDate;
      const existing = map.get(dateKey) ?? [];
      existing.push(entry);
      map.set(dateKey, existing);
    }
    return map;
  }, [queue, selectedDate]);

  const handlePrevMonth = () => {
    onDateChange(format(subMonths(selectedDateObj, 1), 'yyyy-MM-dd'));
  };

  const handleNextMonth = () => {
    onDateChange(format(addMonths(selectedDateObj, 1), 'yyyy-MM-dd'));
  };

  if (isLoading) {
    return (
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ p: 2 }}>
          <Skeleton width={250} height={32} />
        </Box>
        {Array.from({ length: 5 }).map((_, i) => (
          <Box key={i} sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, px: 2, py: 1 }}>
            {Array.from({ length: 7 }).map((__, j) => (
              <Skeleton key={j} height={80} variant="rounded" />
            ))}
          </Box>
        ))}
      </Paper>
    );
  }

  return (
    <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.default',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <CalendarIcon color="primary" fontSize="small" />
          <Typography variant="subtitle1" fontWeight={700}>
            {format(selectedDateObj, 'MMMM yyyy')}
          </Typography>
          <Chip
            label={`${queue.length} appointment${queue.length !== 1 ? 's' : ''}`}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ ml: 1 }}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton size="small" onClick={handlePrevMonth}>
            <ChevronLeftIcon />
          </IconButton>
          <IconButton size="small" onClick={handleNextMonth}>
            <ChevronRightIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Day-of-week header */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          borderBottom: '2px solid',
          borderColor: 'divider',
          bgcolor: 'background.default',
        }}
      >
        {DAY_LABELS.map((label) => (
          <Box key={label} sx={{ py: 1, textAlign: 'center' }}>
            <Typography variant="caption" fontWeight={600} color="text.secondary" sx={{ textTransform: 'uppercase', fontSize: '0.65rem' }}>
              {label}
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Calendar grid */}
      <Box>
        {weeks.map((week, wi) => (
          <Box
            key={wi}
            sx={{
              display: 'grid',
              gridTemplateColumns: 'repeat(7, 1fr)',
              borderBottom: wi < weeks.length - 1 ? '1px solid' : 'none',
              borderColor: 'divider',
            }}
          >
            {week.map((day) => {
              const dayStr = format(day, 'yyyy-MM-dd');
              const entries = queueByDate.get(dayStr) ?? [];
              const inMonth = isSameMonth(day, selectedDateObj);
              const today = isToday(day);
              const selected = isSameDay(day, selectedDateObj);

              const statusCounts = entries.reduce<Record<string, number>>((acc, e) => {
                acc[e.status] = (acc[e.status] ?? 0) + 1;
                return acc;
              }, {});

              return (
                <Box
                  key={dayStr}
                  onClick={() => onViewDay(dayStr)}
                  sx={{
                    minHeight: 90,
                    p: 0.75,
                    borderRight: '1px solid',
                    borderColor: 'divider',
                    cursor: 'pointer',
                    opacity: inMonth ? 1 : 0.35,
                    bgcolor: selected
                      ? (theme) => alpha(theme.palette.primary.main, 0.06)
                      : today
                        ? (theme) => alpha(theme.palette.primary.main, 0.03)
                        : undefined,
                    transition: 'background-color 0.15s',
                    '&:hover': {
                      bgcolor: (theme) => alpha(theme.palette.primary.main, 0.08),
                    },
                    '&:last-child': { borderRight: 'none' },
                  }}
                >
                  {/* Day number */}
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: today ? 700 : 500,
                      fontSize: '0.8rem',
                      ...(today && {
                        bgcolor: 'primary.main',
                        color: 'primary.contrastText',
                        borderRadius: '50%',
                        width: 24,
                        height: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }),
                      ...(!today && {
                        color: inMonth ? 'text.primary' : 'text.disabled',
                      }),
                    }}
                  >
                    {format(day, 'd')}
                  </Typography>

                  {/* Appointment indicators */}
                  {entries.length > 0 && (
                    <Box sx={{ mt: 0.5 }}>
                      {/* Show up to 3 individual entries */}
                      {entries.slice(0, 3).map((entry) => (
                        <Tooltip key={entry.queueId} title={`${entry.patientName} — ${entry.slot} (${entry.status})`}>
                          <Box
                            sx={{
                              px: 0.5,
                              py: 0.125,
                              mb: 0.25,
                              borderRadius: 0.5,
                              bgcolor: alpha(statusDotColors[entry.status] ?? '#9ca3af', 0.15),
                              borderLeft: '2px solid',
                              borderColor: statusDotColors[entry.status] ?? '#9ca3af',
                            }}
                          >
                            <Typography variant="caption" noWrap sx={{ fontSize: '0.6rem', fontWeight: 500 }}>
                              {entry.patientName}
                            </Typography>
                          </Box>
                        </Tooltip>
                      ))}
                      {entries.length > 3 && (
                        <Typography variant="caption" color="primary" sx={{ fontSize: '0.6rem', fontWeight: 600 }}>
                          +{entries.length - 3} more
                        </Typography>
                      )}

                      {/* Status dots summary */}
                      <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                        {Object.entries(statusCounts).map(([status, count]) => (
                          <Tooltip key={status} title={`${count} ${status}`}>
                            <Box
                              sx={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                bgcolor: statusDotColors[status] ?? '#9ca3af',
                              }}
                            />
                          </Tooltip>
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              );
            })}
          </Box>
        ))}
      </Box>
    </Paper>
  );
}
