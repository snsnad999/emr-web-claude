import type { BulkImportSection, BulkImportRow, BulkImportValidationResult } from '@/types';

// ─── Column Definitions per Section ──────────────────────────────────

export interface ColumnDef {
  /** Key used in BulkImportRow (the normalized field name) */
  key: string;
  /** Human-readable label shown in UI */
  label: string;
  /** Expected Excel header(s), lowercase. First is the canonical name. */
  excelHeaders: string[];
  /** Whether the field is required for validation */
  required: boolean;
  /** Mapped API field name (sent to backend) */
  apiField: string;
}

export interface SectionConfig {
  key: BulkImportSection;
  label: string;
  columns: ColumnDef[];
}

export const SECTION_CONFIGS: Record<BulkImportSection, SectionConfig> = {
  medication: {
    key: 'medication',
    label: 'Medication',
    columns: [
      { key: 'drugname', label: 'Drug Name', excelHeaders: ['drugname', 'drug name', 'brand name', 'brandname', 'name'], required: true, apiField: 'brandName' },
      { key: 'genericname', label: 'Generic Name', excelHeaders: ['genericname', 'generic name', 'generic'], required: false, apiField: 'genericName' },
      { key: 'form', label: 'Form', excelHeaders: ['form', 'dosage form'], required: false, apiField: 'form' },
      { key: 'strength', label: 'Strength', excelHeaders: ['strength'], required: false, apiField: 'strength' },
    ],
  },
  diagnosis: {
    key: 'diagnosis',
    label: 'Diagnosis',
    columns: [
      { key: 'icdcode', label: 'ICD Code', excelHeaders: ['icdcode', 'icd code', 'icd', 'code'], required: true, apiField: 'icdCode' },
      { key: 'description', label: 'Description', excelHeaders: ['description', 'desc', 'name'], required: true, apiField: 'description' },
      { key: 'category', label: 'Category', excelHeaders: ['category', 'cat'], required: false, apiField: 'category' },
    ],
  },
  symptom: {
    key: 'symptom',
    label: 'Symptoms',
    columns: [
      { key: 'name', label: 'Name', excelHeaders: ['name', 'symptom', 'symptom name'], required: true, apiField: 'name' },
      { key: 'category', label: 'Category', excelHeaders: ['category', 'cat'], required: false, apiField: 'category' },
    ],
  },
  examination_finding: {
    key: 'examination_finding',
    label: 'Examination Findings',
    columns: [
      { key: 'name', label: 'Name', excelHeaders: ['name', 'finding', 'finding name'], required: true, apiField: 'name' },
      { key: 'category', label: 'Category', excelHeaders: ['category', 'cat'], required: false, apiField: 'category' },
    ],
  },
  lab_test: {
    key: 'lab_test',
    label: 'Lab Investigation',
    columns: [
      { key: 'name', label: 'Name', excelHeaders: ['name', 'test', 'test name'], required: true, apiField: 'name' },
      { key: 'category', label: 'Category', excelHeaders: ['category', 'cat'], required: false, apiField: 'category' },
      { key: 'normalrange', label: 'Normal Range', excelHeaders: ['normalrange', 'normal range', 'range'], required: false, apiField: 'normalRange' },
      { key: 'unit', label: 'Unit', excelHeaders: ['unit', 'units'], required: false, apiField: 'unit' },
    ],
  },
  lab_result: {
    key: 'lab_result',
    label: 'Lab Result',
    columns: [
      { key: 'name', label: 'Name', excelHeaders: ['name', 'result', 'result name', 'test name'], required: true, apiField: 'name' },
      { key: 'category', label: 'Category', excelHeaders: ['category', 'cat'], required: false, apiField: 'category' },
      { key: 'normalrange', label: 'Normal Range', excelHeaders: ['normalrange', 'normal range', 'range'], required: false, apiField: 'normalRange' },
      { key: 'unit', label: 'Unit', excelHeaders: ['unit', 'units'], required: false, apiField: 'unit' },
    ],
  },
};

// ─── Validation ──────────────────────────────────────────────────────

export function validateRow(
  row: BulkImportRow,
  sectionKey: BulkImportSection,
  rowIndex: number,
): BulkImportValidationResult {
  const config = SECTION_CONFIGS[sectionKey];
  const errors: string[] = [];

  for (const col of config.columns) {
    if (col.required) {
      const value = (row[col.key] ?? '').trim();
      if (!value) {
        errors.push(`${col.label} is required`);
      }
    }
  }

  return {
    row,
    rowIndex,
    isValid: errors.length === 0,
    errors,
  };
}

export function validateAllRows(
  rows: BulkImportRow[],
  sectionKey: BulkImportSection,
): BulkImportValidationResult[] {
  return rows.map((row, i) => validateRow(row, sectionKey, i));
}

// ─── Row → API payload mapping ───────────────────────────────────────

export function rowToApiPayload(row: BulkImportRow, sectionKey: BulkImportSection): Record<string, unknown> {
  const config = SECTION_CONFIGS[sectionKey];
  const payload: Record<string, unknown> = {};

  for (const col of config.columns) {
    const value = (row[col.key] ?? '').trim();
    if (value) {
      payload[col.apiField] = value;
    }
  }

  return payload;
}

// ─── Check if a row is completely empty ──────────────────────────────

export function isEmptyRow(row: BulkImportRow, sectionKey: BulkImportSection): boolean {
  const config = SECTION_CONFIGS[sectionKey];
  return config.columns.every(col => !(row[col.key] ?? '').trim());
}
