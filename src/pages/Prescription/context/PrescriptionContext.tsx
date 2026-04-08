import { createContext, useContext, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { toast } from 'sonner';
import type {
  Vitals, VitalField, Symptom, Diagnosis, Medication, LabInvestigation,
  LabResult, ExaminationFinding, ProcedureEntry, FollowUp,
  Referral, CustomSection, PrescriptionLanguage, Patient,
  DropdownOptions, PrescriptionTemplate, PatientInfo, PrescriptionVitals,
  VitalUnitsMap,
} from '@/types';
import { prescriptionApi } from '@/services/api';
import {
  fetchDropdownOptions, fetchConfiguration, fetchAllTemplates,
  fetchPatientDetail, fetchPrintSettingsData, savePrintSettingsData,
  createSectionTemplate, updateSectionTemplate, deleteSectionTemplate, fetchSingleTemplate,
  fetchVitalUnits, buildSubmitPayload, DEV_ORG, DEV_BRANCH, DEV_DOCTOR,
  type CollectedPrescriptionData,
} from './prescriptionHelpers';

// ─── Section Config ──────────────────────────────────────────────────
export const ALL_SECTIONS = [
  'vitals', 'symptoms', 'diagnosis', 'examination', 'medications',
  'labInvestigations', 'labResults', 'medicalHistory', 'procedures',
  'followUp', 'referral', 'advice', 'notes', 'customSections',
] as const;

export type SectionId = (typeof ALL_SECTIONS)[number];

export interface SectionConfig {
  enabledSections: SectionId[];
  sectionOrder: SectionId[];
}

// ─── Medical History ─────────────────────────────────────────────────
export interface MedicalCondition {
  name: string;
  value: 'Y' | 'N' | '-';
  since?: string;
  notes?: string;
}

const DEFAULT_CONDITIONS: MedicalCondition[] = [
  { name: 'Diabetes mellitus', value: '-' }, { name: 'Hypertension', value: '-' },
  { name: 'Hypothyroidism', value: '-' }, { name: 'Alcohol', value: '-' },
  { name: 'Tobacco', value: '-' }, { name: 'Tobacco (Chewing)', value: '-' },
  { name: 'Smoking', value: '-' }, { name: 'Dustel 0.5Mg Tablet', value: '-' },
];

// ─── State ───────────────────────────────────────────────────────────
export interface PrescriptionState {
  prescriptionId: string | null;
  isEditing: boolean;
  isSaving: boolean;
  patientId: string | null;
  patient: Patient | null;
  language: PrescriptionLanguage;
  activeSection: SectionId;
  // Clinical data
  vitals: Vitals;
  symptoms: Symptom[];
  diagnoses: Diagnosis[];
  examinationFindings: ExaminationFinding[];
  medications: Medication[];
  labInvestigations: LabInvestigation[];
  labResults: LabResult[];
  medicalConditions: MedicalCondition[];
  noRelevantHistory: boolean;
  procedures: ProcedureEntry[];
  followUp: FollowUp | null;
  referral: Referral | null;
  advice: string;
  surgicalNotes: string;
  privateNotes: string;
  customSections: CustomSection[];
  sectionConfig: SectionConfig;
  // Extended state
  dropdownOptions: DropdownOptions | null;
  templates: PrescriptionTemplate[];
  mainTemplates: PrescriptionTemplate[];
  patientInfo: PatientInfo | null;
  lockedVitals: PrescriptionVitals | null;
  vitalUnits: VitalUnitsMap;
  printEnabledSections: Record<string, boolean>;
  essentialLoading: boolean;
  isFetchingPrescription: boolean;
  copyToRxMode: boolean;
}

// ─── Actions ─────────────────────────────────────────────────────────
export interface PrescriptionActions {
  setPatient: (patient: Patient) => void;
  setLanguage: (lang: PrescriptionLanguage) => void;
  setActiveSection: (section: SectionId) => void;
  setIsEditing: (editing: boolean) => void;
  setIsSaving: (saving: boolean) => void;
  setPrescriptionId: (id: string | null) => void;
  updateVitals: (vitals: Partial<Vitals>) => void;
  setVitals: (vitals: Vitals) => void;
  toggleVitalLock: (key: string) => void;
  addSymptom: (symptom: Symptom) => void;
  removeSymptom: (index: number) => void;
  updateSymptom: (index: number, symptom: Symptom) => void;
  addDiagnosis: (diagnosis: Diagnosis) => void;
  removeDiagnosis: (index: number) => void;
  updateDiagnosis: (index: number, diagnosis: Diagnosis) => void;
  addExaminationFinding: (finding: ExaminationFinding) => void;
  removeExaminationFinding: (index: number) => void;
  addMedication: (medication: Medication) => void;
  removeMedication: (index: number) => void;
  updateMedication: (index: number, medication: Medication) => void;
  addLabInvestigation: (lab: LabInvestigation) => void;
  removeLabInvestigation: (index: number) => void;
  updateLabInvestigation: (index: number, lab: LabInvestigation) => void;
  addLabResult: (result: LabResult) => void;
  removeLabResult: (index: number) => void;
  updateMedicalCondition: (index: number, condition: MedicalCondition) => void;
  setMedicalConditions: (conditions: MedicalCondition[]) => void;
  setNoRelevantHistory: (value: boolean) => void;
  addProcedure: (procedure: ProcedureEntry) => void;
  removeProcedure: (index: number) => void;
  setFollowUp: (followUp: FollowUp | null) => void;
  setReferral: (referral: Referral | null) => void;
  setAdvice: (advice: string) => void;
  setSurgicalNotes: (notes: string) => void;
  setPrivateNotes: (notes: string) => void;
  addCustomSection: (section: CustomSection) => void;
  removeCustomSection: (index: number) => void;
  updateCustomSection: (index: number, section: CustomSection) => void;
  toggleSection: (section: SectionId) => void;
  reorderSections: (sections: SectionId[]) => void;
  resetPrescription: () => void;
  loadPrescription: (data: Partial<PrescriptionState>) => void;
  collectPayload: () => Record<string, unknown>;
  // Extended actions
  collectPrescriptionData: () => CollectedPrescriptionData;
  submitPrescription: () => Promise<string | null>;
  updatePrescriptionApi: () => Promise<boolean>;
  clearAllPrescription: () => void;
  addTemplate: (name: string, type: string, items: Record<string, unknown>[]) => Promise<string | null>;
  updateTemplate: (templateId: string, name: string, type: string, items: Record<string, unknown>[]) => Promise<boolean>;
  deleteTemplate: (templateId: string, templateType: string) => Promise<boolean>;
  applyTemplate: (templateId: string, type: string) => Promise<void>;
  getTemplatesByType: (type: string) => PrescriptionTemplate[];
  savePrintSettings: (settings: Record<string, boolean>) => Promise<void>;
  reorderSymptoms: (symptoms: Symptom[]) => void;
  reorderMedications: (medications: Medication[]) => void;
  reorderDiagnoses: (diagnoses: Diagnosis[]) => void;
  reorderExaminationFindings: (findings: ExaminationFinding[]) => void;
  reorderLabInvestigations: (labs: LabInvestigation[]) => void;
  reorderLabResults: (results: LabResult[]) => void;
  reorderProcedures: (procedures: ProcedureEntry[]) => void;
  reorderCustomSections: (sections: CustomSection[]) => void;
  refreshPrintSettings: () => Promise<void>;
}

export type PrescriptionContextValue = PrescriptionState & PrescriptionActions;

// ─── Initial State ───────────────────────────────────────────────────
const initialState: PrescriptionState = {
  prescriptionId: null, isEditing: false, isSaving: false,
  patientId: null, patient: null, language: 'en', activeSection: 'vitals',
  vitals: {}, symptoms: [], diagnoses: [], examinationFindings: [],
  medications: [], labInvestigations: [], labResults: [],
  medicalConditions: [...DEFAULT_CONDITIONS], noRelevantHistory: false,
  procedures: [], followUp: null, referral: null,
  advice: '', surgicalNotes: '', privateNotes: '', customSections: [],
  sectionConfig: { enabledSections: [...ALL_SECTIONS], sectionOrder: [...ALL_SECTIONS] },
  dropdownOptions: null, templates: [], mainTemplates: [],
  patientInfo: null, lockedVitals: null, vitalUnits: {},
  printEnabledSections: {}, essentialLoading: true,
  isFetchingPrescription: false, copyToRxMode: false,
};

// ─── Context ─────────────────────────────────────────────────────────
const PrescriptionContext = createContext<PrescriptionContextValue | null>(null);

export function PrescriptionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<PrescriptionState>({ ...initialState });
  const { patientId: urlPatientId } = useParams<{ patientId: string }>();
  const initRef = useRef(false);

  // ─── Initialization: fetch all data on mount ──────────────────────
  useEffect(() => {
    if (initRef.current) return;
    initRef.current = true;

    const init = async () => {
      const [ddOpts, config, templates, printSettings, vUnits] = await Promise.all([
        fetchDropdownOptions(),
        fetchConfiguration(),
        fetchAllTemplates(),
        fetchPrintSettingsData(),
        fetchVitalUnits(),
      ]);

      setState(s => {
        const updates: Partial<PrescriptionState> = {};
        if (ddOpts) updates.dropdownOptions = ddOpts;
        if (templates) updates.templates = templates;
        if (printSettings) updates.printEnabledSections = printSettings;
        if (vUnits) updates.vitalUnits = vUnits;
        if (config) {
          const cfg = config as unknown as Record<string, unknown>;
          if (cfg.section_order && Array.isArray(cfg.section_order)) {
            updates.sectionConfig = {
              ...s.sectionConfig,
              sectionOrder: cfg.section_order as SectionId[],
              enabledSections: cfg.enabled_sections
                ? (Object.entries(cfg.enabled_sections as Record<string, boolean>)
                    .filter(([, v]) => v).map(([k]) => k) as SectionId[])
                : [...ALL_SECTIONS],
            };
          }
        }
        return { ...s, ...updates };
      });

      // Fetch patient data if URL has patientId
      if (urlPatientId) {
        const patientData = await fetchPatientDetail(urlPatientId);
        const lv = patientData?.lockedVitals || null;
        setState(s => ({
          ...s,
          patientInfo: patientData?.patientInfo || null,
          lockedVitals: lv,
          vitals: lv ? mapLockedVitalsToVitals(lv) : s.vitals,
          medicalConditions: patientData?.medicalHistory?.length
            ? mergeConditions(DEFAULT_CONDITIONS, patientData.medicalHistory)
            : [...DEFAULT_CONDITIONS],
          essentialLoading: false,
        }));
      } else {
        setState(s => ({ ...s, essentialLoading: false }));
      }
    };

    init();
  }, [urlPatientId]);

  // ─── Basic setters ────────────────────────────────────────────────
  const set = useCallback(<K extends keyof PrescriptionState>(key: K, val: PrescriptionState[K]) => {
    setState(s => ({ ...s, [key]: val }));
  }, []);

  const setPatient = useCallback((patient: Patient) => {
    setState(s => ({ ...s, patient, patientId: patient.patientId }));
  }, []);
  const setLanguage = useCallback((language: PrescriptionLanguage) => set('language', language), [set]);
  const setActiveSection = useCallback((activeSection: SectionId) => set('activeSection', activeSection), [set]);
  const setIsEditing = useCallback((isEditing: boolean) => set('isEditing', isEditing), [set]);
  const setIsSaving = useCallback((isSaving: boolean) => set('isSaving', isSaving), [set]);
  const setPrescriptionId = useCallback((prescriptionId: string | null) => set('prescriptionId', prescriptionId), [set]);

  // ─── Vitals ───────────────────────────────────────────────────────
  const updateVitals = useCallback((updates: Partial<Vitals>) => {
    setState(s => {
      const v = { ...s.vitals, ...updates };
      const h = parseFloat(v.height?.value || '');
      const w = parseFloat(v.weight?.value || '');
      if (h > 0 && w > 0) v.bmi = (w / ((h / 100) ** 2)).toFixed(1);
      return { ...s, vitals: v };
    });
  }, []);
  const setVitalsAction = useCallback((vitals: Vitals) => set('vitals', vitals), [set]);
  const toggleVitalLock = useCallback((key: string) => {
    setState(s => {
      const field = s.vitals[key as keyof Vitals];
      if (!field || typeof field === 'string') return s;
      return {
        ...s,
        vitals: {
          ...s.vitals,
          [key]: { ...field, locked: !(field as VitalField).locked },
        },
      };
    });
  }, []);

  // ─── Array CRUD helpers ───────────────────────────────────────────
  const addItem = useCallback(<K extends keyof PrescriptionState>(key: K, item: unknown) => {
    setState(s => ({ ...s, [key]: [...(s[key] as unknown[]), item] }));
  }, []);
  const removeItem = useCallback(<K extends keyof PrescriptionState>(key: K, i: number) => {
    setState(s => ({ ...s, [key]: (s[key] as unknown[]).filter((_, idx) => idx !== i) }));
  }, []);
  const updateItem = useCallback(<K extends keyof PrescriptionState>(key: K, i: number, item: unknown) => {
    setState(s => ({ ...s, [key]: (s[key] as unknown[]).map((v, idx) => idx === i ? item : v) }));
  }, []);

  const addSymptom = useCallback((s: Symptom) => addItem('symptoms', s), [addItem]);
  const removeSymptom = useCallback((i: number) => removeItem('symptoms', i), [removeItem]);
  const updateSymptom = useCallback((i: number, s: Symptom) => updateItem('symptoms', i, s), [updateItem]);
  const addDiagnosis = useCallback((d: Diagnosis) => addItem('diagnoses', d), [addItem]);
  const removeDiagnosis = useCallback((i: number) => removeItem('diagnoses', i), [removeItem]);
  const updateDiagnosis = useCallback((i: number, d: Diagnosis) => updateItem('diagnoses', i, d), [updateItem]);
  const addExaminationFinding = useCallback((f: ExaminationFinding) => addItem('examinationFindings', f), [addItem]);
  const removeExaminationFinding = useCallback((i: number) => removeItem('examinationFindings', i), [removeItem]);
  const addMedication = useCallback((m: Medication) => addItem('medications', m), [addItem]);
  const removeMedication = useCallback((i: number) => removeItem('medications', i), [removeItem]);
  const updateMedication = useCallback((i: number, m: Medication) => updateItem('medications', i, m), [updateItem]);
  const addLabInvestigation = useCallback((l: LabInvestigation) => addItem('labInvestigations', l), [addItem]);
  const removeLabInvestigation = useCallback((i: number) => removeItem('labInvestigations', i), [removeItem]);
  const updateLabInvestigation = useCallback((i: number, l: LabInvestigation) => updateItem('labInvestigations', i, l), [updateItem]);
  const addLabResult = useCallback((r: LabResult) => addItem('labResults', r), [addItem]);
  const removeLabResult = useCallback((i: number) => removeItem('labResults', i), [removeItem]);
  const addProcedure = useCallback((p: ProcedureEntry) => addItem('procedures', p), [addItem]);
  const removeProcedure = useCallback((i: number) => removeItem('procedures', i), [removeItem]);
  const addCustomSection = useCallback((s: CustomSection) => addItem('customSections', s), [addItem]);
  const removeCustomSection = useCallback((i: number) => removeItem('customSections', i), [removeItem]);
  const updateCustomSection = useCallback((i: number, s: CustomSection) => updateItem('customSections', i, s), [updateItem]);

  const updateMedicalCondition = useCallback((i: number, c: MedicalCondition) => {
    setState(s => {
      if (i >= s.medicalConditions.length) {
        return { ...s, medicalConditions: [...s.medicalConditions, c] };
      }
      return { ...s, medicalConditions: s.medicalConditions.map((mc, idx) => idx === i ? c : mc) };
    });
  }, []);
  const setMedicalConditions = useCallback((conditions: MedicalCondition[]) => set('medicalConditions', conditions), [set]);
  const setNoRelevantHistory = useCallback((v: boolean) => set('noRelevantHistory', v), [set]);
  const setFollowUp = useCallback((f: FollowUp | null) => set('followUp', f), [set]);
  const setReferral = useCallback((r: Referral | null) => set('referral', r), [set]);
  const setAdvice = useCallback((a: string) => set('advice', a), [set]);
  const setSurgicalNotes = useCallback((n: string) => set('surgicalNotes', n), [set]);
  const setPrivateNotes = useCallback((n: string) => set('privateNotes', n), [set]);

  const toggleSection = useCallback((section: SectionId) => {
    setState(s => {
      const en = s.sectionConfig.enabledSections;
      const newEn = en.includes(section) ? en.filter(x => x !== section) : [...en, section];
      return { ...s, sectionConfig: { ...s.sectionConfig, enabledSections: newEn } };
    });
  }, []);
  const reorderSections = useCallback((sections: SectionId[]) => {
    setState(s => ({ ...s, sectionConfig: { ...s.sectionConfig, sectionOrder: sections } }));
  }, []);

  // ─── Bulk operations ──────────────────────────────────────────────
  const resetPrescription = useCallback(() => {
    setState(s => ({ ...initialState, dropdownOptions: s.dropdownOptions, templates: s.templates,
      mainTemplates: s.mainTemplates, printEnabledSections: s.printEnabledSections,
      patientInfo: s.patientInfo, lockedVitals: s.lockedVitals, essentialLoading: false }));
  }, []);

  const clearAllPrescription = useCallback(() => {
    setState(s => ({
      ...s, vitals: {}, symptoms: [], diagnoses: [], examinationFindings: [],
      medications: [], labInvestigations: [], labResults: [],
      medicalConditions: [...DEFAULT_CONDITIONS], noRelevantHistory: false,
      procedures: [], followUp: null, referral: null,
      advice: '', surgicalNotes: '', privateNotes: '',
      prescriptionId: null, isEditing: false, copyToRxMode: false,
    }));
  }, []);

  const loadPrescription = useCallback((data: Partial<PrescriptionState>) => {
    setState(s => ({ ...s, ...data }));
  }, []);

  // ─── Data Collection ──────────────────────────────────────────────
  const collectPrescriptionData = useCallback((): CollectedPrescriptionData => ({
    vitals: state.vitals,
    symptoms: state.symptoms,
    diagnoses: state.diagnoses,
    examinationFindings: state.examinationFindings,
    medications: state.medications,
    labInvestigations: state.labInvestigations,
    labResults: state.labResults,
    procedures: state.procedures,
    followUp: state.followUp,
    referral: state.referral,
    advice: state.advice,
    notes: { surgicalNotes: state.surgicalNotes, privateNotes: state.privateNotes },
    customSections: state.customSections,
    medicalConditions: state.medicalConditions,
    noRelevantHistory: state.noRelevantHistory,
    language: state.language,
    sectionConfig: state.sectionConfig,
  }), [state]);

  const collectPayload = useCallback(() => {
    const data = collectPrescriptionData();
    return buildSubmitPayload(data, state.patientId, state.prescriptionId);
  }, [collectPrescriptionData, state.patientId, state.prescriptionId]);

  // ─── Submit / Update ──────────────────────────────────────────────
  const submitPrescription = useCallback(async (): Promise<string | null> => {
    const payload = collectPayload();
    try {
      const res = await prescriptionApi.savePrescription(payload);
      return res.data?.prescriptionId || null;
    } catch (e) {
      console.error('[Prescription] Save failed:', e);
      throw e;
    }
  }, [collectPayload]);

  const updatePrescriptionApi = useCallback(async (): Promise<boolean> => {
    if (!state.prescriptionId) return false;
    const payload = collectPayload();
    try {
      await prescriptionApi.updatePrescription({ ...payload, prescriptionId: state.prescriptionId });
      return true;
    } catch (e) {
      console.error('[Prescription] Update failed:', e);
      throw e;
    }
  }, [collectPayload, state.prescriptionId]);

  // ─── Template CRUD ────────────────────────────────────────────────
  const addTemplate = useCallback(async (name: string, type: string, items: Record<string, unknown>[]): Promise<string | null> => {
    const id = await createSectionTemplate(name, type, items);
    if (id) {
      setState(s => ({ ...s, templates: [...s.templates, { templateId: id, name, type, data: { items }, organizationId: DEV_ORG, branchId: DEV_BRANCH, doctorId: DEV_DOCTOR } as unknown as PrescriptionTemplate] }));
      toast.success(`Template "${name}" saved`);
    }
    return id;
  }, []);

  const updateTemplateAction = useCallback(async (templateId: string, name: string, type: string, items: Record<string, unknown>[]): Promise<boolean> => {
    const ok = await updateSectionTemplate(templateId, name, type, items);
    if (ok) {
      setState(s => ({
        ...s,
        templates: s.templates.map(t =>
          t.templateId === templateId ? { ...t, name, data: { items } } : t
        ),
      }));
      toast.success(`Template "${name}" updated`);
    }
    return ok;
  }, []);

  const deleteTemplateAction = useCallback(async (templateId: string, templateType: string): Promise<boolean> => {
    const ok = await deleteSectionTemplate(templateId, templateType);
    if (ok) {
      setState(s => ({ ...s, templates: s.templates.filter(t => t.templateId !== templateId) }));
      toast.success('Template deleted');
    }
    return ok;
  }, []);

  const applyTemplate = useCallback(async (templateId: string, type: string) => {
    const tmpl = await fetchSingleTemplate(templateId, type);
    if (!tmpl) { toast.error('Failed to load template'); return; }
    const items = (tmpl.data as Record<string, unknown>)?.items as Record<string, unknown>[] || [];
    setState(s => {
      switch (type) {
        case 'symptom': return { ...s, symptoms: items.map(i => ({ name: i.name as string, severity: (i.severity as string) || 'moderate', duration: (i.duration as string) || '' })) as Symptom[] };
        case 'medication': return { ...s, medications: items.map(i => ({ brandName: (i.brand_name || i.brandName) as string, genericName: (i.generic_name || i.genericName) as string || '', form: (i.form as string) || 'Tablet', dosage: (i.dosage as string) || '', frequency: (i.frequency as string) || '', timing: (i.timing as string) || '', duration: (i.duration as string) || '' })) as Medication[] };
        case 'diagnosis': return { ...s, diagnoses: items.map(i => ({ icdCode: (i.code || i.icdCode) as string || '', description: (i.name || i.description) as string, type: 'Primary' as const, status: 'Active' as const })) as Diagnosis[] };
        case 'labtest': return { ...s, labInvestigations: items.map(i => ({ testName: (i.name || i.testName) as string, category: (i.category as string) || '' })) as LabInvestigation[] };
        case 'examination': return { ...s, examinationFindings: items.map(i => ({ name: (i.name as string), notes: (i.note || i.notes) as string || '' })) as ExaminationFinding[] };
        case 'procedure': return { ...s, procedures: items.map(i => ({ name: (i.name as string), notes: (i.note || i.notes) as string || '' })) as ProcedureEntry[] };
        default: return s;
      }
    });
    toast.success('Template applied');
  }, []);

  const getTemplatesByType = useCallback((type: string) => {
    return state.templates.filter(t => t.type === type);
  }, [state.templates]);

  // ─── Print Settings ───────────────────────────────────────────────
  const savePrintSettings = useCallback(async (settings: Record<string, boolean>) => {
    const ok = await savePrintSettingsData(settings);
    if (ok) {
      setState(s => ({ ...s, printEnabledSections: settings }));
      toast.success('Print settings saved');
    } else {
      toast.error('Failed to save print settings');
    }
  }, []);

  const refreshPrintSettings = useCallback(async () => {
    const settings = await fetchPrintSettingsData();
    if (settings) setState(s => ({ ...s, printEnabledSections: settings }));
  }, []);

  // ─── Array reorder for DnD ──────────────────────────────────────
  const reorderSymptoms = useCallback((symptoms: Symptom[]) => set('symptoms', symptoms), [set]);
  const reorderMedications = useCallback((medications: Medication[]) => set('medications', medications), [set]);
  const reorderDiagnoses = useCallback((diagnoses: Diagnosis[]) => set('diagnoses', diagnoses), [set]);
  const reorderExaminationFindings = useCallback((findings: ExaminationFinding[]) => set('examinationFindings', findings), [set]);
  const reorderLabInvestigations = useCallback((labs: LabInvestigation[]) => set('labInvestigations', labs), [set]);
  const reorderLabResults = useCallback((results: LabResult[]) => set('labResults', results), [set]);
  const reorderProcedures = useCallback((procedures: ProcedureEntry[]) => set('procedures', procedures), [set]);
  const reorderCustomSections = useCallback((sections: CustomSection[]) => set('customSections', sections), [set]);

  // ─── Value ────────────────────────────────────────────────────────
  const value = useMemo<PrescriptionContextValue>(() => ({
    ...state,
    setPatient, setLanguage, setActiveSection, setIsEditing, setIsSaving, setPrescriptionId,
    updateVitals, setVitals: setVitalsAction, toggleVitalLock,
    addSymptom, removeSymptom, updateSymptom,
    addDiagnosis, removeDiagnosis, updateDiagnosis,
    addExaminationFinding, removeExaminationFinding,
    addMedication, removeMedication, updateMedication,
    addLabInvestigation, removeLabInvestigation, updateLabInvestigation,
    addLabResult, removeLabResult,
    updateMedicalCondition, setMedicalConditions, setNoRelevantHistory,
    addProcedure, removeProcedure,
    setFollowUp, setReferral,
    setAdvice, setSurgicalNotes, setPrivateNotes,
    addCustomSection, removeCustomSection, updateCustomSection,
    toggleSection, reorderSections,
    resetPrescription, loadPrescription, collectPayload,
    collectPrescriptionData, submitPrescription, updatePrescriptionApi,
    clearAllPrescription, addTemplate, updateTemplate: updateTemplateAction,
    deleteTemplate: deleteTemplateAction,
    applyTemplate, getTemplatesByType, savePrintSettings,
    reorderSymptoms, reorderMedications, reorderDiagnoses,
    reorderExaminationFindings, reorderLabInvestigations, reorderLabResults,
    reorderProcedures, reorderCustomSections, refreshPrintSettings,
  }), [
    state, setPatient, setLanguage, setActiveSection, setIsEditing, setIsSaving, setPrescriptionId,
    updateVitals, setVitalsAction, toggleVitalLock, addSymptom, removeSymptom, updateSymptom,
    addDiagnosis, removeDiagnosis, updateDiagnosis,
    addExaminationFinding, removeExaminationFinding,
    addMedication, removeMedication, updateMedication,
    addLabInvestigation, removeLabInvestigation, updateLabInvestigation,
    addLabResult, removeLabResult, updateMedicalCondition, setNoRelevantHistory,
    addProcedure, removeProcedure, setFollowUp, setReferral,
    setAdvice, setSurgicalNotes, setPrivateNotes,
    addCustomSection, removeCustomSection, updateCustomSection,
    toggleSection, reorderSections, resetPrescription, loadPrescription, collectPayload,
    collectPrescriptionData, submitPrescription, updatePrescriptionApi,
    clearAllPrescription, addTemplate, updateTemplateAction,
    deleteTemplateAction, applyTemplate, getTemplatesByType, savePrintSettings,
    reorderSymptoms, reorderMedications, reorderDiagnoses,
    reorderExaminationFindings, reorderLabInvestigations, reorderLabResults,
    reorderProcedures, reorderCustomSections, refreshPrintSettings,
  ]);

  return <PrescriptionContext.Provider value={value}>{children}</PrescriptionContext.Provider>;
}

export function usePrescription(): PrescriptionContextValue {
  const ctx = useContext(PrescriptionContext);
  if (!ctx) throw new Error('usePrescription must be used within PrescriptionProvider');
  return ctx;
}

// ─── Helpers ─────────────────────────────────────────────────────────
function mapLockedVitalsToVitals(lv: PrescriptionVitals): Vitals {
  const m = (v: { value: string; unit_id: number | null; locked: boolean } | undefined): VitalField => ({
    value: v?.value || '', unit_id: v?.unit_id ?? undefined, locked: v?.locked || false,
  });
  return {
    pulse: m(lv.pulse),
    bp: { systolic: lv.bloodPressure?.value || '', diastolic: '', locked: lv.bloodPressure?.locked || false },
    rr: lv.respiratoryRate?.value || '',
    temp: m(lv.temperature),
    height: m(lv.height),
    weight: m(lv.muscleMass),
    muscleMass: m(lv.muscleMass),
    headCircumference: m(lv.headCircumference),
    chestCircumference: m(lv.chestCircumference),
    midArmCircumference: m(lv.midArmCircumference),
    waistCircumference: m(lv.waistCircumference),
  };
}

function mergeConditions(defaults: MedicalCondition[], loaded: MedicalCondition[]): MedicalCondition[] {
  const result = defaults.map(d => {
    const match = loaded.find(l => l.name.toLowerCase() === d.name.toLowerCase());
    return match ? { ...d, value: match.value, since: match.since } : { ...d };
  });
  loaded.forEach(l => {
    if (!result.find(r => r.name.toLowerCase() === l.name.toLowerCase())) {
      result.push(l);
    }
  });
  return result;
}
