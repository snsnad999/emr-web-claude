import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Box, Tabs, Tab, Skeleton, Alert } from '@mui/material';
import {
  Person as PersonIcon,
  Description as RxIcon,
  MedicalInformation as MedicalIcon,
  EventNote as AppointmentIcon,
  Receipt as BillingIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { patientApi } from '@/services/api';
import PatientHeader from './components/PatientHeader';
import OverviewTab from './components/OverviewTab';
import PrescriptionHistoryTab from './components/PrescriptionHistoryTab';
import MedicalHistoryTab from './components/MedicalHistoryTab';
import AppointmentsTab from './components/AppointmentsTab';
import BillingTab from './components/BillingTab';
import EditPatientDialog from './components/EditPatientDialog';

const TABS = [
  { value: 0, label: 'Overview', icon: <PersonIcon /> },
  { value: 1, label: 'Prescriptions', icon: <RxIcon /> },
  { value: 2, label: 'Medical History', icon: <MedicalIcon /> },
  { value: 3, label: 'Appointments', icon: <AppointmentIcon /> },
  { value: 4, label: 'Billing', icon: <BillingIcon /> },
];

export default function PatientDetail() {
  const { id: patientId } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState(0);
  const [editOpen, setEditOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => patientApi.getPatientById(patientId!),
    enabled: !!patientId,
  });

  const patient = data?.data;

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Failed to load patient data. Please try again.</Alert>
      </Box>
    );
  }

  if (!patientId) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">No patient ID provided.</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <PatientHeader
        patient={patient}
        isLoading={isLoading}
        onEdit={() => setEditOpen(true)}
      />

      {isLoading ? (
        <Box>
          <Skeleton height={48} sx={{ mb: 2 }} />
          <Skeleton height={300} variant="rectangular" sx={{ borderRadius: 2 }} />
        </Box>
      ) : (
        <>
          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
            <Tabs
              value={activeTab}
              onChange={(_, v) => setActiveTab(v)}
              variant="scrollable"
              scrollButtons="auto"
            >
              {TABS.map((t) => (
                <Tab key={t.value} icon={t.icon} iconPosition="start" label={t.label} />
              ))}
            </Tabs>
          </Box>

          <Box>
            {activeTab === 0 && patient && <OverviewTab patient={patient} />}
            {activeTab === 1 && <PrescriptionHistoryTab patientId={patientId} patient={patient} />}
            {activeTab === 2 && <MedicalHistoryTab patientId={patientId} />}
            {activeTab === 3 && <AppointmentsTab patientId={patientId} />}
            {activeTab === 4 && <BillingTab patientId={patientId} />}
          </Box>
        </>
      )}

      {patient && (
        <EditPatientDialog
          open={editOpen}
          onClose={() => setEditOpen(false)}
          patient={patient}
        />
      )}
    </Box>
  );
}
