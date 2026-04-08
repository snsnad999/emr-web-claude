/**
 * PreviewModal — full-screen modal with Summary view + PDF view toggle.
 * Summary shows structured HTML cards; PDF renders the actual pdfmake prescription.
 */
import { useState, useCallback, useMemo } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Box, Typography, Divider, Grid, Chip, Table, TableHead,
  TableRow, TableCell, TableBody, IconButton, Card, CardContent,
  ToggleButtonGroup, ToggleButton, Tooltip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PrintIcon from '@mui/icons-material/Print';
import DownloadIcon from '@mui/icons-material/Download';
import DescriptionIcon from '@mui/icons-material/Description';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { toast } from 'sonner';
import { usePrescription } from '../context/PrescriptionContext';
import { resolveDropdownTranslated, resolveTextTranslated } from '../context/prescriptionHelpers';
import PrescriptionPdf, { downloadPdfFromUrl } from './PrescriptionPdf';
import type { DropdownOption, PrescriptionLanguage } from '@/types';

interface PreviewModalProps {
  open: boolean;
  onClose: () => void;
  onFinish?: () => void;
}

/**
 * Resolve a dropdown value with translation support.
 * Tries by ID first, then falls back to text-matching for translation.
 */
function resolveDropdown(
  id: number | undefined | null,
  options: DropdownOption[] | undefined,
  lang: PrescriptionLanguage = 'en',
  fallbackText?: string,
): string {
  // 1. Try by ID
  const byId = resolveDropdownTranslated(id, options, lang);
  if (byId) return byId;
  // 2. If no ID match, try translating the fallback text by matching option_value
  if (fallbackText) return resolveTextTranslated(fallbackText, options, lang);
  return '';
}

const DIAGNOSIS_TYPE_TRANSLATIONS: Record<string, Record<string, string>> = {
  Primary:      { hi: 'प्राथमिक',  mr: 'प्राथमिक' },
  Secondary:    { hi: 'द्वितीयक',  mr: 'दुय्यम' },
  Differential: { hi: 'विभेदक',    mr: 'विभेदक' },
};

function translateDiagnosisType(type: string, lang: PrescriptionLanguage): string {
  if (lang === 'en') return type;
  return DIAGNOSIS_TYPE_TRANSLATIONS[type]?.[lang] || type;
}

export default function PreviewModal({ open, onClose, onFinish }: PreviewModalProps) {
  const {
    patientInfo, vitals, symptoms, diagnoses, examinationFindings,
    medications, labInvestigations, labResults, medicalConditions,
    noRelevantHistory, procedures, followUp, referral, advice,
    surgicalNotes, privateNotes, customSections,
    dropdownOptions, collectPrescriptionData, printEnabledSections,
    language,
  } = usePrescription();

  const [viewMode, setViewMode] = useState<'summary' | 'pdf'>('summary');
  const [pdfDataUrl, setPdfDataUrl] = useState<string | null>(null);

  // Check print settings — maps print setting keys to section checks
  const isPrintEnabled = (printKey: string) => {
    // If no print settings loaded yet, default to showing everything
    if (!printEnabledSections || Object.keys(printEnabledSections).length === 0) return true;
    return printEnabledSections[printKey] !== false;
  };
  const ddMed = dropdownOptions?.medication;
  const ddSym = dropdownOptions?.symptoms;

  // Memoize prescription data to avoid creating new object references on every render
  // which would cause PrescriptionPdf to restart PDF generation in an infinite loop
  const prescriptionData = useMemo(() => {
    if (!open) return null;
    return collectPrescriptionData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    open, language,
    // Use individual state values as deps instead of collectPrescriptionData (which changes on every state update)
    vitals, symptoms, diagnoses, examinationFindings, medications,
    labInvestigations, labResults, medicalConditions, noRelevantHistory,
    procedures, followUp, referral, advice, surgicalNotes, privateNotes,
    customSections,
  ]);

  const handlePdfReady = useCallback((dataUrl: string) => {
    setPdfDataUrl(dataUrl);
  }, []);

  const handleDownload = useCallback(() => {
    if (pdfDataUrl) {
      const name = patientInfo?.name?.replace(/\s+/g, '_') || 'Patient';
      const date = new Date().toISOString().slice(0, 10);
      downloadPdfFromUrl(pdfDataUrl, `Prescription_${name}_${date}.pdf`);
      toast.success('PDF downloaded successfully');
    } else {
      toast.error('PDF not ready yet. Switch to PDF view first.');
    }
  }, [pdfDataUrl, patientInfo]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      scroll="paper"
      PaperProps={{
        sx: {
          borderRadius: 3,
          height: '90vh',
          maxHeight: '90vh',
        },
      }}
    >
      {/* ── Header ── */}
      <DialogTitle
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          bgcolor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          py: 1.5,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h6" fontWeight={700}>Prescription Preview</Typography>
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, v) => v && setViewMode(v)}
            size="small"
            sx={{
              '& .MuiToggleButton-root': {
                textTransform: 'none',
                px: 2,
                py: 0.5,
                fontSize: 13,
              },
            }}
          >
            <ToggleButton value="summary">
              <DescriptionIcon sx={{ mr: 0.5, fontSize: 18 }} /> Summary
            </ToggleButton>
            <ToggleButton value="pdf">
              <PictureAsPdfIcon sx={{ mr: 0.5, fontSize: 18 }} /> PDF
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
        <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
      </DialogTitle>

      {/* ── Content ── */}
      <DialogContent
        dividers
        sx={{
          p: viewMode === 'pdf' ? 0 : 2,
          bgcolor: viewMode === 'pdf' ? '#525659' : '#fff',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {viewMode === 'pdf' ? (
          <Box sx={{ flex: 1, p: 2 }}>
            <PrescriptionPdf
              data={prescriptionData}
              patientInfo={patientInfo}
              dropdownOptions={dropdownOptions}
              printSettings={printEnabledSections}
              language={language}
              onPdfReady={handlePdfReady}
            />
          </Box>
        ) : (
          <Box sx={{ p: 2 }}>
            {/* ── Summary View (existing HTML preview) ── */}

            {/* Clinic Header */}
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Typography variant="h5" fontWeight={700} color="primary">EMR Healthcare</Typography>
              <Typography variant="body2" color="text.secondary">Dr. Dev User | General Practitioner</Typography>
              <Divider sx={{ mt: 1.5 }} />
            </Box>

            {/* Patient Info */}
            {patientInfo && (
              <Card variant="outlined" sx={{ mb: 3, bgcolor: '#f8fafc' }}>
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 6 }}><Typography variant="body2"><strong>Patient:</strong> {patientInfo.name}</Typography></Grid>
                    <Grid size={{ xs: 3 }}><Typography variant="body2"><strong>Age:</strong> {patientInfo.age}</Typography></Grid>
                    <Grid size={{ xs: 3 }}><Typography variant="body2"><strong>Gender:</strong> {patientInfo.gender}</Typography></Grid>
                    {patientInfo.phone && (
                      <Grid size={{ xs: 6 }}><Typography variant="body2"><strong>Phone:</strong> {patientInfo.phone}</Typography></Grid>
                    )}
                    <Grid size={{ xs: 6 }}><Typography variant="body2"><strong>Date:</strong> {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</Typography></Grid>
                  </Grid>
                </CardContent>
              </Card>
            )}

            {/* Vitals */}
            {isPrintEnabled('vitals') && Object.keys(vitals).length > 0 && (
              <Box sx={{ mb: 2.5 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom color="primary">Vitals</Typography>
                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                  {vitals.height?.value && <Chip label={`Height: ${vitals.height.value} cm`} size="small" variant="outlined" />}
                  {vitals.weight?.value && <Chip label={`Weight: ${vitals.weight.value} kg`} size="small" variant="outlined" />}
                  {vitals.bmi && <Chip label={`BMI: ${vitals.bmi}`} size="small" color="info" />}
                  {vitals.bp?.systolic && <Chip label={`BP: ${vitals.bp.systolic}/${vitals.bp.diastolic} mmHg`} size="small" variant="outlined" />}
                  {vitals.heartRate && <Chip label={`HR: ${vitals.heartRate} bpm`} size="small" variant="outlined" />}
                  {vitals.temp?.value && <Chip label={`Temp: ${vitals.temp.value}°F`} size="small" variant="outlined" />}
                  {vitals.spo2 && <Chip label={`SpO2: ${vitals.spo2}%`} size="small" variant="outlined" />}
                  {vitals.pulse?.value && <Chip label={`Pulse: ${vitals.pulse.value} bpm`} size="small" variant="outlined" />}
                  {vitals.rr && <Chip label={`RR: ${vitals.rr}/min`} size="small" variant="outlined" />}
                </Box>
                <Divider sx={{ mt: 2 }} />
              </Box>
            )}

            {/* Symptoms */}
            {isPrintEnabled('symptoms') && symptoms.length > 0 && (
              <Box sx={{ mb: 2.5 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom color="primary">Chief Complaints</Typography>
                {symptoms.map((s, i) => {
                  const severity = resolveDropdown(s.severity_id, ddSym?.severity, language, s.severity) || '';
                  const laterality = resolveDropdown(s.laterality_id, ddSym?.laterality, language, s.laterality) || '';
                  return (
                    <Typography key={i} variant="body2" sx={{ mb: 0.5 }}>
                      {i + 1}. <strong>{s.name}</strong>
                      {severity && <Chip label={severity} size="small" sx={{ ml: 1, height: 20, fontSize: 11 }} />}
                      {s.duration && ` — ${s.duration}`}
                      {laterality && ` (${laterality})`}
                      {s.additionalInfo && ` • ${s.additionalInfo}`}
                    </Typography>
                  );
                })}
                <Divider sx={{ mt: 2 }} />
              </Box>
            )}

            {/* Diagnosis */}
            {isPrintEnabled('diagnosis') && diagnoses.length > 0 && (
              <Box sx={{ mb: 2.5 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom color="primary">Diagnosis</Typography>
                {diagnoses.map((d, i) => (
                  <Box key={i} sx={{ mb: 0.5, display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="body2">
                      {i + 1}. <strong>{d.description}</strong>
                    </Typography>
                    <Chip label={resolveTextTranslated(d.status, dropdownOptions?.diagnosis?.status, language)} size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />
                    {d.type && <Chip label={translateDiagnosisType(d.type, language)} size="small" variant="outlined" sx={{ height: 20, fontSize: 11 }} />}
                  </Box>
                ))}
                <Divider sx={{ mt: 2 }} />
              </Box>
            )}

            {/* Examination */}
            {isPrintEnabled('examinationFindings') && examinationFindings.length > 0 && (
              <Box sx={{ mb: 2.5 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom color="primary">Examination Findings</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {examinationFindings.map((f, i) => (
                    <Chip key={i} label={f.notes ? `${f.name}: ${f.notes}` : f.name} size="small" variant="outlined" />
                  ))}
                </Box>
                <Divider sx={{ mt: 2 }} />
              </Box>
            )}

            {/* Medications */}
            {isPrintEnabled('medication') && medications.length > 0 && (
              <Box sx={{ mb: 2.5 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom color="primary">Rx — Medications</Typography>
                <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.75 } }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                      <TableCell sx={{ fontWeight: 600 }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Drug</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Dosage</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Frequency</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Timing</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Duration</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {medications.map((m, i) => (
                      <TableRow key={i}>
                        <TableCell>{i + 1}</TableCell>
                        <TableCell>
                          <strong>{m.brandName}</strong>
                          {m.genericName && <Typography variant="caption" color="text.secondary" display="block">{m.genericName}</Typography>}
                        </TableCell>
                        <TableCell>{resolveDropdown(m.dosage_id, ddMed?.dosage, language, m.dosage)}</TableCell>
                        <TableCell>{resolveDropdown(m.frequency_id, ddMed?.frequency, language, m.frequency)}</TableCell>
                        <TableCell>{resolveDropdown(m.timing_id, ddMed?.timing, language, m.timing)}</TableCell>
                        <TableCell>{resolveDropdown(m.duration_id, ddMed?.duration, language, m.duration)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Divider sx={{ mt: 2 }} />
              </Box>
            )}

            {/* Lab Investigations */}
            {isPrintEnabled('labTests') && labInvestigations.length > 0 && (
              <Box sx={{ mb: 2.5 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom color="primary">Lab Investigations</Typography>
                {labInvestigations.map((l, i) => (
                  <Typography key={i} variant="body2" sx={{ mb: 0.5 }}>
                    {i + 1}. {l.testName}
                    {l.category && <Chip label={l.category} size="small" sx={{ ml: 1, height: 18, fontSize: 10 }} />}
                    {l.urgent && <Chip label="URGENT" size="small" color="error" sx={{ ml: 1, height: 18, fontSize: 10 }} />}
                    {l.remarks && ` — ${l.remarks}`}
                  </Typography>
                ))}
                <Divider sx={{ mt: 2 }} />
              </Box>
            )}

            {/* Lab Results */}
            {isPrintEnabled('labResults') && labResults.length > 0 && (
              <Box sx={{ mb: 2.5 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom color="primary">Lab Results</Typography>
                <Table size="small" sx={{ '& .MuiTableCell-root': { py: 0.75 } }}>
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#f5f5f5' }}>
                      <TableCell sx={{ fontWeight: 600 }}>Test</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Reading</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Unit</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Normal</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {labResults.map((r, i) => (
                      <TableRow key={i}>
                        <TableCell>{r.testName}</TableCell>
                        <TableCell><strong>{r.reading}</strong></TableCell>
                        <TableCell>{r.unit}</TableCell>
                        <TableCell>{r.normalRange}</TableCell>
                        <TableCell>
                          <Chip
                            label={resolveTextTranslated(r.interpretation, dropdownOptions?.labresult?.interpretation, language) || 'Pending'}
                            size="small"
                            color={r.interpretation === 'Normal' ? 'success' : r.interpretation === 'Abnormal' ? 'error' : 'default'}
                            sx={{ height: 22 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Divider sx={{ mt: 2 }} />
              </Box>
            )}

            {/* Medical History */}
            {isPrintEnabled('patientMedicalHistory') && !noRelevantHistory && medicalConditions.some(c => c.value !== '-') && (
              <Box sx={{ mb: 2.5 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom color="primary">Medical History</Typography>
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                  {medicalConditions.filter(c => c.value === 'Y').map((c, i) => (
                    <Chip key={i} label={`${c.name}${c.since ? ` (since ${c.since})` : ''}`} size="small" color="warning" />
                  ))}
                  {medicalConditions.filter(c => c.value === 'N').map((c, i) => (
                    <Chip key={i} label={c.name} size="small" color="success" variant="outlined" />
                  ))}
                </Box>
                <Divider sx={{ mt: 2 }} />
              </Box>
            )}

            {/* Procedures */}
            {isPrintEnabled('procedures') && procedures.length > 0 && (
              <Box sx={{ mb: 2.5 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom color="primary">Procedures</Typography>
                {procedures.map((p, i) => (
                  <Typography key={i} variant="body2" sx={{ mb: 0.5 }}>
                    {i + 1}. <strong>{p.name}</strong> {p.date && `(${p.date})`} {p.notes && `— ${p.notes}`}
                  </Typography>
                ))}
                <Divider sx={{ mt: 2 }} />
              </Box>
            )}

            {/* Follow-Up */}
            {isPrintEnabled('followup') && followUp && (
              <Box sx={{ mb: 2.5 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom color="primary">Follow-Up</Typography>
                <Typography variant="body2">
                  <strong>Date:</strong> {followUp.followUpDate} {followUp.notes && `| ${followUp.notes}`}
                </Typography>
                <Divider sx={{ mt: 2 }} />
              </Box>
            )}

            {/* Referral */}
            {isPrintEnabled('referToDoctor') && referral?.doctorName && (
              <Box sx={{ mb: 2.5 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom color="primary">Referral</Typography>
                <Typography variant="body2">
                  Referred to: <strong>Dr. {referral.doctorName}</strong> ({referral.specialty}) — {referral.reason}
                </Typography>
                <Divider sx={{ mt: 2 }} />
              </Box>
            )}

            {/* Advice */}
            {isPrintEnabled('advices') && advice && (
              <Box sx={{ mb: 2.5 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom color="primary">Advice</Typography>
                <Typography variant="body2" whiteSpace="pre-wrap">{advice}</Typography>
                <Divider sx={{ mt: 2 }} />
              </Box>
            )}

            {/* Notes */}
            {isPrintEnabled('notes') && surgicalNotes && (
              <Box sx={{ mb: 2.5 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom color="primary">Surgical Notes</Typography>
                <Typography variant="body2" whiteSpace="pre-wrap">{surgicalNotes}</Typography>
                <Divider sx={{ mt: 2 }} />
              </Box>
            )}
            {isPrintEnabled('notes') && privateNotes && (
              <Box sx={{ mb: 2.5 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom color="primary">Private Notes</Typography>
                <Typography variant="body2" whiteSpace="pre-wrap" sx={{ fontStyle: 'italic', color: 'text.secondary' }}>
                  {privateNotes}
                </Typography>
                <Typography variant="caption" color="error">* Will not appear on printed prescription</Typography>
                <Divider sx={{ mt: 2 }} />
              </Box>
            )}

            {/* Custom Sections */}
            {isPrintEnabled('customSection') && customSections.length > 0 && customSections.map(cs => (
              <Box key={cs.id} sx={{ mb: 2.5 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom color="primary">{cs.title}</Typography>
                {cs.items.filter(item => item.key || item.value).map((item, i) => (
                  <Typography key={i} variant="body2"><strong>{item.key}:</strong> {item.value}</Typography>
                ))}
                <Divider sx={{ mt: 2 }} />
              </Box>
            ))}

            {/* Signature */}
            <Box sx={{ mt: 4, textAlign: 'right' }}>
              <Typography variant="body2" color="text.secondary">Signature</Typography>
              <Typography variant="subtitle1" fontWeight={600}>Dr. Dev User</Typography>
              <Typography variant="caption" color="text.secondary">General Practitioner</Typography>
            </Box>
          </Box>
        )}
      </DialogContent>

      {/* ── Footer Actions ── */}
      <DialogActions sx={{ px: 3, py: 1.5, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0', gap: 1 }}>
        <Tooltip title="Print the prescription">
          <Button startIcon={<PrintIcon />} onClick={() => window.print()} variant="outlined" size="small">
            Print
          </Button>
        </Tooltip>
        <Tooltip title={pdfDataUrl ? 'Download as PDF file' : 'Switch to PDF view to enable download'}>
          <span>
            <Button
              startIcon={<DownloadIcon />}
              variant="outlined"
              size="small"
              onClick={handleDownload}
              disabled={!pdfDataUrl}
            >
              Download PDF
            </Button>
          </span>
        </Tooltip>
        <Box sx={{ flex: 1 }} />
        {onFinish && (
          <Button onClick={onFinish} variant="contained" color="success" size="medium" sx={{ fontWeight: 600 }}>
            Finish Prescription
          </Button>
        )}
        <Button onClick={onClose} variant="contained" size="medium">Close</Button>
      </DialogActions>
    </Dialog>
  );
}
