import { useMemo, useRef, useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Skeleton,
  Button,
  ToggleButton,
  ToggleButtonGroup,
  alpha,
} from '@mui/material';
import {
  Add as AddIcon,
  PlayArrow as StartIcon,
  CheckCircle as CompleteIcon,
  Cancel as CancelIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import type { QueueEntry, QueueStatus } from '@/types';

interface DayCalendarViewProps {
  queue: QueueEntry[];
  selectedDate: string;
  isLoading: boolean;
  onSlotClick: (slot: string) => void;
  onUpdateStatus: (queueId: string, status: QueueStatus) => void;
}

const statusConfig: Record<QueueStatus, { color: 'warning' | 'info' | 'success' | 'error'; label: string }> = {
  Waiting: { color: 'warning', label: 'Waiting' },
  Ongoing: { color: 'info', label: 'In Progress' },
  Completed: { color: 'success', label: 'Completed' },
  Cancelled: { color: 'error', label: 'Cancelled' },
};

const START_HOUR = 9;
const END_HOUR = 18;

function generateTimeSlots(intervalMinutes: number): string[] {
  const slots: string[] = [];
  for (let h = START_HOUR; h < END_HOUR; h++) {
    for (let m = 0; m < 60; m += intervalMinutes) {
      slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }
  return slots;
}

function formatTime12h(time: string): string {
  const [h, m] = time.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
}

function getSlotMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function normalizeSlotTime(slot: string, interval: number): string {
  const [h, m] = slot.split(':').map(Number);
  const totalMin = h * 60 + m;
  const rounded = Math.floor(totalMin / interval) * interval;
  const rh = Math.floor(rounded / 60);
  const rm = rounded % 60;
  return `${String(rh).padStart(2, '0')}:${String(rm).padStart(2, '0')}`;
}

export default function DayCalendarView({
  queue,
  selectedDate,
  isLoading,
  onSlotClick,
  onUpdateStatus,
}: DayCalendarViewProps) {
  const navigate = useNavigate();
  const currentSlotRef = useRef<HTMLDivElement | null>(null);
  const [slotDuration, setSlotDuration] = useState(30);

  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const isToday = selectedDate === todayStr;

  const timeSlots = useMemo(() => generateTimeSlots(slotDuration), [slotDuration]);

  const queueBySlot = useMemo(() => {
    const map = new Map<string, QueueEntry[]>();
    for (const entry of queue) {
      const normalized = normalizeSlotTime(entry.slot, slotDuration);
      const existing = map.get(normalized) ?? [];
      existing.push(entry);
      map.set(normalized, existing);
    }
    return map;
  }, [queue, slotDuration]);

  const nowMinutes = useMemo(() => {
    const now = new Date();
    return now.getHours() * 60 + now.getMinutes();
  }, []);

  const currentSlotTime = useMemo(() => {
    if (!isToday) return null;
    for (let i = timeSlots.length - 1; i >= 0; i--) {
      if (getSlotMinutes(timeSlots[i]) <= nowMinutes) {
        return timeSlots[i];
      }
    }
    return null;
  }, [isToday, timeSlots, nowMinutes]);

  useEffect(() => {
    if (currentSlotRef.current) {
      currentSlotRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentSlotTime]);

  const isPastSlot = (slotTime: string): boolean => {
    if (!isToday) return false;
    return getSlotMinutes(slotTime) < nowMinutes;
  };

  if (isLoading) {
    return (
      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Skeleton width={200} height={32} />
          <Skeleton width={200} height={40} />
        </Box>
        {Array.from({ length: 8 }).map((_, i) => (
          <Box key={i} sx={{ display: 'flex', gap: 2, px: 2, py: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
            <Skeleton width={80} height={24} />
            <Skeleton width="100%" height={48} variant="rounded" />
          </Box>
        ))}
      </Paper>
    );
  }

  return (
    <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
      {/* Header with slot duration toggle */}
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
            Day Schedule
          </Typography>
          <Chip
            label={`${queue.length} patient${queue.length !== 1 ? 's' : ''}`}
            size="small"
            color="primary"
            variant="outlined"
            sx={{ ml: 1 }}
          />
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
            Interval:
          </Typography>
          <ToggleButtonGroup
            value={slotDuration}
            exclusive
            onChange={(_, val) => { if (val !== null) setSlotDuration(val as number); }}
            size="small"
          >
            <ToggleButton value={15} sx={{ px: 1.5, py: 0.25, fontSize: '0.75rem' }}>15m</ToggleButton>
            <ToggleButton value={30} sx={{ px: 1.5, py: 0.25, fontSize: '0.75rem' }}>30m</ToggleButton>
            <ToggleButton value={45} sx={{ px: 1.5, py: 0.25, fontSize: '0.75rem' }}>45m</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* Time slot rows */}
      <Box sx={{ maxHeight: 'calc(100vh - 340px)', overflowY: 'auto' }}>
        {timeSlots.map((slot) => {
          const entries = queueBySlot.get(slot) ?? [];
          const past = isPastSlot(slot);
          const isCurrent = currentSlotTime === slot;

          return (
            <Box
              key={slot}
              ref={isCurrent ? currentSlotRef : undefined}
              sx={{
                display: 'flex',
                minHeight: 64,
                borderBottom: '1px solid',
                borderColor: 'divider',
                opacity: past ? 0.4 : 1,
                transition: 'opacity 0.2s ease',
                ...(isCurrent && {
                  borderLeft: '4px solid',
                  borderLeftColor: 'primary.main',
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.04),
                }),
                ...(!isCurrent && {
                  borderLeft: '4px solid transparent',
                }),
                '&:hover': {
                  bgcolor: past ? undefined : (theme) => alpha(theme.palette.action.hover, 0.04),
                },
              }}
            >
              {/* Time label */}
              <Box
                sx={{
                  width: 100,
                  minWidth: 100,
                  display: 'flex',
                  alignItems: 'flex-start',
                  pt: 1.5,
                  px: 2,
                  borderRight: '1px solid',
                  borderColor: 'divider',
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: isCurrent ? 700 : 500,
                    color: isCurrent ? 'primary.main' : 'text.secondary',
                    fontFamily: 'monospace',
                    fontSize: '0.8rem',
                  }}
                >
                  {formatTime12h(slot)}
                </Typography>
              </Box>

              {/* Patient cards or empty state */}
              <Box
                sx={{
                  flex: 1,
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: 1,
                  p: 1,
                  alignItems: 'center',
                  ...(entries.length === 0 && !past && {
                    borderBottom: '1px dashed',
                    borderColor: 'divider',
                    bgcolor: (theme) => alpha(theme.palette.background.default, 0.5),
                  }),
                }}
              >
                {entries.length > 0 ? (
                  <>
                    {entries.map((entry) => (
                      <PatientCard
                        key={entry.queueId}
                        entry={entry}
                        onStart={() => navigate(`/visit-details/${entry.patientId}`)}
                        onComplete={() => onUpdateStatus(entry.queueId, 'Completed')}
                        onCancel={() => onUpdateStatus(entry.queueId, 'Cancelled')}
                      />
                    ))}
                    {!past && (
                      <Tooltip title="Add another patient to this slot">
                        <IconButton
                          size="small"
                          onClick={() => onSlotClick(slot)}
                          sx={{
                            border: '1px dashed',
                            borderColor: 'divider',
                            borderRadius: 2,
                            width: 32,
                            height: 32,
                            color: 'text.secondary',
                            '&:hover': {
                              borderColor: 'primary.main',
                              color: 'primary.main',
                              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.06),
                            },
                          }}
                        >
                          <AddIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      </Tooltip>
                    )}
                  </>
                ) : !past ? (
                  <Tooltip title="Book this slot">
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<AddIcon />}
                      onClick={() => onSlotClick(slot)}
                      sx={{
                        textTransform: 'none',
                        fontSize: '0.75rem',
                        borderStyle: 'dashed',
                        color: 'text.secondary',
                        borderColor: 'divider',
                        '&:hover': {
                          borderStyle: 'solid',
                          borderColor: 'primary.main',
                          color: 'primary.main',
                        },
                      }}
                    >
                      Add
                    </Button>
                  </Tooltip>
                ) : null}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Paper>
  );
}

/* ─── Patient Card sub-component ──────────────────────────────────── */

interface PatientCardProps {
  entry: QueueEntry;
  onStart: () => void;
  onComplete: () => void;
  onCancel: () => void;
}

function PatientCard({ entry, onStart, onComplete, onCancel }: PatientCardProps) {
  const status = statusConfig[entry.status];

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 1,
        px: 1.5,
        py: 0.75,
        borderRadius: 2,
        border: '1px solid',
        borderColor: `${status.color}.light`,
        bgcolor: (theme) => alpha(theme.palette[status.color].main, 0.06),
        minWidth: 200,
        maxWidth: 360,
        transition: 'box-shadow 0.2s ease',
        '&:hover': {
          boxShadow: 1,
        },
      }}
    >
      {/* Token */}
      <Typography
        variant="caption"
        fontWeight={700}
        color={`${status.color}.main`}
        sx={{
          bgcolor: (theme) => alpha(theme.palette[status.color].main, 0.12),
          borderRadius: 1,
          px: 0.75,
          py: 0.25,
          minWidth: 28,
          textAlign: 'center',
        }}
      >
        #{entry.tokenNumber}
      </Typography>

      {/* Name + UHID + Services */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600} noWrap>
          {entry.patientName}
        </Typography>
        <Typography variant="caption" color="text.secondary" noWrap>
          {entry.uhid}
          {(entry.services?.length ?? 0) > 0 && (
            <> &middot; {entry.services.length} svc &middot; ₹{(entry.serviceAmount ?? 0).toLocaleString('en-IN')}</>
          )}
        </Typography>
      </Box>

      {/* Status chip */}
      <Chip
        label={status.label}
        color={status.color}
        size="small"
        sx={{ fontSize: '0.65rem', height: 20 }}
      />

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 0.25 }}>
        {entry.status === 'Waiting' && (
          <Tooltip title="Start Visit">
            <IconButton size="small" color="primary" onClick={onStart}>
              <StartIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        )}
        {entry.status === 'Ongoing' && (
          <Tooltip title="Complete">
            <IconButton size="small" color="success" onClick={onComplete}>
              <CompleteIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        )}
        {(entry.status === 'Waiting' || entry.status === 'Ongoing') && (
          <Tooltip title="Cancel">
            <IconButton size="small" color="error" onClick={onCancel}>
              <CancelIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </Box>
  );
}
