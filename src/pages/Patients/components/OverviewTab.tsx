import {
  Box,
  Grid,
  Paper,
  Typography,
  Divider,
} from '@mui/material';
import {
  Person as PersonIcon,
  Phone as PhoneIcon,
  Home as HomeIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import type { Patient } from '@/types';

function InfoRow({ label, value }: { label: string; value: string | undefined }) {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={500}>
        {value || '-'}
      </Typography>
    </Box>
  );
}

function genderLabel(g: string): string {
  if (g === 'M') return 'Male';
  if (g === 'F') return 'Female';
  return 'Other';
}

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
      {icon}
      <Typography variant="h6" fontWeight={600}>
        {title}
      </Typography>
    </Box>
  );
}

interface OverviewTabProps {
  patient: Patient;
}

export default function OverviewTab({ patient }: OverviewTabProps) {
  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Paper sx={{ p: 3, height: '100%' }}>
          <SectionHeader icon={<PersonIcon color="primary" />} title="Demographics" />
          <Divider sx={{ mb: 1.5 }} />
          <InfoRow label="Full Name" value={`${patient.salutation} ${patient.name}`} />
          <InfoRow label="UHID" value={patient.uhid} />
          <InfoRow label="Gender" value={genderLabel(patient.gender)} />
          <InfoRow
            label="Date of Birth"
            value={patient.dateOfBirth ? format(new Date(patient.dateOfBirth), 'dd MMM yyyy') : undefined}
          />
          <InfoRow label="Age" value={patient.age ? `${patient.age} years` : undefined} />
          <InfoRow label="Blood Group" value={patient.bloodGroup} />
          <InfoRow
            label="Registered On"
            value={patient.createdAt ? format(new Date(patient.createdAt), 'dd MMM yyyy') : undefined}
          />
        </Paper>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, height: '100%' }}>
          <Paper sx={{ p: 3 }}>
            <SectionHeader icon={<PhoneIcon color="primary" />} title="Contact Information" />
            <Divider sx={{ mb: 1.5 }} />
            <InfoRow label="Phone" value={patient.phone} />
            <InfoRow label="Alternate Phone" value={patient.alternatePhone} />
            <InfoRow label="Email" value={patient.email} />
          </Paper>

          <Paper sx={{ p: 3, flex: 1 }}>
            <SectionHeader icon={<HomeIcon color="primary" />} title="Address" />
            <Divider sx={{ mb: 1.5 }} />
            {patient.address ? (
              <>
                <InfoRow label="Street" value={patient.address.street} />
                <InfoRow label="City" value={patient.address.city} />
                <InfoRow label="State" value={patient.address.state} />
                <InfoRow label="Country" value={patient.address.country} />
                <InfoRow label="Pincode" value={patient.address.pincode} />
              </>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                No address on file
              </Typography>
            )}
          </Paper>
        </Box>
      </Grid>
    </Grid>
  );
}
