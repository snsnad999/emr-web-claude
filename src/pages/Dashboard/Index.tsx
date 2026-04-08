import { Box, Typography, Button, Paper, ToggleButton, ToggleButtonGroup } from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
  ViewList as ListIcon,
  CalendarViewDay as DayIcon,
  CalendarViewWeek as WeekIcon,
  CalendarMonth as MonthIcon,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSelector, useDispatch } from 'react-redux';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

import { queueApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import type { RootState } from '@/store/store';
import { setSelectedDate } from '@/store/slices/selectedDateSlice';
import type { QueueStatus } from '@/types';

import DateSelector from './components/DateSelector';
import StatsCards from './components/StatsCards';
import QueueTable from './components/QueueTable';
import BookingPanel from './components/BookingPanel';
import EmptyState from './components/EmptyState';
import DayCalendarView from './components/DayCalendarView';
import WeekCalendarView from './components/WeekCalendarView';
import MonthCalendarView from './components/MonthCalendarView';

import { useState, useCallback } from 'react';

type ViewMode = 'queue' | 'day' | 'week' | 'month';

export default function QueueDashboard() {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const selectedDate = useSelector((state: RootState) => state.selectedDate.date);
  const [bookingOpen, setBookingOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('queue');
  const [preselectedSlot, setPreselectedSlot] = useState<string | undefined>(undefined);

  const {
    data: queueData,
    isLoading,
    isError,
    error,
    refetch,
  } = useQuery({
    queryKey: ['queue', selectedDate, user?.organizationId, user?.branchId],
    queryFn: () =>
      queueApi.getQueue({
        organizationId: user!.organizationId,
        branchId: user!.branchId,
        date: selectedDate,
      }),
    enabled: !!user?.organizationId && !!user?.branchId && !!selectedDate,
    refetchInterval: 60_000,
    staleTime: 30_000,
    retry: 2,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
  });

  const queue = queueData?.data?.queue ?? [];

  const updateStatusMutation = useMutation({
    mutationFn: ({ queueId, status }: { queueId: string; status: QueueStatus }) =>
      queueApi.updateQueueEntry(queueId, { status }),
    onSuccess: () => {
      toast.success('Queue updated');
      queryClient.invalidateQueries({ queryKey: ['queue'] });
    },
    onError: () => {
      toast.error('Failed to update queue');
    },
  });

  const handleDateChange = (date: string) => {
    dispatch(setSelectedDate(date));
  };

  const handleUpdateStatus = (queueId: string, status: QueueStatus) => {
    updateStatusMutation.mutate({ queueId, status });
  };

  const handleSlotClick = useCallback((slot: string) => {
    setPreselectedSlot(slot);
    setBookingOpen(true);
  }, []);

  const handleBookingClose = useCallback(() => {
    setBookingOpen(false);
    setPreselectedSlot(undefined);
  }, []);

  return (
    <Box>
      {/* Header row — sticky so buttons remain visible while scrolling */}
      <Box
        component={motion.div}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        sx={{
          position: 'sticky',
          top: -24,
          zIndex: 10,
          bgcolor: 'background.default',
          mx: -3,
          px: 3,
          pt: 3,
          pb: 2,
          mt: -3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700}>
            Queue Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Manage today&apos;s patient queue and appointments
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <DateSelector selectedDate={selectedDate} onDateChange={handleDateChange} />

          {/* View mode toggle */}
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, v) => { if (v) setViewMode(v as ViewMode); }}
            size="small"
            sx={{
              bgcolor: 'background.paper',
              border: '1px solid',
              borderColor: 'divider',
              borderRadius: 2,
              '& .MuiToggleButton-root': {
                border: 'none',
                px: 1.5,
                py: 0.5,
                gap: 0.5,
                fontSize: '0.75rem',
                textTransform: 'none',
                '&.Mui-selected': {
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': { bgcolor: 'primary.dark' },
                },
              },
            }}
          >
            <ToggleButton value="queue" aria-label="Queue list view">
              <ListIcon sx={{ fontSize: 18 }} />
            </ToggleButton>
            <ToggleButton value="day" aria-label="Day schedule view">
              <DayIcon sx={{ fontSize: 18 }} /> Day
            </ToggleButton>
            <ToggleButton value="week" aria-label="Week calendar view">
              <WeekIcon sx={{ fontSize: 18 }} /> Week
            </ToggleButton>
            <ToggleButton value="month" aria-label="Month calendar view">
              <MonthIcon sx={{ fontSize: 18 }} /> Month
            </ToggleButton>
          </ToggleButtonGroup>

          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={() => refetch()}
            size="small"
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setBookingOpen(true)}
          >
            {selectedDate === new Date().toISOString().split('T')[0]
              ? 'Check-in / Book'
              : 'Book Appointment'}
          </Button>
        </Box>
      </Box>

      {/* Stats cards */}
      <Box sx={{ mb: 3 }}>
        <StatsCards queue={queue} isLoading={isLoading} />
      </Box>

      {/* Main content: queue table, day/week/month calendar, or empty/error state */}
      {isError ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="error" gutterBottom>
            Failed to load queue data
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {(error as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message
              ?? (error as Error)?.message
              ?? 'Please check your connection and try again.'}
          </Typography>
          <Button variant="outlined" onClick={() => refetch()}>
            Retry
          </Button>
        </Paper>
      ) : viewMode === 'day' ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <DayCalendarView
            queue={queue}
            selectedDate={selectedDate}
            isLoading={isLoading}
            onSlotClick={handleSlotClick}
            onUpdateStatus={handleUpdateStatus}
          />
        </motion.div>
      ) : viewMode === 'week' ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <WeekCalendarView
            queue={queue}
            selectedDate={selectedDate}
            isLoading={isLoading}
            onSlotClick={handleSlotClick}
            onUpdateStatus={handleUpdateStatus}
            onDateChange={handleDateChange}
          />
        </motion.div>
      ) : viewMode === 'month' ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <MonthCalendarView
            queue={queue}
            selectedDate={selectedDate}
            isLoading={isLoading}
            onDateChange={handleDateChange}
            onViewDay={(date) => {
              handleDateChange(date);
              setViewMode('day');
            }}
          />
        </motion.div>
      ) : !isLoading && queue.length === 0 ? (
        <Paper sx={{ borderRadius: 3 }}>
          <EmptyState onBookAppointment={() => setBookingOpen(true)} />
        </Paper>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <QueueTable
            queue={queue}
            isLoading={isLoading}
            onUpdateStatus={handleUpdateStatus}
          />
        </motion.div>
      )}

      {/* Booking panel */}
      <BookingPanel
        open={bookingOpen}
        onClose={handleBookingClose}
        selectedDate={selectedDate}
        preselectedSlot={preselectedSlot}
      />
    </Box>
  );
}
