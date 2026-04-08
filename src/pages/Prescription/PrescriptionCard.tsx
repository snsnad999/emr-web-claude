import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Box, Skeleton, Alert } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PrescriptionProvider, usePrescription, type SectionId } from './context/PrescriptionContext';
import SmallNavbar from './components/SmallNavbar';
import Footer from './components/Footer';
import ConfigurePad from './components/ConfigurePad';
import VitalsSection from './sections/VitalsSection';
import SymptomsSection from './sections/SymptomsSection';
import DiagnosisSection from './sections/DiagnosisSection';
import ExaminationSection from './sections/ExaminationSection';
import MedicationSection from './sections/MedicationSection';
import LabInvestigationsSection from './sections/LabInvestigationsSection';
import LabResultsSection from './sections/LabResultsSection';
import MedicalHistorySection from './sections/MedicalHistorySection';
import ProceduresSection from './sections/ProceduresSection';
import FollowUpSection from './sections/FollowUpSection';
import ReferralSection from './sections/ReferralSection';
import AdviceSection from './sections/AdviceSection';
import NotesSection from './sections/NotesSection';
import CustomSectionsSection from './sections/CustomSectionsSection';
import PreviewModal from './components/PreviewModal';
import { patientApi } from '@/services/api';

const SECTION_COMPONENTS: Record<SectionId, React.ComponentType> = {
  vitals: VitalsSection,
  symptoms: SymptomsSection,
  diagnosis: DiagnosisSection,
  examination: ExaminationSection,
  medications: MedicationSection,
  labInvestigations: LabInvestigationsSection,
  labResults: LabResultsSection,
  medicalHistory: MedicalHistorySection,
  procedures: ProceduresSection,
  followUp: FollowUpSection,
  referral: ReferralSection,
  advice: AdviceSection,
  notes: NotesSection,
  customSections: CustomSectionsSection,
};

function PrescriptionContent() {
  const { patientId } = useParams<{ patientId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [configurePadOpen, setConfigurePadOpen] = useState(false);

  const {
    setPatient, setIsEditing, setPrescriptionId, loadPrescription,
    collectPayload, collectPrescriptionData, setIsSaving,
    sectionConfig, patient, isEditing, prescriptionId,
    clearAllPrescription, patientInfo, mainTemplates, applyTemplate,
    dropdownOptions, printEnabledSections,
  } = usePrescription();

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleScrollToSection = useCallback((sectionId: string) => {
    const el = document.getElementById(`section-${sectionId}`);
    if (el && scrollContainerRef.current) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Check if editing or copying from location state
  const locationState = location.state as {
    prescriptionData?: Record<string, unknown>;
    isEditing?: boolean;
    copyToRx?: boolean;
  } | null;
  const loadedFromStateRef = useRef(false);

  // Fetch patient data
  const { data: patientData, isLoading: patientLoading, error: patientError } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => patientApi.getPatientById(patientId!),
    enabled: !!patientId,
  });

  useEffect(() => {
    if (patientData?.data) {
      setPatient(patientData.data);
    }
  }, [patientData, setPatient]);

  // Load prescription data from location state (edit or copy-to-rx)
  useEffect(() => {
    if (loadedFromStateRef.current || !locationState?.prescriptionData) return;
    loadedFromStateRef.current = true;

    if (locationState.isEditing) {
      setIsEditing(true);
      setPrescriptionId((locationState.prescriptionData as Record<string, string>).prescriptionId || null);
      loadPrescription(locationState.prescriptionData as Record<string, unknown>);
      toast.info('Editing prescription — make changes and save');
    } else if (locationState.copyToRx) {
      // Copy mode: load data but as a NEW prescription (no prescriptionId)
      const { prescriptionId: _removed, ...dataWithoutId } = locationState.prescriptionData as Record<string, unknown>;
      void _removed;
      loadPrescription(dataWithoutId);
      toast.info('Prescription data copied — review and save as new');
    }
    // Clear location state to prevent re-loading on subsequent renders
    window.history.replaceState({}, '');
  }, [locationState, setIsEditing, setPrescriptionId, loadPrescription]);

  // ── Save Prescription (just save, stay on page) ──
  const handleSave = useCallback(async () => {
    if (!patientId) return;
    setIsSaving(true);
    try {
      const payload = collectPayload();
      if (isEditing && prescriptionId) {
        await (await import('@/services/api')).prescriptionApi.updatePrescription({ ...payload, prescriptionId });
        toast.success('Prescription updated successfully');
      } else {
        const result = await (await import('@/services/api')).prescriptionApi.savePrescription(payload);
        toast.success('Prescription saved successfully');
        setPrescriptionId(result.data.prescriptionId);
      }
    } catch {
      toast.error('Failed to save prescription');
    } finally {
      setIsSaving(false);
    }
  }, [patientId, isEditing, prescriptionId, collectPayload, setIsSaving, setPrescriptionId]);

  // ── Finish Prescription (save + navigate to final page with PDF) ──
  const handleFinish = useCallback(async () => {
    if (!patientId) return;
    setIsSaving(true);
    try {
      const payload = collectPayload();
      let savedId = prescriptionId;

      if (isEditing && prescriptionId) {
        await (await import('@/services/api')).prescriptionApi.updatePrescription({ ...payload, prescriptionId });
        toast.success('Prescription updated!');
      } else {
        const result = await (await import('@/services/api')).prescriptionApi.savePrescription(payload);
        savedId = result.data.prescriptionId;
        setPrescriptionId(savedId);
        toast.success('Prescription saved!');
      }

      // Collect all data for the final page (PDF preview)
      const prescriptionData = collectPrescriptionData();

      navigate('/prescription-final', {
        state: {
          patientId,
          prescriptionId: savedId || 'new',
          patientInfo,
          prescriptionData,
          dropdownOptions,
          printSettings: printEnabledSections,
          language: prescriptionData.language || 'en',
        },
      });
    } catch {
      toast.error('Failed to save prescription. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }, [
    patientId, isEditing, prescriptionId, collectPayload, collectPrescriptionData,
    navigate, setIsSaving, setPrescriptionId, patientInfo, dropdownOptions, printEnabledSections,
  ]);

  // ── Finish from Preview Modal ──
  const handleFinishFromPreview = useCallback(() => {
    setPreviewOpen(false);
    handleFinish();
  }, [handleFinish]);

  const handleApplyMainTemplate = useCallback((templateId: string) => {
    applyTemplate(templateId, 'main');
  }, [applyTemplate]);


  if (patientLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Skeleton variant="rectangular" height={48} sx={{ mb: 2, borderRadius: 1 }} />
        {[1, 2, 3].map(i => (
          <Skeleton key={i} variant="rectangular" height={120} sx={{ mb: 2, borderRadius: 1 }} />
        ))}
      </Box>
    );
  }

  if (patientError || !patientId) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Failed to load patient data. Please try again.</Alert>
      </Box>
    );
  }

  const orderedSections = sectionConfig.sectionOrder.filter(
    s => sectionConfig.enabledSections.includes(s)
  );

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        /* 64px Header + 48px Layout padding (p:3 × 2) */
        height: 'calc(100vh - 112px)',
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <SmallNavbar
        patientName={patient?.name}
        isEditing={isEditing}
        prescriptionId={prescriptionId}
        patientInfo={patientInfo}
        mainTemplates={mainTemplates}
        onConfigurePad={() => setConfigurePadOpen(true)}
        onApplyMainTemplate={handleApplyMainTemplate}
        onScrollToSection={handleScrollToSection}
      />

      <Box ref={scrollContainerRef} sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        {orderedSections.map(sectionId => {
          const Component = SECTION_COMPONENTS[sectionId];
          if (!Component) return null;
          return <Component key={sectionId} />;
        })}
      </Box>

      <Footer
        onPreview={() => setPreviewOpen(true)}
        onSave={handleSave}
        onConfigurePad={() => setConfigurePadOpen(true)}
        onClearAll={clearAllPrescription}
        onFinish={handleFinish}
      />

      <PreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        onFinish={handleFinishFromPreview}
      />
      <ConfigurePad open={configurePadOpen} onClose={() => setConfigurePadOpen(false)} />
    </Box>
  );
}

export default function PrescriptionCard() {
  return (
    <PrescriptionProvider>
      <PrescriptionContent />
    </PrescriptionProvider>
  );
}
