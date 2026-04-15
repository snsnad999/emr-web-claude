import { useState, useCallback } from 'react';
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
  Button,
  IconButton,
  Tooltip,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Description as RxIcon,
  PictureAsPdf as PdfIcon,
  ContentCopy as CopyIcon,
  Edit as EditIcon,
  MoreVert as MoreIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { prescriptionApi } from '@/services/api';
import type { Prescription, Patient } from '@/types';
import PatientPrescriptionPDF from './PatientPrescriptionPDF';

interface PrescriptionHistoryTabProps {
  patientId: string;
  patient?: Patient;
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

/** Map a saved Prescription to the shape PrescriptionContext.loadPrescription expects */
function mapPrescriptionToContextState(rx: Prescription) {
  return {
    vitals: rx.vitals || {},
    symptoms: rx.symptoms || [],
    diagnoses: rx.diagnoses || [],
    examinationFindings: rx.examinationFindings || [],
    medications: rx.medications || [],
    labInvestigations: rx.labInvestigations || [],
    labResults: rx.labResults || [],
    procedures: rx.procedures || [],
    followUp: rx.followUp || null,
    referral: rx.referral || null,
    advice: rx.advice || '',
    surgicalNotes: rx.notes?.surgicalNotes || '',
    privateNotes: rx.notes?.privateNotes || '',
    customSections: rx.customSections || [],
    medicalConditions: rx.medicalConditions || [],
    noRelevantHistory: rx.noRelevantHistory || false,
  };
}

export default function PrescriptionHistoryTab({ patientId, patient }: PrescriptionHistoryTabProps) {
  const navigate = useNavigate();
  const [pdfPrescription, setPdfPrescription] = useState<Prescription | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuRx, setMenuRx] = useState<Prescription | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['patientPrescriptions', patientId],
    queryFn: () => prescriptionApi.getPatientPrescriptions(patientId),
  });

  const prescriptions: Prescription[] = data?.data ?? [];

  const handleOpenMenu = useCallback((e: React.MouseEvent<HTMLElement>, rx: Prescription) => {
    setMenuAnchor(e.currentTarget);
    setMenuRx(rx);
  }, []);

  const handleCloseMenu = useCallback(() => {
    setMenuAnchor(null);
    setMenuRx(null);
  }, []);

  const handleViewPdf = useCallback((rx: Prescription) => {
    setPdfPrescription(rx);
    handleCloseMenu();
  }, [handleCloseMenu]);

  const handleCopyToRx = useCallback((rx: Prescription) => {
    const stateData = mapPrescriptionToContextState(rx);
    navigate(`/visit-details/${patientId}`, {
      state: {
        copyToRx: true,
        prescriptionData: stateData,
      },
    });
  }, [navigate, patientId]);

  const handleEditPrescription = useCallback((rx: Prescription) => {
    const stateData = mapPrescriptionToContextState(rx);
    navigate(`/visit-details/${patientId}`, {
      state: {
        isEditing: true,
        prescriptionData: {
          ...stateData,
          prescriptionId: rx.prescriptionId,
        },
      },
    });
  }, [navigate, patientId]);

  if (isLoading) {
    return (
      <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Diagnoses</TableCell>
              <TableCell>Medications</TableCell>
              <TableCell>Follow Up</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            <SkeletonRows />
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  if (prescriptions.length === 0) {
    return (
      <Paper sx={{ p: 6, textAlign: 'center' }}>
        <RxIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 1.5 }} />
        <Typography color="text.secondary">
          No prescriptions found for this patient.
        </Typography>
        <Button
          variant="contained"
          sx={{ mt: 2 }}
          onClick={() => navigate(`/visit-details/${patientId}`)}
        >
          Create Prescription
        </Button>
      </Paper>
    );
  }

  return (
    <>
      <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Diagnoses</TableCell>
              <TableCell>Medications</TableCell>
              <TableCell>Follow Up</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {prescriptions.map((rx) => (
              <TableRow key={rx.prescriptionId} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={500}>
                    {format(new Date(rx.visitDate || rx.createdAt), 'dd MMM yyyy')}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                    {rx.diagnoses?.slice(0, 3).map((d, i) => (
                      <Chip
                        key={i}
                        label={d.description}
                        size="small"
                        variant="outlined"
                        color="primary"
                      />
                    ))}
                    {(rx.diagnoses?.length ?? 0) > 3 && (
                      <Chip
                        label={`+${rx.diagnoses.length - 3}`}
                        size="small"
                        variant="outlined"
                      />
                    )}
                    {(!rx.diagnoses || rx.diagnoses.length === 0) && (
                      <Typography variant="body2" color="text.secondary">-</Typography>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">
                    {rx.medications?.length ?? 0} medication(s)
                  </Typography>
                </TableCell>
                <TableCell>
                  {rx.followUp?.followUpDate ? (
                    <Chip
                      label={format(new Date(rx.followUp.followUpDate), 'dd MMM yyyy')}
                      size="small"
                      color="info"
                      variant="outlined"
                    />
                  ) : (
                    <Typography variant="body2" color="text.secondary">-</Typography>
                  )}
                </TableCell>
                <TableCell align="right">
                  <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                    <Tooltip title="View PDF">
                      <IconButton size="small" color="primary" onClick={() => handleViewPdf(rx)}>
                        <PdfIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Copy to RX Pad">
                      <IconButton size="small" color="success" onClick={() => handleCopyToRx(rx)}>
                        <CopyIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="More actions">
                      <IconButton size="small" onClick={(e) => handleOpenMenu(e, rx)}>
                        <MoreIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Context menu for more actions */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleCloseMenu}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <MenuItem onClick={() => { if (menuRx) handleEditPrescription(menuRx); }}>
          <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Edit Prescription</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { if (menuRx) handleCopyToRx(menuRx); }}>
          <ListItemIcon><CopyIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Copy to New RX</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => { if (menuRx) handleViewPdf(menuRx); }}>
          <ListItemIcon><PdfIcon fontSize="small" /></ListItemIcon>
          <ListItemText>View PDF</ListItemText>
        </MenuItem>
      </Menu>

      {/* PDF Dialog */}
      {pdfPrescription && (
        <PatientPrescriptionPDF
          prescription={pdfPrescription}
          patient={patient}
          open={Boolean(pdfPrescription)}
          onClose={() => setPdfPrescription(null)}
        />
      )}
    </>
  );
}
