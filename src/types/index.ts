// ─── Generic API Types ───────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    total: number;
    page: number;
    limit: number;
  };
  message: string;
}

// ─── Address ─────────────────────────────────────────────────────────

export interface Address {
  street: string;
  city: string;
  state: string;
  country?: string;
  pincode: string;
}

// ─── Organization & Branch ───────────────────────────────────────────

export interface Organization {
  organizationId: string;
  name: string;
  timezone: string;
  address: Address;
  phone: string;
  email: string;
  logo: string;
  createdAt: string;
}

export interface Branch {
  branchId: string;
  organizationId: string;
  name: string;
  address: Address;
  timezone: string;
  isActive: boolean;
}

// ─── User ────────────────────────────────────────────────────────────

export type UserRole = 'doctor' | 'receptionist' | 'admin' | 'system_admin';

export interface User {
  userId: string;
  organizationId: string;
  branchId: string;
  email: string;
  role: UserRole;
  name: string;
  qualifications?: string;
  registrationNumber?: string;
  specialization?: string;
  signature?: string;
  isActive: boolean;
  createdAt: string;
}

// ─── Patient ─────────────────────────────────────────────────────────

export type Salutation = 'Mr' | 'Mrs' | 'Ms' | 'Dr' | 'Master' | 'Baby';
export type Gender = 'M' | 'F' | 'Other';
export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'O+' | 'O-' | 'AB+' | 'AB-';

export interface Patient {
  patientId: string;
  uhid: string;
  organizationId: string;
  branchId: string;
  salutation: Salutation;
  name: string;
  gender: Gender;
  dateOfBirth: string;
  age: number;
  phone: string;
  alternatePhone?: string;
  email?: string;
  address: Address;
  bloodGroup?: BloodGroup;
  tags: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface PatientMedicalHistory {
  historyId: string;
  patientId: string;
  conditions: Array<{
    name: string;
    value: 'Y' | 'N' | '-';
    since?: string;
    notes?: string;
  }>;
  allergies: Array<{
    allergen: string;
    severity: string;
    reaction: string;
  }>;
  surgicalHistory: Array<{
    procedure: string;
    date: string;
    notes?: string;
  }>;
  familyHistory: Array<{
    relation: string;
    condition: string;
  }>;
  noHistory: boolean;
  updatedAt: string;
  updatedBy: string;
}

// ─── Appointment ─────────────────────────────────────────────────────

export type AppointmentStatus = 'Booked' | 'Follow Up' | 'Ongoing' | 'Completed' | 'Cancelled';
export type PaymentStatus = 'Paid' | 'Pending' | 'Partial';

export interface Appointment {
  appointmentId: string;
  organizationId: string;
  branchId: string;
  patientId: string;
  patientName: string;
  phone: string;
  doctorId: string;
  serviceIds: string[];
  services: SelectedService[];
  slot: string;
  slotDate: string;
  slotStartUTC: string;
  slotEndUTC: string;
  status: AppointmentStatus;
  paymentStatus: PaymentStatus;
  notes?: string;
  isFollowUp: boolean;
  parentAppointmentId?: string;
  createdAt: string;
  createdBy: string;
}

// ─── Queue ───────────────────────────────────────────────────────────

export type QueueStatus = 'Waiting' | 'Ongoing' | 'Completed' | 'Cancelled';
export type QueuePaymentStatus = 'Cash' | 'Online' | 'Pending';

export type AppointmentType = 'walk_in' | 'scheduled' | 'emergency' | 'followup';

export interface QueueEntry {
  queueId: string;
  organizationId: string;
  branchId: string;
  appointmentId?: string;
  patientId: string;
  patientName: string;
  uhid: string;
  tokenNumber: number;
  slot: string;
  queueDate: string;
  arrivalTime: string;
  status: QueueStatus;
  paymentStatus: QueuePaymentStatus;
  paymentAmount: number;
  services: SelectedService[];
  serviceAmount: number;
  appointmentType?: AppointmentType;
  checkInTime?: string;
  tags?: string;
  durationMinutes?: number;
  invoiceId?: string;
  notes?: string;
  createdAt: string;
}

// ─── Prescription ────────────────────────────────────────────────────

export type DiagnosisType = 'Primary' | 'Secondary' | 'Differential';
export type DiagnosisStatus = 'Active' | 'Resolved' | 'Chronic';
export type SymptomSeverity = 'mild' | 'moderate' | 'severe';
export type Laterality = 'left' | 'right' | 'bilateral';
export type PrescriptionLanguage = 'en' | 'hi' | 'mr' | 'gu';

export interface VitalField {
  value: string;
  unit?: string;
  unit_id?: number;
  locked?: boolean;
}

export interface Vitals {
  height?: VitalField;
  weight?: VitalField;
  bmi?: string;
  bp?: { systolic: string; diastolic: string; unit?: string; unit_id?: number; locked?: boolean };
  pulse?: VitalField;
  heartRate?: string;
  temp?: VitalField;
  spo2?: string;
  rr?: string;
  muscleMass?: VitalField;
  headCircumference?: VitalField;
  chestCircumference?: VitalField;
  midArmCircumference?: VitalField;
  waistCircumference?: VitalField;
}

export interface Symptom {
  name: string;
  severity_id?: number;
  severity?: SymptomSeverity;
  duration?: string;
  laterality_id?: number;
  laterality?: Laterality;
  additionalInfo?: string;
}

export interface Diagnosis {
  icd_code?: string;
  icdCode?: string;
  description: string;
  type: DiagnosisType;
  status: DiagnosisStatus;
  since?: string;
  notes?: string;
}

export interface Medication {
  brandName: string;
  genericName: string;
  form: string;
  dosage_id?: number;
  dosage?: string;
  frequency_id?: number;
  frequency?: string;
  timing_id?: number;
  timing?: string;
  duration_id?: number;
  duration?: string;
  qty?: number;
  remark?: string;
  instructions?: string;
}

export interface LabInvestigation {
  testName: string;
  category?: string;
  testOn?: string;
  repeatOn?: string;
  remarks?: string;
  urgent?: boolean;
}

export interface LabResult {
  testName: string;
  reading: string;
  unit: string;
  normalRange: string;
  interpretation: string;
  date: string;
  notes?: string;
}

export interface ExaminationFinding {
  name: string;
  notes?: string;
}

export interface ProcedureEntry {
  name: string;
  date?: string;
  notes?: string;
}

export interface FollowUp {
  followUpDate: string;
  date?: string;
  notes?: string;
  notificationEnabled?: boolean;
}

export interface Referral {
  doctorName: string;
  specialty: string;
  reason: string;
  notes?: string;
}

export interface CustomSection {
  id: string;
  title: string;
  items: Array<{ key: string; value: string }>;
}

export interface Prescription {
  prescriptionId: string;
  organizationId: string;
  branchId: string;
  patientId: string;
  appointmentId?: string;
  queueId?: string;
  doctorId: string;
  visitDate: string;
  vitals: Vitals;
  symptoms: Symptom[];
  diagnoses: Diagnosis[];
  examinationFindings: ExaminationFinding[];
  medications: Medication[];
  labInvestigations: LabInvestigation[];
  labResults: LabResult[];
  procedures: ProcedureEntry[];
  followUp?: FollowUp;
  referral?: Referral;
  advice?: string;
  notes?: { surgicalNotes?: string; privateNotes?: string };
  customSections: CustomSection[];
  medicalConditions?: Array<{ name: string; value: 'Y' | 'N' | '-'; since?: string; notes?: string }>;
  noRelevantHistory?: boolean;
  sectionConfig?: {
    enabledSections: string[];
    printEnabledSections: string[];
    sectionOrder: string[];
  };
  language: PrescriptionLanguage;
  pdfUrl?: string;
  isEdited: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

// ─── Invoice ─────────────────────────────────────────────────────────

export type InvoiceStatus = 'Unpaid' | 'Partial' | 'Paid';

export interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface Invoice {
  invoiceId: string;
  organizationId: string;
  patientId: string;
  appointmentId?: string;
  lineItems: LineItem[];
  subtotal: number;
  discount: number;
  tax: number;
  totalAmount: number;
  paidAmount: number;
  balanceDue: number;
  status: InvoiceStatus;
  createdAt: string;
}

// ─── Payment ─────────────────────────────────────────────────────────

export type PaymentMethod = 'Cash' | 'Card' | 'Online' | 'UPI';

export interface Payment {
  paymentId: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  transactionRef?: string;
  collectedBy: string;
  collectedAt: string;
  receiptId: string;
}

// ─── Payment Entry (inline collection) ───────────────────────────────

export interface PaymentEntry {
  method: PaymentMethod;
  amount: number;
}

export interface PaymentSummary {
  entries: PaymentEntry[];
  totalPaid: number;
  balance: number;
}

// ─── Receipt ─────────────────────────────────────────────────────────

export interface Receipt {
  receiptId: string;
  paymentId: string;
  invoiceId: string;
  receiptNumber: string;
  pdfUrl: string;
  generatedAt: string;
}

// ─── Master Data ─────────────────────────────────────────────────────

export interface MasterSymptom {
  symptomId: string;
  name: string;
  category: string;
  icdMapping?: string;
}

export interface MasterDiagnosis {
  diagnosisId: string;
  icdCode: string;
  description: string;
  category: string;
}

export interface MasterMedication {
  medicationId: string;
  brandName: string;
  genericName: string;
  form: string;
  strength: string;
  manufacturer: string;
}

export interface MasterLabTest {
  testId: string;
  name: string;
  category: string;
  normalRange: string;
  unit: string;
}

export interface MasterService {
  serviceId: string;
  organizationId: string;
  name: string;
  category: string;
  defaultPrice: number;
  description?: string;
}

// ─── Service Selection Types ────────────────────────────────────────

export interface SelectedService {
  serviceId: string;
  name: string;
  price: number;
}

export interface ServiceDetail {
  service: MasterService;
  price: number;
}

export interface MasterExaminationFinding {
  findingId: string;
  name: string;
  category: string;
}

export interface MasterProcedure {
  procedureId: string;
  name: string;
  category: string;
}

export interface PrescriptionTemplate {
  templateId: string;
  orgId: string;
  doctorId: string;
  type: TemplateType;
  name: string;
  data: Record<string, unknown>;
  items?: Record<string, unknown>[];
}

export type TemplateType = 'symptom' | 'medication' | 'labtest' | 'labresult' | 'diagnosis' | 'examination' | 'procedure';

// ─── Dropdown Options ───────────────────────────────────────────────

export interface DropdownOption {
  dropdown_option_id: number;
  option_value: string;
  option_key: string;
  applies_to?: string;
  translations?: {
    hi?: string;
    mr?: string;
  };
}

export interface DropdownOptions {
  medication: {
    dosage: DropdownOption[];
    frequency: DropdownOption[];
    timing: DropdownOption[];
    duration: DropdownOption[];
    start_from: DropdownOption[];
    condition: DropdownOption[];
  };
  symptoms: {
    severity: DropdownOption[];
    laterality: DropdownOption[];
  };
  diagnosis: {
    status: DropdownOption[];
  };
  labresult?: {
    interpretation: DropdownOption[];
    unit: DropdownOption[];
  };
}

// ─── Prescription Configuration ─────────────────────────────────────

export interface CustomSectionType {
  id: string;
  title: string;
  rows: Array<{ left: string; right: string }>;
  printOnPrescription: boolean;
}

export interface PrescriptionConfiguration {
  organization_id: string;
  branch_id: string;
  doctor_id?: string;
  section_order: string[];
  enabled_sections: Record<string, boolean>;
  print_enabled_sections: Record<string, boolean>;
  custom_sections: CustomSectionType[];
}

// ─── Prescription Search ────────────────────────────────────────────

export interface PrescriptionSearchParams {
  search: string;
  category: string;
  limit?: number;
  offset?: number;
}

export interface PrescriptionSearchResult {
  id: string;
  name: string;
  category: string;
  [key: string]: unknown;
}

export interface FrequentlyUsedParams {
  category: string;
  doctor_id: string;
  organization_id: string;
  branch_id: string;
}

// ─── Prescription Spec Types (v2) ───────────────────────────────────
// These match the prescription-info spec exactly. Used by the new
// PrescriptionContext, section components, and preview/PDF system.

export interface PrescriptionVital {
  value: string;
  unit_id: number | null;
  locked: boolean;
}

export interface PrescriptionVitals {
  pulse: PrescriptionVital;
  bloodPressure: PrescriptionVital;
  respiratoryRate: PrescriptionVital;
  temperature: PrescriptionVital;
  height: PrescriptionVital;
  muscleMass: PrescriptionVital;
  headCircumference: PrescriptionVital;
  chestCircumference: PrescriptionVital;
  midArmCircumference: PrescriptionVital;
  waistCircumference: PrescriptionVital;
}

export interface PrescriptionSymptom {
  id?: string;
  name: string;
  duration: string;
  severity_id: number | null;
  laterality_id: number | null;
  additionalInfo: string;
  order_position?: number;
}

export interface PrescriptionMedicine {
  id?: number;
  brandName: string;
  genericName: string;
  type: string;
  forms: string[];
  commonDosage: string[];
  commonFrequency: string[];
  commonTiming: string[];
  commonDuration: string[];
  dosage_id?: number | null;
  frequency_id?: number | null;
  timing_id?: number | null;
  duration_id?: number | null;
  start_from_id?: number | null;
  instructions_id?: number | null;
  condition_id?: number | null;
  remark?: string;
  additional_instructions_id?: number;
}

export interface PrescriptionDiagnosis {
  id?: number;
  name: string;
  codes: string[];
  status_id: number | null;
  since?: string;
  note?: string;
}

export interface PrescriptionLabTest {
  id?: string;
  name: string;
  category: string;
  lab_result_id?: number | null;
  test_on?: string | null;
  repeat_on?: string | null;
  remarks?: string;
  status?: string;
}

export interface PrescriptionLabResult {
  id?: string;
  name: string;
  type: 'test' | 'panel';
  units: string[];
  interpretations: string[];
  unit?: string;
  unit_id?: number | null;
  reading?: string;
  interpretation?: string;
  interpretation_id?: number | null;
  date?: string;
  notes?: string;
}

export interface PatientInfo {
  name: string;
  age: string;
  gender: string;
  phone: string;
  address: string;
}

// ─── Section Template Types ─────────────────────────────────────────

export interface SymptomTemplate {
  id: string;
  name: string;
  symptoms: PrescriptionSymptom[];
}

export interface MedicationTemplate {
  id: string;
  name: string;
  medications: PrescriptionMedicine[];
}

export interface LabTestTemplate {
  id: string;
  name: string;
  tests: PrescriptionLabTest[];
}

export interface LabResultTemplate {
  id: string;
  name: string;
  tests: PrescriptionLabResult[];
}

export interface DiagnosisTemplate {
  id: string;
  name: string;
  diagnoses: PrescriptionDiagnosis[];
}

export interface ExaminationTemplate {
  id: string;
  name: string;
  findings: ExaminationFinding[];
}

export interface ProcedureTemplate {
  id: string;
  name: string;
  procedures: ProcedureEntry[];
}

// ─── Vital Units ────────────────────────────────────────────────────

export interface VitalUnitOption {
  unit_id: number;
  unit_name: string;
  is_default: boolean;
}

export type VitalUnitsMap = Record<string, VitalUnitOption[]>;

// ─── Auth ────────────────────────────────────────────────────────────

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  expiresIn: number;
  user: User;
}

export interface RefreshResponse {
  token: string;
  expiresIn: number;
}

// ─── Time Slot ──────────────────────────────────────────────────────

export interface TimeSlot {
  time: string;
  startTime?: string;
  endTime?: string;
  available: boolean;
  appointmentId?: string | null;
}

export interface SlotsResponse {
  slots: TimeSlot[];
  date: string;
  totalSlots: number;
  availableCount: number;
}

// ─── Analytics ───────────────────────────────────────────────────────

export interface AnalyticsSummary {
  appointments: {
    total: number;
    scheduled: number;
    completed: number;
    cancelled: number;
    noShow: number;
  };
  patients: {
    total: number;
    newThisPeriod: number;
    returningThisPeriod: number;
  };
  revenue: {
    total: number;
    collected: number;
    pending: number;
    byMethod: {
      cash: number;
      card: number;
      online: number;
      upi: number;
    };
  };
  services: Array<{ name: string; count: number; revenue: number }>;
  dailyTrend: Array<{ date: string; appointments: number; revenue: number; newPatients: number }>;
}

// ─── Bulk Import ────────────────────────────────────────────────────
export type BulkImportSection = 'medication' | 'diagnosis' | 'symptom' | 'examination_finding' | 'lab_test' | 'lab_result';

export interface BulkImportRow {
  [key: string]: string;
}

export interface BulkImportValidationResult {
  row: BulkImportRow;
  rowIndex: number;
  isValid: boolean;
  errors: string[];
}
