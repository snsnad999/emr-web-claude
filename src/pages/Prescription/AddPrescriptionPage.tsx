/**
 * AddPrescriptionPage — Final prescription page shown after "Finish Prescription".
 * Shows success banner, live PDF preview, and post-save action buttons.
 */
import { useState, useCallback, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Box, Typography, Button, Card, CardContent, Grid, Divider, Chip,
  IconButton, Tooltip, Paper,
} from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import PaymentIcon from '@mui/icons-material/Payment';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import EditIcon from '@mui/icons-material/Edit';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PersonIcon from '@mui/icons-material/Person';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import HomeIcon from '@mui/icons-material/Home';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import PrescriptionPdf, { downloadPdfFromUrl } from './components/PrescriptionPdf';
import type { PrescriptionPdfData } from './components/PrescriptionPdf';
import type { PatientInfo, DropdownOptions, PrescriptionLanguage } from '@/types';

const MotionBox = motion.create(Box);

interface LocationState {
  patientId?: string;
  prescriptionId?: string;
  patientInfo?: PatientInfo;
  prescriptionData?: PrescriptionPdfData;
  dropdownOptions?: DropdownOptions;
  printSettings?: Record<string, boolean>;
  language?: PrescriptionLanguage;
}

export default function AddPrescriptionPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = (location.state || {}) as LocationState;
  const { patientId, prescriptionId, patientInfo, prescriptionData, dropdownOptions, printSettings, language = 'en' } = state;

  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);
  const [pdfFullscreen, setPdfFullscreen] = useState(false);

  const handlePdfReady = useCallback((dataUrl: string) => {
    setPdfDataUrl(dataUrl);
  }, []);

  const handleDownload = useCallback(() => {
    if (!pdfDataUrl) {
      toast.error('PDF is still generating, please wait...');
      return;
    }
    const name = patientInfo?.name?.replace(/\s+/g, '_') || 'Patient';
    const date = new Date().toISOString().slice(0, 10);
    downloadPdfFromUrl(pdfDataUrl, `Prescription_${name}_${date}.pdf`);
    toast.success('PDF downloaded successfully');
  }, [pdfDataUrl, patientInfo]);

  const handlePrint = useCallback(() => {
    if (pdfDataUrl) {
      const printWindow = window.open(pdfDataUrl, '_blank');
      if (printWindow) {
        printWindow.addEventListener('load', () => printWindow.print());
      }
    } else {
      window.print();
    }
  }, [pdfDataUrl]);

  const handleShare = useCallback(() => {
    if (!patientInfo?.phone) {
      toast.info('No patient phone number available');
      return;
    }
    const phone = patientInfo.phone.replace(/\D/g, '');
    const msg = encodeURIComponent(
      `Dear ${patientInfo.name}, your prescription from EMR Healthcare is ready. Thank you for your visit.`
    );
    window.open(`https://wa.me/${phone.startsWith('91') ? phone : '91' + phone}?text=${msg}`, '_blank');
  }, [patientInfo]);

  const handleEditPrescription = useCallback(() => {
    if (!patientId || !prescriptionData) return;
    // Map PrescriptionPdfData back to PrescriptionState shape for loadPrescription
    navigate(`/visit-details/${patientId}`, {
      state: {
        isEditing: true,
        prescriptionData: {
          prescriptionId,
          vitals: prescriptionData.vitals,
          symptoms: prescriptionData.symptoms,
          diagnoses: prescriptionData.diagnoses,
          examinationFindings: prescriptionData.examinationFindings,
          medications: prescriptionData.medications,
          labInvestigations: prescriptionData.labInvestigations,
          labResults: prescriptionData.labResults,
          procedures: prescriptionData.procedures,
          followUp: prescriptionData.followUp,
          referral: prescriptionData.referral,
          advice: prescriptionData.advice,
          surgicalNotes: prescriptionData.notes?.surgicalNotes || '',
          privateNotes: prescriptionData.notes?.privateNotes || '',
          customSections: prescriptionData.customSections,
          medicalConditions: prescriptionData.medicalConditions,
          noRelevantHistory: prescriptionData.noRelevantHistory,
        },
      },
    });
  }, [patientId, prescriptionId, prescriptionData, navigate]);

  const pdfData = useMemo(() => prescriptionData || null, [prescriptionData]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#f1f5f9' }}>
      {/* ── Top Bar ── */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #1565c0 0%, #1976d2 50%, #42a5f5 100%)',
          px: 3, py: 1.5,
          display: 'flex', alignItems: 'center', gap: 2,
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        }}
      >
        <Tooltip title="Back to Dashboard">
          <IconButton onClick={() => navigate('/')} sx={{ color: '#fff' }}>
            <HomeIcon />
          </IconButton>
        </Tooltip>
        <CheckCircleIcon sx={{ color: '#a5d6a7', fontSize: 28 }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" fontWeight={700} color="#fff">
            Prescription Saved Successfully
          </Typography>
          {prescriptionId && (
            <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.8)' }}>
              ID: {prescriptionId}
            </Typography>
          )}
        </Box>
        {patientInfo && (
          <Chip
            icon={<PersonIcon />}
            label={`${patientInfo.name} • ${patientInfo.age} • ${patientInfo.gender}`}
            sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: '#fff', '& .MuiChip-icon': { color: '#fff' } }}
          />
        )}
      </Box>

      {/* ── Main Content ── */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        <Grid container spacing={3}>
          {/* Left: Action Cards */}
          <Grid size={{ xs: 12, md: pdfFullscreen ? 0 : 4 }} sx={{ display: pdfFullscreen ? 'none' : 'block' }}>
            <MotionBox
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Quick Actions */}
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 1.5, color: '#475569' }}>
                QUICK ACTIONS
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                <ActionCard
                  icon={<DownloadIcon sx={{ fontSize: 28, color: '#1976d2' }} />}
                  title="Download PDF"
                  subtitle="Save prescription as PDF file"
                  onClick={handleDownload}
                  variant="primary"
                />
                <ActionCard
                  icon={<PrintIcon sx={{ fontSize: 28, color: '#7b1fa2' }} />}
                  title="Print Prescription"
                  subtitle="Send to connected printer"
                  onClick={handlePrint}
                />
                <ActionCard
                  icon={<WhatsAppIcon sx={{ fontSize: 28, color: '#25D366' }} />}
                  title="Share via WhatsApp"
                  subtitle={patientInfo?.phone ? `Send to ${patientInfo.phone}` : 'No phone available'}
                  onClick={handleShare}
                />
                <ActionCard
                  icon={<PaymentIcon sx={{ fontSize: 28, color: '#ed6c02' }} />}
                  title="Collect Payment"
                  subtitle="Open billing for this visit"
                  onClick={() => navigate('/payments')}
                />

                <Divider sx={{ my: 1 }} />

                <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 0.5, color: '#475569' }}>
                  NAVIGATION
                </Typography>

                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<ArrowBackIcon />}
                  onClick={() => navigate('/')}
                  sx={{ justifyContent: 'flex-start', py: 1 }}
                >
                  Back to Dashboard
                </Button>
                {patientId && (
                  <>
                    <Button
                      fullWidth
                      variant="contained"
                      color="warning"
                      startIcon={<EditIcon />}
                      onClick={handleEditPrescription}
                      sx={{ justifyContent: 'flex-start', py: 1, fontWeight: 600 }}
                      disabled={!prescriptionData}
                    >
                      Edit Prescription
                    </Button>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<EditIcon />}
                      onClick={() => navigate(`/visit-details/${patientId}`)}
                      sx={{ justifyContent: 'flex-start', py: 1 }}
                    >
                      New Prescription
                    </Button>
                    <Button
                      fullWidth
                      variant="text"
                      startIcon={<PersonIcon />}
                      onClick={() => navigate(`/patient/${patientId}`)}
                      sx={{ justifyContent: 'flex-start', py: 1 }}
                    >
                      View Patient Profile
                    </Button>
                  </>
                )}
              </Box>
            </MotionBox>
          </Grid>

          {/* Right: PDF Preview */}
          <Grid size={{ xs: 12, md: pdfFullscreen ? 12 : 8 }}>
            <MotionBox
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="subtitle2" fontWeight={600} sx={{ color: '#475569' }}>
                  PRESCRIPTION PDF PREVIEW
                </Typography>
                <Tooltip title={pdfFullscreen ? 'Exit fullscreen' : 'Fullscreen preview'}>
                  <IconButton size="small" onClick={() => setPdfFullscreen(f => !f)}>
                    {pdfFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
                  </IconButton>
                </Tooltip>
              </Box>

              <Paper
                elevation={3}
                sx={{
                  height: pdfFullscreen ? 'calc(100vh - 200px)' : 600,
                  borderRadius: 2,
                  overflow: 'hidden',
                  bgcolor: '#525659',
                }}
              >
                {pdfData ? (
                  <PrescriptionPdf
                    data={pdfData}
                    patientInfo={patientInfo}
                    dropdownOptions={dropdownOptions}
                    printSettings={printSettings}
                    language={language}
                    onPdfReady={handlePdfReady}
                  />
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                    <Typography color="grey.400">
                      No prescription data available for preview
                    </Typography>
                  </Box>
                )}
              </Paper>
            </MotionBox>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}

// ── Action Card component ──
function ActionCard({
  icon, title, subtitle, onClick, variant,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  variant?: 'primary';
}) {
  return (
    <Card
      variant="outlined"
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        transition: 'all 0.2s',
        '&:hover': {
          boxShadow: 4,
          borderColor: variant === 'primary' ? '#1976d2' : '#90caf9',
          transform: 'translateY(-1px)',
        },
        ...(variant === 'primary' && {
          borderColor: '#1976d2',
          bgcolor: '#e3f2fd',
        }),
      }}
    >
      <CardContent sx={{ py: 1.5, px: 2, '&:last-child': { pb: 1.5 }, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {icon}
        <Box>
          <Typography variant="body2" fontWeight={600}>{title}</Typography>
          <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
