/**
 * PatientPrescriptionPDF — Dialog that renders a pdfmake PDF preview of a historical
 * prescription. Opens from PrescriptionHistoryTab when user clicks "View PDF".
 */
import { useMemo, useCallback, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Box, Typography, IconButton, Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import PrintIcon from '@mui/icons-material/Print';
import { toast } from 'sonner';
import PrescriptionPdf, { downloadPdfFromUrl } from '@/pages/Prescription/components/PrescriptionPdf';
import type { PrescriptionPdfData } from '@/pages/Prescription/components/PrescriptionPdf';
import type { Prescription, Patient, PatientInfo } from '@/types';

interface PatientPrescriptionPDFProps {
  prescription: Prescription;
  patient?: Patient;
  open: boolean;
  onClose: () => void;
}

export default function PatientPrescriptionPDF({ prescription, patient, open, onClose }: PatientPrescriptionPDFProps) {
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);

  const pdfData: PrescriptionPdfData = useMemo(() => ({
    vitals: prescription.vitals || {},
    symptoms: prescription.symptoms || [],
    diagnoses: prescription.diagnoses || [],
    examinationFindings: prescription.examinationFindings || [],
    medications: prescription.medications || [],
    labInvestigations: prescription.labInvestigations || [],
    labResults: prescription.labResults || [],
    procedures: prescription.procedures || [],
    followUp: prescription.followUp || null,
    referral: prescription.referral || null,
    advice: prescription.advice || '',
    notes: { surgicalNotes: prescription.notes?.surgicalNotes || '', privateNotes: prescription.notes?.privateNotes || '' },
    customSections: prescription.customSections || [],
    medicalConditions: (prescription.medicalConditions || []).map(c => ({
      name: c.name,
      value: c.value,
      since: c.since || '',
    })),
    noRelevantHistory: prescription.noRelevantHistory || false,
  }), [prescription]);

  const patientInfo: PatientInfo | null = useMemo(() => {
    if (patient) {
      const genderMap: Record<string, string> = { M: 'Male', F: 'Female', Other: 'Other' };
      let ageDisplay = '';
      if (patient.dateOfBirth) {
        const diffMs = Date.now() - new Date(patient.dateOfBirth).getTime();
        const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        if (days < 30) ageDisplay = `${days}d`;
        else if (days < 730) ageDisplay = `${Math.floor(days / 30)}m`;
        else ageDisplay = `${Math.floor(days / 365)}y`;
      } else if (patient.age) {
        ageDisplay = `${patient.age}y`;
      }
      return {
        name: `${patient.salutation ? patient.salutation + '. ' : ''}${patient.name}`,
        age: ageDisplay,
        gender: genderMap[patient.gender] || patient.gender,
        phone: patient.phone || '',
        address: [patient.address?.street, patient.address?.city, patient.address?.state].filter(Boolean).join(', '),
      };
    }
    return null;
  }, [patient]);

  const handlePdfReady = useCallback((dataUrl: string) => {
    setPdfDataUrl(dataUrl);
  }, []);

  const handleDownload = useCallback(() => {
    if (!pdfDataUrl) {
      toast.error('PDF is still generating...');
      return;
    }
    const date = prescription.visitDate
      ? new Date(prescription.visitDate).toISOString().slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    downloadPdfFromUrl(pdfDataUrl, `Prescription_${date}.pdf`);
    toast.success('PDF downloaded');
  }, [pdfDataUrl, prescription.visitDate]);

  const handlePrint = useCallback(() => {
    if (pdfDataUrl) {
      const printWindow = window.open(pdfDataUrl, '_blank');
      if (printWindow) {
        printWindow.addEventListener('load', () => printWindow.print());
      }
    }
  }, [pdfDataUrl]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3, height: '85vh', maxHeight: '85vh' },
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', py: 1.5,
        }}
      >
        <Box>
          <Typography variant="h6" fontWeight={700}>Prescription PDF</Typography>
          <Typography variant="caption" color="text.secondary">
            {prescription.visitDate
              ? new Date(prescription.visitDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
              : 'Date not available'
            }
            {prescription.prescriptionId && ` | ID: ${prescription.prescriptionId}`}
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent
        sx={{
          p: 0,
          bgcolor: '#525659',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <Box sx={{ flex: 1, p: 2 }}>
          <PrescriptionPdf
            data={pdfData}
            patientInfo={patientInfo}
            onPdfReady={handlePdfReady}
          />
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 1.5, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0', gap: 1 }}>
        <Tooltip title="Print prescription">
          <Button
            startIcon={<PrintIcon />}
            variant="outlined"
            size="small"
            onClick={handlePrint}
            disabled={!pdfDataUrl}
          >
            Print
          </Button>
        </Tooltip>
        <Tooltip title="Download PDF">
          <Button
            startIcon={<DownloadIcon />}
            variant="outlined"
            size="small"
            onClick={handleDownload}
            disabled={!pdfDataUrl}
          >
            Download
          </Button>
        </Tooltip>
        <Box sx={{ flex: 1 }} />
        <Button onClick={onClose} variant="contained" size="small">Close</Button>
      </DialogActions>
    </Dialog>
  );
}
