import { useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Skeleton,
  Tooltip,
  IconButton,
  alpha,
} from '@mui/material';
import {
  Add as AddIcon,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format, addDays, startOfWeek, isSameDay, isToday } from 'date-fns';
import type { QueueEntry, QueueStatus } from '@/types';

interface WeekCalendarViewProps {
  queue: QueueEntry[];
  selectedDate: string;
  isLoading: boolean;
  onSlotClick: (slot: string) => void;
  onUpdateStatus: (queueId: string, status: QueueStatus) => void;
  onDateChange: (date: string) => void;
}

const statusColors: Record<QueueStatus, 'warning' | 'info' | 'success' | 'error'> = {
  Waiting: 'warning',
  Ongoing: 'info',
  Completed: 'success',
  Cancelled: 'error',
};

const START_HOUR = 9;
const END_HOUR = 18;

function generateHourSlots(): string[] {
  const slots: string[] = [];
  for (let h = START_HOUR; h < END_HOUR; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
  }
  return slots;
}

function formatTime12h(time: string): string {
  const [h] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH} ${period}`;
}

function getSlotHour(slot: string): number {
  return parseInt(slot.split(':')[0], 10);
}

// 15-min sub-labels within an hour
const QUARTER_OFFSETS = [15, 30, 45];

export default function WeekCalendarView({
  queue,
  selectedDate,
  isLoading,
  onSlotClick,
  onDateChange,
}: WeekCalendarViewProps) {
  const navigate = useNavigate();
  const selectedDateObj = new Date(selectedDate + 'T00:00:00');

  // Week starts on Monday
  const weekStart = useMemo(
    () => startOfWeek(selectedDateObj, { weekStartsOn: 1 }),
    [selectedDate], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const weekDays = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  const hourSlots = useMemo(() => generateHourSlots(), []);

  // Group queue entries by day-of-week + hour
  const queueByDayHour = useMemo(() => {
    const map = new Map<string, QueueEntry[]>();
    for (const entry of queue) {
      const entryDate = entry.queueDate?.split('T')[0] ?? selectedDate;
      const hour = getSlotHour(entry.slot);
      const key = `${entryDate}-${hour}`;
      const existing = map.get(key) ?? [];
      existing.push(entry);
      map.set(key, existing);
    }
    return map;
  }, [queue, selectedDate]);

  const handlePrevWeek = () => {
    onDateChange(format(addDays(weekStart, -7), 'yyyy-MM-dd'));
  };

  const handleNextWeek = () => {
    onDateChange(format(addDays(weekStart, 7), 'yyyy-MM-dd'));
  };

  if (isLoading) {
    return (
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ p: 2 }}>
          <Skeleton width={300} height={32} />
        </Box>
        {Array.from({ length: 6 }).map((_, i) => (
          <Box key={i} sx={{ display: 'flex', gap: 1, px: 2, py: 1, borderTop: '1px solid', borderColor: 'divider' }}>
            <Skeleton width={60} height={40} />
            {Array.from({ length: 7 }).map((__, j) => (
              <Skeleton key={j} width="100%" height={40} variant="rounded" />
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
          <TimeIcon color="primary" fontSize="small" />
          <Typography variant="subtitle1" fontWeight={700}>
            Week Schedule
          </Typography>
          <Chip
            label={`${format(weekStart, 'MMM d')} – ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ ml: 1 }}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <IconButton size="small" onClick={handlePrevWeek}>
            <ChevronLeftIcon />
          </IconButton>
          <IconButton size="small" onClick={handleNextWeek}>
            <ChevronRightIcon />
          </IconButton>
        </Box>
      </Box>

      {/* Day headers row */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: '80px repeat(7, 1fr)',
          borderBottom: '2px solid',
          borderColor: 'divider',
          bgcolor: 'background.default',
        }}
      >
        <Box sx={{ p: 1, borderRight: '1px solid', borderColor: 'divider' }} />
        {weekDays.map((day) => {
          const today = isToday(day);
          const selected = isSameDay(day, selectedDateObj);
          return (
            <Box
              key={day.toISOString()}
              onClick={() => onDateChange(format(day, 'yyyy-MM-dd'))}
              sx={{
                p: 1,
                textAlign: 'center',
                borderRight: '1px solid',
                borderColor: 'divider',
                cursor: 'pointer',
                bgcolor: selected ? (theme) => alpha(theme.palette.primary.main, 0.08) : undefined,
                '&:hover': { bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04) },
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 600,
                  color: today ? 'primary.main' : 'text.secondary',
                  textTransform: 'uppercase',
                  fontSize: '0.65rem',
                }}
              >
                {format(day, 'EEE')}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: today ? 700 : 500,
                  color: today ? 'primary.main' : 'text.primary',
                  ...(today && {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    borderRadius: '50%',
                    width: 28,
                    height: 28,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mx: 'auto',
                  }),
                }}
              >
                {format(day, 'd')}
              </Typography>
            </Box>
          );
        })}
      </Box>

      {/* Time grid */}
      <Box sx={{ maxHeight: 'calc(100vh - 380px)', overflowY: 'auto' }}>
        {hourSlots.map((hourSlot) => {
          const hour = getSlotHour(hourSlot);
          const nowHour = new Date().getHours();

          return (
            <Box key={hourSlot}>
              {/* Main hour row */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '80px repeat(7, 1fr)',
                  minHeight: 60,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                }}
              >
                {/* Time label */}
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'flex-end',
                    pr: 1.5,
                    pt: 0.5,
                    borderRight: '1px solid',
                    borderColor: 'divider',
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{ fontFamily: 'monospace', color: 'text.secondary', fontSize: '0.7rem' }}
                  >
                    {formatTime12h(hourSlot)}
                  </Typography>
                </Box>

                {/* Day cells */}
                {weekDays.map((day) => {
                  const dayStr = format(day, 'yyyy-MM-dd');
                  const key = `${dayStr}-${hour}`;
                  const entries = queueByDayHour.get(key) ?? [];
                  const isPast = isToday(day) && hour < nowHour;

                  return (
                    <Box
                      key={dayStr}
                      sx={{
                        p: 0.5,
                        borderRight: '1px solid',
                        borderColor: 'divider',
                        opacity: isPast ? 0.4 : 1,
                        minHeight: 60,
                        position: 'relative',
                        ...(isToday(day) && hour === nowHour && {
                          bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                        }),
                        '&:hover': {
                          bgcolor: isPast ? undefined : (theme) => alpha(theme.palette.action.hover, 0.04),
                        },
                      }}
                    >
                      {entries.map((entry) => (
                        <Tooltip
                          key={entry.queueId}
                          title={`${entry.patientName} — ${entry.uhid} (${entry.status})`}
                        >
                          <Box
                            onClick={() => navigate(`/visit-details/${entry.patientId}`)}
                            sx={{
                              px: 0.75,
                              py: 0.25,
                              mb: 0.25,
                              borderRadius: 1,
                              bgcolor: (theme) => alpha(theme.palette[statusColors[entry.status]].main, 0.12),
                              borderLeft: '3px solid',
                              borderColor: `${statusColors[entry.status]}.main`,
                              cursor: 'pointer',
                              '&:hover': { boxShadow: 1 },
                            }}
                          >
                            <Typography variant="caption" fontWeight={600} noWrap sx={{ fontSize: '0.65rem' }}>
                              {entry.patientName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block', fontSize: '0.6rem' }}>
                              {entry.slot}
                            </Typography>
                          </Box>
                        </Tooltip>
                      ))}
                      {!isPast && entries.length === 0 && (
                        <Box
                          onClick={() => {
                            onDateChange(dayStr);
                            onSlotClick(`${String(hour).padStart(2, '0')}:00`);
                          }}
                          sx={{
                            height: '100%',
                            minHeight: 50,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            opacity: 0,
                            transition: 'opacity 0.15s',
                            '&:hover': { opacity: 1 },
                          }}
                        >
                          <AddIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>

              {/* 15-minute dotted sub-lines: :15, :30, :45 */}
              {QUARTER_OFFSETS.map((min) => (
                <Box
                  key={`${hourSlot}-${min}`}
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: '80px repeat(7, 1fr)',
                    height: 20,
                    borderBottom: '1px dotted',
                    borderColor: 'divider',
                  }}
                >
                  {/* Quarter time label */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      pr: 1.5,
                      borderRight: '1px solid',
                      borderColor: 'divider',
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{ fontFamily: 'monospace', color: 'text.disabled', fontSize: '0.6rem' }}
                    >
                      :{String(min).padStart(2, '0')}
                    </Typography>
                  </Box>
                  {/* Empty cells for each day column */}
                  {weekDays.map((day) => {
                    const dayStr = format(day, 'yyyy-MM-dd');
                    const isPast = isToday(day) && (hour < nowHour || (hour === nowHour && min <= new Date().getMinutes()));
                    return (
                      <Box
                        key={dayStr}
                        onClick={() => {
                          if (!isPast) {
                            onDateChange(dayStr);
                            onSlotClick(`${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
                          }
                        }}
                        sx={{
                          borderRight: '1px solid',
                          borderColor: 'divider',
                          opacity: isPast ? 0.3 : 1,
                          cursor: isPast ? 'default' : 'pointer',
                          '&:hover': {
                            bgcolor: isPast ? undefined : (theme) => alpha(theme.palette.primary.main, 0.04),
                          },
                        }}
                      />
                    );
                  })}
                </Box>
              ))}
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}
