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
import {
  Receipt as ReceiptIcon,
  CurrencyRupee as RupeeIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { paymentApi } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import type { Payment } from '@/types';

interface BillingTabProps {
  patientId: string;
}

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 3 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 5 }).map((__, j) => (
            <TableCell key={j}><Skeleton height={24} /></TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );
}

function methodColor(method: string): 'success' | 'info' | 'warning' | 'default' {
  switch (method) {
    case 'Cash': return 'success';
    case 'Card': return 'info';
    case 'UPI': return 'warning';
    case 'Online': return 'info';
    default: return 'default';
  }
}

export default function BillingTab({ patientId: _patientId }: BillingTabProps) {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ['patientPayments', _patientId],
    queryFn: () =>
      paymentApi.getPayments({
        organizationId: user?.organizationId,
      }),
  });

  const payments: Payment[] = data?.data ?? [];

  if (isLoading) {
    return (
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Skeleton width={160} height={28} sx={{ mb: 2 }} />
        <SkeletonRows />
      </Paper>
    );
  }

  if (payments.length === 0) {
    return (
      <Paper sx={{ p: 6, textAlign: 'center' }}>
        <ReceiptIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
        <Typography color="text.secondary">
          No payment records found for this patient.
        </Typography>
      </Paper>
    );
  }

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
        <Paper sx={{ p: 3, flex: 1, minWidth: 200, borderRadius: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <RupeeIcon color="success" fontSize="small" />
            <Typography variant="body2" color="text.secondary">Total Paid</Typography>
          </Box>
          <Typography variant="h5" fontWeight={700}>
            {totalPaid.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
          </Typography>
        </Paper>
        <Paper sx={{ p: 3, flex: 1, minWidth: 200, borderRadius: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <ReceiptIcon color="primary" fontSize="small" />
            <Typography variant="body2" color="text.secondary">Total Transactions</Typography>
          </Box>
          <Typography variant="h5" fontWeight={700}>
            {payments.length}
          </Typography>
        </Paper>
      </Box>

      <Paper sx={{ borderRadius: 3 }}>
        <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <ReceiptIcon color="primary" />
          <Typography variant="h6" fontWeight={600}>Payment History</Typography>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Date</TableCell>
                <TableCell>Receipt #</TableCell>
                <TableCell>Method</TableCell>
                <TableCell align="right">Amount</TableCell>
                <TableCell>Collected By</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {payments.map((payment) => (
                <TableRow key={payment.paymentId} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={500}>
                      {format(new Date(payment.collectedAt), 'dd MMM yyyy')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="primary" fontWeight={500}>
                      {payment.receiptId || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={payment.method}
                      size="small"
                      color={methodColor(payment.method)}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight={600}>
                      {payment.amount.toLocaleString('en-IN', { style: 'currency', currency: 'INR' })}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {payment.collectedBy}
                    </Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
}
