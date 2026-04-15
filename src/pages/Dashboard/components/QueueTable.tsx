import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Skeleton,
  Box,
  Typography,
  Avatar,
  Tooltip,
  IconButton,
} from '@mui/material';
import {
  PlayArrow as StartIcon,
  CheckCircle as CompleteIcon,
  Cancel as CancelIcon,
  CurrencyRupee as RupeeIcon,
  DirectionsWalk as WalkInIcon,
  EventNote as ScheduledIcon,
  LocalHospital as EmergencyIcon,
  Replay as FollowUpIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import type { QueueEntry, QueueStatus, QueuePaymentStatus, AppointmentType } from '@/types';

interface QueueTableProps {
  queue: QueueEntry[];
  isLoading: boolean;
  onUpdateStatus: (queueId: string, status: QueueStatus) => void;
}

const statusConfig: Record<QueueStatus, { color: 'warning' | 'info' | 'success' | 'error'; label: string }> = {
  Waiting: { color: 'warning', label: 'Waiting' },
  Ongoing: { color: 'info', label: 'In Progress' },
  Completed: { color: 'success', label: 'Completed' },
  Cancelled: { color: 'error', label: 'Cancelled' },
};

const paymentConfig: Record<QueuePaymentStatus, { color: 'success' | 'info' | 'warning'; label: string }> = {
  Cash: { color: 'success', label: 'Cash' },
  Online: { color: 'info', label: 'Online' },
  Pending: { color: 'warning', label: 'Pending' },
};

const appointmentTypeConfig: Record<AppointmentType, { label: string; color: 'success' | 'primary' | 'error' | 'secondary'; icon: typeof WalkInIcon }> = {
  walk_in: { label: 'Walk-in', color: 'success', icon: WalkInIcon },
  scheduled: { label: 'Scheduled', color: 'primary', icon: ScheduledIcon },
  emergency: { label: 'Emergency', color: 'error', icon: EmergencyIcon },
  followup: { label: 'Follow-up', color: 'secondary', icon: FollowUpIcon },
};

const HEADER_CELL_SX = {
  fontWeight: 600,
  color: '#fff',
  bgcolor: '#0D7C66',
  borderBottom: '2px solid',
  borderColor: 'divider',
};

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 5 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 9 }).map((__, j) => (
            <TableCell key={j}>
              <Skeleton height={24} />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

function formatTime12h(time?: string): string {
  if (!time) return '—';
  const parts = time.split(':').map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return time;
  const [h, m] = parts;
  const period = h >= 12 ? 'PM' : 'AM';
  const displayH = h % 12 || 12;
  return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
}

function getInitials(name?: string): string {
  if (!name) return '?';
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n.charAt(0))
    .join('')
    .toUpperCase();
}

export default function QueueTable({ queue, isLoading, onUpdateStatus }: QueueTableProps) {
  const navigate = useNavigate();

  return (
    <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
      <TableContainer>
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={HEADER_CELL_SX}>Token #</TableCell>
            <TableCell sx={HEADER_CELL_SX}>Patient Name</TableCell>
            <TableCell sx={HEADER_CELL_SX}>UHID</TableCell>
            <TableCell sx={HEADER_CELL_SX}>Type</TableCell>
            <TableCell sx={HEADER_CELL_SX}>Time Slot</TableCell>
            <TableCell sx={HEADER_CELL_SX}>Services</TableCell>
            <TableCell sx={HEADER_CELL_SX}>Status</TableCell>
            <TableCell sx={HEADER_CELL_SX}>Payment</TableCell>
            <TableCell sx={HEADER_CELL_SX} align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {isLoading ? (
            <SkeletonRows />
          ) : (
            queue.map((entry) => {
              const status = statusConfig[entry.status];
              const payment = paymentConfig[entry.paymentStatus] ?? paymentConfig.Pending;
              const services = entry.services ?? [];
              const serviceAmount = entry.serviceAmount ?? 0;
              const apptType = entry.appointmentType
                ? appointmentTypeConfig[entry.appointmentType]
                : null;
              const ApptIcon = apptType?.icon;
              const tags = entry.tags
                ? entry.tags.split(',').map((t) => t.trim()).filter(Boolean)
                : [];

              return (
                <TableRow
                  key={entry.queueId}
                  hover
                  sx={{
                    cursor: 'pointer',
                    '& td': { borderBottom: '1px solid', borderColor: 'divider' },
                  }}
                >
                  <TableCell>
                    <Typography variant="body2" fontWeight={700} color="primary">
                      #{entry.tokenNumber}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Avatar
                        sx={{
                          width: 32,
                          height: 32,
                          fontSize: '0.75rem',
                          bgcolor: 'primary.light',
                        }}
                      >
                        {getInitials(entry.patientName)}
                      </Avatar>
                      <Typography variant="body2" fontWeight={500}>
                        {entry.patientName || 'Unknown'}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {entry.uhid}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                      {apptType ? (
                        <Chip
                          icon={ApptIcon ? <ApptIcon sx={{ fontSize: '0.85rem !important' }} /> : undefined}
                          label={apptType.label}
                          size="small"
                          color={apptType.color}
                          variant="outlined"
                          sx={{ fontWeight: 600, fontSize: '0.7rem', height: 24 }}
                        />
                      ) : (
                        <Typography variant="caption" color="text.disabled">—</Typography>
                      )}
                      {tags.length > 0 && (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.3 }}>
                          {tags.map((tag) => (
                            <Chip
                              key={tag}
                              label={tag}
                              size="small"
                              variant="filled"
                              sx={{
                                fontSize: '0.6rem',
                                height: 18,
                                bgcolor: 'grey.200',
                                color: 'text.secondary',
                                fontWeight: 600,
                              }}
                            />
                          ))}
                        </Box>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{formatTime12h(entry.slot)}</Typography>
                  </TableCell>
                  <TableCell>
                    {services.length > 0 ? (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {services.slice(0, 2).map((svc, i) => (
                            <Chip
                              key={i}
                              label={svc.name}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: '0.7rem', height: 22, maxWidth: 120 }}
                            />
                          ))}
                          {services.length > 2 && (
                            <Chip
                              label={`+${services.length - 2}`}
                              size="small"
                              color="default"
                              sx={{ fontSize: '0.7rem', height: 22 }}
                            />
                          )}
                        </Box>
                        {serviceAmount > 0 && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                            <RupeeIcon sx={{ fontSize: 12, color: 'success.main' }} />
                            <Typography variant="caption" fontWeight={700} color="success.dark">
                              {serviceAmount.toLocaleString('en-IN')}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    ) : (
                      <Typography variant="caption" color="text.disabled">
                        —
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={status.label}
                      color={status.color}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={payment.label}
                      color={payment.color}
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                      {entry.status === 'Waiting' && (
                        <Button
                          size="small"
                          variant="contained"
                          color="primary"
                          startIcon={<StartIcon />}
                          onClick={() => navigate(`/visit-details/${entry.patientId}`)}
                          sx={{ textTransform: 'none', fontSize: '0.8rem' }}
                        >
                          Start
                        </Button>
                      )}
                      {entry.status === 'Ongoing' && (
                        <Tooltip title="Complete Visit">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => onUpdateStatus(entry.queueId, 'Completed')}
                          >
                            <CompleteIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      {(entry.status === 'Waiting' || entry.status === 'Ongoing') && (
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => onUpdateStatus(entry.queueId, 'Cancelled')}
                        >
                          <CancelIcon />
                        </IconButton>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      </TableContainer>
    </Paper>
  );
}
