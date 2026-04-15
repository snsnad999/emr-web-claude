import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Skeleton,
} from '@mui/material';
import { EventNote as EventIcon } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { appointmentApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import type { Appointment, AppointmentStatus } from '@/types';

interface AppointmentsTabProps {
  patientId: string;
}

function statusColor(status: AppointmentStatus): 'success' | 'warning' | 'info' | 'error' | 'default' {
  switch (status) {
    case 'Completed': return 'success';
    case 'Booked': return 'info';
    case 'Follow Up': return 'warning';
    case 'Ongoing': return 'warning';
    case 'Cancelled': return 'error';
    default: return 'default';
  }
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 4 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 5 }).map((__, j) => (
            <TableCell key={j}><Skeleton height={24} /></TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

function AppointmentTable({ appointments, emptyText }: { appointments: Appointment[]; emptyText: string }) {
  if (appointments.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
        {emptyText}
      </Typography>
    );
  }

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Date</TableCell>
            <TableCell>Slot</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Payment</TableCell>
            <TableCell>Notes</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {appointments.map((appt) => (
            <TableRow key={appt.appointmentId} hover>
              <TableCell>
                <Typography variant="body2" fontWeight={500}>
                  {format(new Date(appt.slotDate || appt.createdAt), 'dd MMM yyyy')}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">{appt.slot || '-'}</Typography>
              </TableCell>
              <TableCell>
                <Chip
                  label={appt.status}
                  size="small"
                  color={statusColor(appt.status)}
                  variant="outlined"
                />
              </TableCell>
              <TableCell>
                <Chip
                  label={appt.paymentStatus}
                  size="small"
                  color={appt.paymentStatus === 'Paid' ? 'success' : 'warning'}
                  variant="outlined"
                />
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {appt.notes || '-'}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

export default function AppointmentsTab({ patientId }: AppointmentsTabProps) {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['patientAppointments', patientId],
    queryFn: () =>
      appointmentApi.getAppointments({
        organizationId: user?.organizationId,
        branchId: user?.branchId,
      }),
    select: (res) => {
      const all = (res?.data ?? []).filter((a: Appointment) => a.patientId === patientId);
      const now = new Date();
      const upcoming = all.filter(
        (a: Appointment) => new Date(a.slotDate || a.createdAt) >= now && a.status !== 'Cancelled',
      );
      const past = all.filter(
        (a: Appointment) => new Date(a.slotDate || a.createdAt) < now || a.status === 'Cancelled',
      );
      return { upcoming, past };
    },
  });

  if (isLoading) {
    return (
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Skeleton width={160} height={28} sx={{ mb: 2 }} />
        <SkeletonRows />
      </Paper>
    );
  }

  const { upcoming = [], past = [] } = data ?? {};

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <EventIcon color="info" />
          <Typography variant="h6" fontWeight={600}>
            Upcoming Appointments
          </Typography>
          {upcoming.length > 0 && (
            <Chip label={upcoming.length} size="small" color="info" />
          )}
        </Box>
        <AppointmentTable appointments={upcoming} emptyText="No upcoming appointments" />
      </Paper>

      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <EventIcon color="action" />
          <Typography variant="h6" fontWeight={600}>
            Past Appointments
          </Typography>
          {past.length > 0 && (
            <Chip label={past.length} size="small" color="default" />
          )}
        </Box>
        <AppointmentTable appointments={past} emptyText="No past appointments" />
      </Paper>
    </Box>
  );
}
