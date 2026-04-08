/**
 * PrescriptionPdf — generates a pdfmake PDF from prescription data and renders
 * it in an <iframe>. Used inside PreviewModal (PDF view) and AddPrescriptionPage.
 */
import { useEffect, useState, useRef, useCallback } from 'react';
import { Box, CircularProgress, Typography, Button } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import pdfMake from '@/lib/pdfmake-wrapper';
import type {
  Vitals, Symptom, Diagnosis, Medication, LabInvestigation,
  LabResult, ExaminationFinding, ProcedureEntry, FollowUp,
  Referral, CustomSection, DropdownOptions, PatientInfo,
  PrescriptionLanguage, DropdownOption,
} from '@/types';
import type { MedicalCondition } from '../context/PrescriptionContext';


// ─── Props ────────────────────────────────────────────────────────────
export interface PrescriptionPdfData {
  vitals: Vitals;
  symptoms: Symptom[];
  diagnoses: Diagnosis[];
  examinationFindings: ExaminationFinding[];
  medications: Medication[];
  labInvestigations: LabInvestigation[];
  labResults: LabResult[];
  procedures: ProcedureEntry[];
  followUp: FollowUp | null;
  referral: Referral | null;
  advice: string;
  notes: { surgicalNotes: string; privateNotes: string };
  customSections: CustomSection[];
  medicalConditions: MedicalCondition[];
  noRelevantHistory: boolean;
}

export interface PrescriptionPdfProps {
  data: PrescriptionPdfData | null;
  patientInfo?: PatientInfo | null;
  dropdownOptions?: DropdownOptions | null;
  printSettings?: Record<string, boolean> | null;
  language?: PrescriptionLanguage;
  onPdfReady?: (dataUrl: string) => void;
}

// ─── Image loader ─────────────────────────────────────────────────────

async function loadImageAsBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

// ─── Helpers ──────────────────────────────────────────────────────────

function resolveDD(id: number | undefined | null, opts: DropdownOption[] | undefined, lang: PrescriptionLanguage = 'en', fallback?: string): string {
  if (id && opts) {
    const opt = opts.find(o => o.dropdown_option_id === id);
    if (opt) {
      if (lang !== 'en') {
        const translated = opt.translations?.[lang as 'hi' | 'mr'];
        if (translated) return translated;
      }
      return opt.option_value;
    }
  }
  // Fallback: translate by matching the English text
  if (fallback) return resolveTextDD(fallback, opts, lang);
  return '';
}

function resolveTextDD(value: string | undefined | null, opts: DropdownOption[] | undefined, lang: PrescriptionLanguage = 'en'): string {
  if (!value) return '';
  if (lang === 'en' || !opts) return value;
  const opt = opts.find(o => o.option_value === value);
  if (!opt) return value;
  return opt.translations?.[lang as 'hi' | 'mr'] || value;
}

const DIAGNOSIS_TYPE_TRANSLATIONS: Record<string, Record<string, string>> = {
  Primary:      { hi: 'प्राथमिक',  mr: 'प्राथमिक' },
  Secondary:    { hi: 'द्वितीयक',  mr: 'दुय्यम' },
  Differential: { hi: 'विभेदक',    mr: 'विभेदक' },
};

function translateDiagType(type: string, lang: PrescriptionLanguage): string {
  if (lang === 'en') return type;
  return DIAGNOSIS_TYPE_TRANSLATIONS[type]?.[lang] || type;
}

function formatDate(d?: Date): string {
  const date = d || new Date();
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });
}

function formatTime(d?: Date): string {
  const date = d || new Date();
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function stripHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '').trim();
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PdfContent = any;

// ─── Stable JSON key for data ─────────────────────────────────────────
function dataKey(data: PrescriptionPdfData | null): string {
  if (!data) return 'null';
  try {
    return JSON.stringify(data);
  } catch {
    return String(Date.now());
  }
}

// ─── Component ────────────────────────────────────────────────────────

export default function PrescriptionPdf({ data, patientInfo, dropdownOptions, printSettings, language = 'en', onPdfReady }: PrescriptionPdfProps) {
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  // Use refs for callbacks and data to avoid dependency churn
  const onPdfReadyRef = useRef(onPdfReady);
  onPdfReadyRef.current = onPdfReady;

  const dataRef = useRef(data);
  dataRef.current = data;

  const patientInfoRef = useRef(patientInfo);
  patientInfoRef.current = patientInfo;

  const ddRef = useRef(dropdownOptions);
  ddRef.current = dropdownOptions;

  const printSettingsRef = useRef(printSettings);
  printSettingsRef.current = printSettings;

  const languageRef = useRef(language);
  languageRef.current = language;

  // Stable key — only re-generate when data, printSettings, or language actually changes (by value)
  const stableKey = dataKey(data) + JSON.stringify(printSettings || {}) + language;

  const generatePdf = useCallback(async () => {
    const currentData = dataRef.current;
    if (!currentData) {
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    setPdfUrl(null);

    try {
      // Load header and footer images
      const [headerImg, footerImg] = await Promise.all([
        loadImageAsBase64('/header.png').catch(() => null),
        loadImageAsBase64('/footer.png').catch(() => null),
      ]);

      const currentLang = languageRef.current;
      const content = buildContent(currentData, patientInfoRef.current || null, ddRef.current || null, printSettingsRef.current || null, currentLang);

      // Use Devanagari font for Hindi/Marathi — Roboto lacks Devanagari glyphs
      const pdfFont = currentLang === 'hi' || currentLang === 'mr'
        ? 'NotoSansDevanagari'
        : currentLang === 'gu'
        ? 'MuktaVaani'
        : 'Roboto';

      // A4 = 595pt wide. Image width = 595 - 2*30 = 535pt
      const pageWidth = 595;
      const imgWidth = 535;
      const hMargin = (pageWidth - imgWidth) / 2; // center horizontally

      const docDefinition = {
        pageSize: 'A4' as const,
        pageMargins: [30, headerImg ? 150 : 40, 30, footerImg ? 90 : 40] as [number, number, number, number],
        header: headerImg
          ? { image: headerImg, width: imgWidth, margin: [hMargin, 8, hMargin, 0] }
          : undefined,
        footer: footerImg
          ? { image: footerImg, width: imgWidth, margin: [hMargin, 5, hMargin, 0] }
          : undefined,
        content,
        styles: pdfStyles,
        defaultStyle: { font: pdfFont, bold: false },
      };

      const pdf = pdfMake.createPdf(docDefinition);
      const blob: Blob = await pdf.getBlob();

      const blobUrl = URL.createObjectURL(blob);
      setPdfUrl(blobUrl);
      onPdfReadyRef.current?.(blobUrl);
      setLoading(false);
    } catch (e) {
      console.error('[PrescriptionPdf] Generation error:', e);
      setError(`PDF generation failed: ${e instanceof Error ? e.message : String(e)}`);
      setLoading(false);
    }
  }, [stableKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Clean up blob URLs
  useEffect(() => {
    return () => {
      if (pdfUrl) URL.revokeObjectURL(pdfUrl);
    };
  }, [pdfUrl]);

  // Generate on mount and when data changes (by value)
  useEffect(() => {
    generatePdf();
  }, [generatePdf]);

  // Retry handler
  const handleRetry = useCallback(() => {
    setRetryCount(c => c + 1);
    generatePdf();
  }, [generatePdf]);

  // Suppress unused var warning
  void retryCount;

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2 }}>
        <CircularProgress size={40} />
        <Typography color="text.secondary">Generating PDF...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2 }}>
        <Typography color="error" sx={{ maxWidth: 400, textAlign: 'center' }}>{error}</Typography>
        <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleRetry}>
          Retry
        </Button>
      </Box>
    );
  }

  if (!pdfUrl) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 2 }}>
        <Typography color="text.secondary">No prescription data to generate PDF</Typography>
        {data && (
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={handleRetry}>
            Generate PDF
          </Button>
        )}
      </Box>
    );
  }

  return (
    <iframe
      src={pdfUrl}
      style={{ width: '100%', height: '100%', border: 'none', borderRadius: 8 }}
      title="Prescription PDF Preview"
    />
  );
}

// ─── PDF Content Builder ──────────────────────────────────────────────

function buildContent(
  data: PrescriptionPdfData,
  patient: PatientInfo | null,
  ddOpts: DropdownOptions | null,
  printSettings: Record<string, boolean> | null,
  lang: PrescriptionLanguage = 'en',
): PdfContent[] {
  const content: PdfContent[] = [];
  const now = new Date();

  // Helper: check if a print-setting key is enabled (default true if no settings loaded)
  const ps = (key: string) => {
    if (!printSettings || Object.keys(printSettings).length === 0) return true;
    return printSettings[key] !== false;
  };

  // ── Header image is rendered via pdfmake doc header property ──
  // (no text header needed — header.png from public/ is used)

  // ── Patient Info ──
  if (patient) {
    content.push({
      layout: 'noBorders',
      table: {
        widths: ['60%', '40%'],
        body: [
          [
            { text: `Patient: ${patient.name}`, style: 'patientDetailHeader' },
            { text: `Age: ${patient.age} / ${patient.gender}`, style: 'patientDetailHeader', alignment: 'right' as const },
          ],
          [
            { text: `Phone: ${patient.phone || 'N/A'}`, style: 'patientDetail' },
            { text: `Date: ${formatDate(now)} | ${formatTime(now)}`, style: 'patientDetail', alignment: 'right' as const },
          ],
        ],
      },
      margin: [0, 8, 0, 6],
    });
    content.push({
      canvas: [{ type: 'line', x1: 0, y1: 0, x2: 535, y2: 0, lineWidth: 0.5, lineColor: '#d1d5db' }],
      margin: [0, 0, 0, 8],
    });
  }

  // ── Vitals ──
  if (ps('vitals')) {
    const v = data.vitals;
    const vitalParts: PdfContent[] = [];
    if (v.height?.value) vitalParts.push({ text: `Ht: ${v.height.value} cm`, style: 'contentText' });
    if (v.weight?.value) vitalParts.push({ text: `Wt: ${v.weight.value} kg`, style: 'contentText' });
    if (v.bmi) vitalParts.push({ text: `BMI: ${v.bmi}`, style: 'contentText' });
    if (v.bp?.systolic) vitalParts.push({ text: `BP: ${v.bp.systolic}/${v.bp.diastolic} mmHg`, style: 'contentText' });
    if (v.pulse?.value) vitalParts.push({ text: `Pulse: ${v.pulse.value} bpm`, style: 'contentText' });
    if (v.heartRate) vitalParts.push({ text: `HR: ${v.heartRate} bpm`, style: 'contentText' });
    if (v.temp?.value) vitalParts.push({ text: `Temp: ${v.temp.value}°F`, style: 'contentText' });
    if (v.spo2) vitalParts.push({ text: `SpO2: ${v.spo2}%`, style: 'contentText' });
    if (v.rr) vitalParts.push({ text: `RR: ${v.rr}/min`, style: 'contentText' });

    if (vitalParts.length > 0) {
      const vitalLine: PdfContent[] = [{ text: 'Vitals: ', style: 'sectionHeaderData' }];
      vitalParts.forEach((vp, i) => {
        if (i > 0) vitalLine.push({ text: '  |  ', style: 'contentTextSeparator' });
        vitalLine.push(vp);
      });
      content.push({ text: vitalLine, margin: [0, 0, 0, 6] });
    }
  }

  // ── Medical History ──
  if (ps('patientMedicalHistory')) {
    const activeConditions = data.medicalConditions.filter(c => c.value === 'Y');
    if (activeConditions.length > 0 && !data.noRelevantHistory) {
      const histLine: PdfContent[] = [{ text: 'Medical History: ', style: 'sectionHeaderData' }];
      activeConditions.forEach((c, i) => {
        if (i > 0) histLine.push({ text: '  |  ', style: 'contentTextSeparator' });
        histLine.push({ text: c.name, style: 'contentTextBold' });
        if (c.since) histLine.push({ text: ` (since ${c.since})`, style: 'contentTextItalic' });
      });
      content.push({ text: histLine, margin: [0, 0, 0, 4] });
    }
  }

  // ── Symptoms ──
  if (ps('symptoms') && data.symptoms.length > 0) {
    const symLine: PdfContent[] = [{ text: 'Chief Complaints: ', style: 'sectionHeaderData' }];
    data.symptoms.forEach((s, i) => {
      if (i > 0) symLine.push({ text: '  |  ', style: 'contentTextSeparator' });
      symLine.push({ text: s.name, style: 'contentTextBold' });
      const sev = resolveDD(s.severity_id, ddOpts?.symptoms?.severity, lang, s.severity) || '';
      if (sev) symLine.push({ text: ` [${sev}]`, style: 'contentTextItalic' });
      if (s.duration) symLine.push({ text: ` (${s.duration})`, style: 'contentText' });
      const lat = resolveDD(s.laterality_id, ddOpts?.symptoms?.laterality, lang, s.laterality) || '';
      if (lat) symLine.push({ text: ` (${lat})`, style: 'contentTextItalic' });
    });
    content.push({ text: symLine, margin: [0, 0, 0, 4] });
  }

  // ── Diagnosis ──
  if (ps('diagnosis') && data.diagnoses.length > 0) {
    const diagLine: PdfContent[] = [{ text: 'Diagnosis: ', style: 'sectionHeaderData' }];
    data.diagnoses.forEach((d, i) => {
      if (i > 0) diagLine.push({ text: '  |  ', style: 'contentTextSeparator' });
      diagLine.push({ text: d.description, style: 'contentTextBold' });
      diagLine.push({ text: ` — ${resolveTextDD(d.status, ddOpts?.diagnosis?.status, lang)}`, style: 'contentText' });
      if (d.type) diagLine.push({ text: ` [${translateDiagType(d.type, lang)}]`, style: 'contentTextItalic' });
    });
    content.push({ text: diagLine, margin: [0, 0, 0, 4] });
  }

  // ── Examination Findings ──
  if (ps('examinationFindings') && data.examinationFindings.length > 0) {
    const examLine: PdfContent[] = [{ text: 'Examination Findings: ', style: 'sectionHeaderData' }];
    data.examinationFindings.forEach((f, i) => {
      if (i > 0) examLine.push({ text: '  |  ', style: 'contentTextSeparator' });
      examLine.push({ text: f.name, style: 'contentTextBold' });
      if (f.notes) examLine.push({ text: `: ${f.notes}`, style: 'contentText' });
    });
    content.push({ text: examLine, margin: [0, 0, 0, 6] });
  }

  // ── PRESCRIPTION header ──
  content.push({
    canvas: [{ type: 'line', x1: 0, y1: 0, x2: 535, y2: 0, lineWidth: 0.5, lineColor: '#d1d5db' }],
    margin: [0, 4, 0, 4],
  });
  content.push({
    text: 'PRESCRIPTION',
    style: 'prescriptionHeader',
    alignment: 'center' as const,
    margin: [0, 2, 0, 6],
  });

  // ── Medications Table ──
  if (ps('medication') && data.medications.length > 0) {
    const medDD = ddOpts?.medication;
    const headerRow = [
      { text: '#', style: 'tableHeader', alignment: 'center' as const },
      { text: 'Medication', style: 'tableHeader', alignment: 'left' as const },
      { text: 'Dosage', style: 'tableHeader', alignment: 'center' as const },
      { text: 'Frequency', style: 'tableHeader', alignment: 'center' as const },
      { text: 'Duration', style: 'tableHeader', alignment: 'center' as const },
      { text: 'Instructions', style: 'tableHeader', alignment: 'left' as const },
    ];

    const medRows = data.medications.map((m, i) => {
      const dosage = resolveDD(m.dosage_id, medDD?.dosage, lang, m.dosage) || '-';
      const freq = resolveDD(m.frequency_id, medDD?.frequency, lang, m.frequency) || '-';
      const dur = resolveDD(m.duration_id, medDD?.duration, lang, m.duration) || '-';
      const timing = resolveDD(m.timing_id, medDD?.timing, lang, m.timing) || '';
      const instructions = timing || m.instructions || '-';

      const nameCell: PdfContent[] = [{ text: m.brandName, style: 'medicationName' }];
      if (m.genericName) nameCell.push({ text: `\n${m.genericName}`, style: 'contentTextItalic' });
      if (m.remark) nameCell.push({ text: `\n${m.remark}`, style: 'medicationRemark' });

      return [
        { text: `${i + 1}`, style: 'contentTextTable', alignment: 'center' as const },
        { text: nameCell },
        { text: dosage, style: 'contentTextTable', alignment: 'center' as const },
        { text: freq, style: 'contentTextTable', alignment: 'center' as const },
        { text: dur, style: 'contentTextTable', alignment: 'center' as const },
        { text: instructions, style: 'contentTextTable', alignment: 'left' as const },
      ];
    });

    content.push({
      table: {
        headerRows: 1,
        widths: ['5%', '30%', '12%', '15%', '12%', '26%'],
        body: [headerRow, ...medRows],
      },
      layout: 'prescriptionTableLayout',
      margin: [0, 0, 0, 10],
    });
  }

  // ── Two-Column: Left (Procedures, Follow-Up, Advice, Referral) / Right (Lab, Results) ──
  const leftCol: PdfContent[] = [];
  const rightCol: PdfContent[] = [];

  // Procedures → left
  if (ps('procedures') && data.procedures.length > 0) {
    leftCol.push({ text: 'Procedures', style: 'sectionHeaderData', margin: [0, 0, 0, 2] });
    data.procedures.forEach(p => {
      leftCol.push({
        text: [
          { text: `• ${p.name}`, style: 'contentTextBold' },
          p.date ? { text: ` (${p.date})`, style: 'contentText' } : {},
          p.notes ? { text: ` — ${p.notes}`, style: 'contentTextItalic' } : {},
        ],
        margin: [0, 0, 0, 2],
      });
    });
    leftCol.push({ text: '', margin: [0, 0, 0, 4] });
  }

  // Follow-Up → left
  if (ps('followup') && data.followUp) {
    leftCol.push({ text: 'Follow-Up', style: 'sectionHeaderData', margin: [0, 0, 0, 2] });
    leftCol.push({
      text: [
        { text: `Date: ${data.followUp.followUpDate || data.followUp.date || 'TBD'}`, style: 'contentText' },
        data.followUp.notes ? { text: `  |  ${data.followUp.notes}`, style: 'contentTextItalic' } : {},
      ],
      margin: [0, 0, 0, 4],
    });
  }

  // Advice → left
  if (ps('advices') && data.advice) {
    leftCol.push({ text: 'Advice', style: 'sectionHeaderData', margin: [0, 0, 0, 2] });
    leftCol.push({ text: stripHtml(data.advice), style: 'contentText', margin: [0, 0, 0, 4] });
  }

  // Referral → left
  if (ps('referToDoctor') && data.referral?.doctorName) {
    leftCol.push({ text: 'Referral', style: 'sectionHeaderData', margin: [0, 0, 0, 2] });
    leftCol.push({
      text: [
        { text: `Dr. ${data.referral.doctorName}`, style: 'contentTextBold' },
        { text: ` (${data.referral.specialty})`, style: 'contentText' },
        data.referral.reason ? { text: ` — ${data.referral.reason}`, style: 'contentTextItalic' } : {},
      ],
      margin: [0, 0, 0, 4],
    });
  }

  // Lab Investigations → right
  if (ps('labTests') && data.labInvestigations.length > 0) {
    rightCol.push({ text: 'Lab Investigations', style: 'sectionHeaderData', margin: [0, 0, 0, 2] });
    data.labInvestigations.forEach(l => {
      rightCol.push({
        text: [
          { text: `• ${l.testName}`, style: 'contentTextBold' },
          l.category ? { text: ` [${l.category}]`, style: 'contentTextItalic' } : {},
          l.urgent ? { text: '  URGENT', style: 'medicationRemark' } : {},
          l.remarks ? { text: ` — ${l.remarks}`, style: 'contentText' } : {},
        ],
        margin: [0, 0, 0, 2],
      });
    });
    rightCol.push({ text: '', margin: [0, 0, 0, 4] });
  }

  // Lab Results → right
  if (ps('labResults') && data.labResults.length > 0) {
    rightCol.push({ text: 'Lab Results', style: 'sectionHeaderData', margin: [0, 0, 0, 2] });
    const resultRows = [
      [
        { text: 'Test', style: 'tableHeader' },
        { text: 'Reading', style: 'tableHeader' },
        { text: 'Unit', style: 'tableHeader' },
        { text: 'Normal', style: 'tableHeader' },
        { text: 'Status', style: 'tableHeader' },
      ],
      ...data.labResults.map(r => [
        { text: r.testName, style: 'contentTextTable' },
        { text: r.reading, style: 'contentTextTable', bold: true },
        { text: r.unit, style: 'contentTextTable' },
        { text: r.normalRange, style: 'contentTextTable' },
        { text: resolveTextDD(r.interpretation, ddOpts?.labresult?.interpretation, lang) || 'Pending', style: 'contentTextTable' },
      ]),
    ];
    rightCol.push({
      table: { headerRows: 1, widths: ['25%', '18%', '15%', '22%', '20%'], body: resultRows },
      layout: 'prescriptionTableLayout',
      margin: [0, 0, 0, 4],
    });
  }

  // Render two-column layout
  if (leftCol.length > 0 || rightCol.length > 0) {
    content.push({
      columns: [
        { width: '48%', stack: leftCol.length > 0 ? leftCol : [{ text: '' }], margin: [0, 0, 10, 0] },
        { width: '48%', stack: rightCol.length > 0 ? rightCol : [{ text: '' }] },
      ],
      margin: [0, 4, 0, 8],
    });
  }

  // ── Notes ──
  if (ps('notes') && data.notes?.surgicalNotes) {
    content.push({ text: 'Surgical Notes', style: 'sectionHeaderData', margin: [0, 4, 0, 2] });
    content.push({ text: stripHtml(data.notes.surgicalNotes), style: 'contentText', margin: [0, 0, 0, 4] });
  }

  // ── Custom Sections ──
  if (ps('customSection') && data.customSections.length > 0) {
    data.customSections.forEach(cs => {
      const items = cs.items.filter(it => it.key || it.value);
      if (items.length === 0) return;
      content.push({ text: cs.title, style: 'sectionHeaderData', margin: [0, 4, 0, 2] });
      items.forEach(it => {
        content.push({ text: `${it.key}: ${it.value}`, style: 'contentText', margin: [0, 0, 0, 1] });
      });
    });
  }

  // ── Signature ──
  content.push({ text: '', margin: [0, 20, 0, 0] });
  content.push({
    columns: [
      { width: '*', text: '' },
      {
        width: 'auto',
        stack: [
          { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 150, y2: 0, lineWidth: 0.5, lineColor: '#9ca3af' }] },
          { text: 'Authorized Signatory', alignment: 'center' as const, style: 'patientDetailHeader', margin: [0, 4, 0, 0] },
        ],
      },
    ],
  });
  // ── Footer image is rendered via pdfmake doc footer property ──

  return content;
}

// ─── Styles ───────────────────────────────────────────────────────────

const pdfStyles = {
  clinicHeader: { fontSize: 16, bold: true, color: '#1e40af' },
  patientDetailHeader: { fontSize: 10.5, bold: true, color: '#1f2937' },
  patientDetail: { fontSize: 9, color: '#374151' },
  sectionHeaderData: { fontSize: 10, bold: true, color: '#1e40af', margin: [0, 0, 0, 1] },
  prescriptionHeader: { fontSize: 14, bold: true, color: '#1e40af' },
  contentText: { fontSize: 9, lineHeight: 1.2, bold: false, color: '#374151' },
  contentTextBold: { fontSize: 9, lineHeight: 1.2, bold: true, color: '#1f2937' },
  contentTextItalic: { fontSize: 9, lineHeight: 1.2, italics: true, color: '#4b5563' },
  contentTextSeparator: { fontSize: 9, lineHeight: 1.2, color: '#9ca3af' },
  contentTextTable: { fontSize: 8.5, lineHeight: 1.1, bold: false, color: '#374151' },
  tableHeader: { fontSize: 9, bold: true, fillColor: '#eef2ff', color: '#1e40af' },
  medicationName: { fontSize: 9.5, bold: true, color: '#1f2937' },
  medicationRemark: { fontSize: 8, color: '#991b1b', italics: true, bold: true },
};

// ─── Utility: trigger PDF download from blob URL ──────────────────────

export function downloadPdfFromUrl(blobUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = blobUrl;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  // Small delay before cleanup so browser can start download
  setTimeout(() => document.body.removeChild(a), 100);
}

// ─── Utility: generate PDF and download directly (no iframe needed) ───

export async function generateAndDownloadPdf(
  data: PrescriptionPdfData,
  patientInfo: PatientInfo | null,
  dropdownOptions: DropdownOptions | null,
  filename: string,
  printSettings?: Record<string, boolean> | null,
  language: PrescriptionLanguage = 'en',
) {
  const [headerImg, footerImg] = await Promise.all([
    loadImageAsBase64('/header.png').catch(() => null),
    loadImageAsBase64('/footer.png').catch(() => null),
  ]);

  const pageWidth = 595;
  const imgWidth = 535;
  const hMargin = (pageWidth - imgWidth) / 2;

  const pdfFont = (language === 'hi' || language === 'mr') ? 'NotoSansDevanagari' : 'Roboto';
  const content = buildContent(data, patientInfo, dropdownOptions, printSettings || null, language);
  const docDefinition = {
    pageSize: 'A4' as const,
    pageMargins: [30, headerImg ? 130 : 40, 30, footerImg ? 90 : 40] as [number, number, number, number],
    header: headerImg
      ? { image: headerImg, width: imgWidth, margin: [hMargin, 8, hMargin, 0] }
      : undefined,
    footer: footerImg
      ? { image: footerImg, width: imgWidth, margin: [hMargin, 5, hMargin, 0] }
      : undefined,
    content,
    styles: pdfStyles,
    defaultStyle: { font: pdfFont, bold: false },
  };
  const pdf = pdfMake.createPdf(docDefinition);
  pdf.download(filename);
}
