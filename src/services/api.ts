import axios from 'axios';
import type {
  ApiResponse,
  LoginRequest,
  LoginResponse,
  RefreshResponse,
  Patient,
  QueueEntry,
  Appointment,
  SlotsResponse,
  Prescription,
  Invoice,
  Payment,
  AnalyticsSummary,
  MasterSymptom,
  MasterDiagnosis,
  MasterMedication,
  MasterLabTest,
  MasterService,
  MasterExaminationFinding,
  MasterProcedure,
  PrescriptionTemplate,
  DropdownOptions,
  PrescriptionSearchParams,
  PrescriptionSearchResult,
  FrequentlyUsedParams,
  PrescriptionConfiguration,
  VitalUnitsMap,
  PrescriptionVitals,
  SelectedService,
} from '@/types';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
});

// ─── Request Interceptor: attach JWT ─────────────────────────────────

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('emr_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Response Interceptor: handle errors (AUTH DISABLED) ─────────────
// No token refresh or login redirect — auth is disabled for development

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Log API errors for debugging
    const status = error.response?.status;
    const url = error.config?.url;
    const message = error.response?.data?.message || error.message;
    console.error(`[API Error] ${status || 'NETWORK'} ${url}: ${message}`);
    return Promise.reject(error);
  }
);

// ─── Auth API ────────────────────────────────────────────────────────

export const authApi = {
  login: (credentials: LoginRequest) =>
    api.post<ApiResponse<LoginResponse>>('/auth/login', credentials).then((r) => r.data),

  refresh: (refreshToken: string) =>
    api.post<ApiResponse<RefreshResponse>>('/auth/refresh', { refreshToken }).then((r) => r.data),

  logout: () =>
    api.post<ApiResponse<null>>('/auth/logout').then((r) => r.data),
};

// ─── Patient API ─────────────────────────────────────────────────────

export const patientApi = {
  getPatients: (params: {
    organizationId: string;
    branchId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) =>
    api.get<ApiResponse<{ patients: Patient[]; total: number; page: number; limit: number }>>(
      '/patients',
      { params }
    ).then((r) => r.data),

  getPatientById: (patientId: string) =>
    api.get<ApiResponse<Patient>>(`/patients/${patientId}`).then((r) => r.data),

  createPatient: (patient: Partial<Patient>) =>
    api.post<ApiResponse<{ patientId: string; uhid: string }>>('/patients', patient).then((r) => r.data),

  updatePatient: (patientId: string, data: Partial<Patient>) =>
    api.put<ApiResponse<null>>(`/patients/${patientId}`, data).then((r) => r.data),

  deletePatient: (patientId: string) =>
    api.delete<ApiResponse<null>>(`/patients/${patientId}`).then((r) => r.data),

  getPatientHistory: (patientId: string) =>
    api.get<ApiResponse<unknown>>('/patientDetail-history', { params: { id: patientId } }).then((r) => r.data),

  searchPatients: (query: string) =>
    api.get<ApiResponse<Patient[]>>('/patients/search', { params: { q: query } }).then((r) => r.data),

  savePatientHistory: (patientId: string, data: Record<string, unknown>) =>
    api.put<ApiResponse<unknown>>('/patientDetail-history', { patientId, ...data }).then((r) => r.data),
};

// ─── Queue API ───────────────────────────────────────────────────────

export const queueApi = {
  getQueue: (params: { organizationId: string; branchId: string; date: string }) =>
    api.get<ApiResponse<{ queue: QueueEntry[] }>>('/queue', { params }).then((r) => r.data),

  addToQueue: (entry: Record<string, unknown>) =>
    api.post<ApiResponse<QueueEntry>>('/queue', entry).then((r) => r.data),

  updateQueueEntry: (queueId: string, data: Partial<QueueEntry>) =>
    api.put<ApiResponse<null>>(`/queue/${queueId}`, data).then((r) => r.data),

  removeFromQueue: (queueId: string) =>
    api.delete<ApiResponse<null>>(`/queue/${queueId}`).then((r) => r.data),

  getQueueStats: (params: { organizationId: string; branchId: string; date: string }) =>
    api.get<ApiResponse<{ waiting: number; ongoing: number; completed: number; cancelled: number; total: number }>>('/queue/stats', { params }).then((r) => r.data),
};

// ─── Appointment API ─────────────────────────────────────────────────

export const appointmentApi = {
  getAppointments: (params?: {
    organizationId?: string;
    branchId?: string;
    startDateUTC?: string;
    endDateUTC?: string;
    doctorId?: string;
    status?: string;
    date?: string;
  }) =>
    api.get<ApiResponse<Appointment[]>>('/appointments', { params }).then((r) => r.data),

  getSlots: (params: { date: string; doctorId?: string; branchId?: string; duration?: number }) =>
    api.get<ApiResponse<SlotsResponse>>('/appointments/slots', { params }).then((r) => r.data),

  createAppointment: (appointment: Partial<Appointment> & { services?: SelectedService[] }) =>
    api.post<ApiResponse<{ appointment: Appointment; queueEntry: unknown }>>('/appointments', appointment).then((r) => r.data),

  checkinAppointment: (appointmentId: string) =>
    api.post<ApiResponse<{ appointment: Appointment; queueEntry: QueueEntry }>>(`/appointments/${appointmentId}/checkin`).then((r) => r.data),

  createFollowUp: (data: {
    parentAppointmentId?: string;
    patientId: string;
    organizationId: string;
    branchId: string;
    doctorId: string;
    followUpDate: string;
    slotDate?: string;
    slot?: string;
    notes?: string;
    services?: SelectedService[];
  }) =>
    api.post<ApiResponse<Appointment>>('/appointments/followup', data).then((r) => r.data),

  updateAppointment: (appointmentId: string, data: Partial<Appointment>) =>
    api.put<ApiResponse<null>>(`/appointments/${appointmentId}`, data).then((r) => r.data),

  cancelAppointment: (appointmentId: string) =>
    api.put<ApiResponse<null>>(`/appointments/${appointmentId}`, { status: 'Cancelled' }).then((r) => r.data),
};

// ─── Schedule API ────────────────────────────────────────────────────

export const scheduleApi = {
  getSchedule: (params: { organizationId: string; branchId: string; date: string }) =>
    api.get<ApiResponse<{ queue: QueueEntry[]; appointments: Appointment[]; followups: Appointment[] }>>('/schedule', { params }).then((r) => r.data),
};

// ─── Prescription API ────────────────────────────────────────────────

export const prescriptionApi = {
  savePrescription: (prescription: Record<string, unknown>) =>
    api.post<ApiResponse<{ prescriptionId: string; pdfUrl: string }>>(
      '/savePrescription',
      prescription
    ).then((r) => r.data),

  updatePrescription: (prescription: Record<string, unknown>) =>
    api.put<ApiResponse<null>>('/updatePrescription', prescription).then((r) => r.data),

  getFullPrescription: (prescriptionId: string) =>
    api.get<ApiResponse<Prescription>>('/get-fullprescription', {
      params: { prescription_id: prescriptionId },
    }).then((r) => r.data),

  getPatientPrescriptions: (patientId: string, params?: { page?: number; limit?: number }) =>
    api.get<ApiResponse<Prescription[]>>(`/patients/${patientId}/prescriptions`, { params }).then((r) => r.data),

  getDropdownOptions: () =>
    api.get<ApiResponse<DropdownOptions>>('/prescriptions/dropdown-options').then((r) => r.data),

  search: (params: PrescriptionSearchParams) =>
    api.get<ApiResponse<PrescriptionSearchResult[]>>('/prescriptions/search', { params }).then((r) => r.data),

  getFrequentlyUsed: (params: FrequentlyUsedParams) =>
    api.get<ApiResponse<PrescriptionSearchResult[]>>('/prescriptions/frequently-seen', { params }).then((r) => r.data),

  getConfiguration: (params: { organization_id: string; branch_id: string }) =>
    api.get<ApiResponse<PrescriptionConfiguration>>('/prescriptions/configuration', { params }).then((r) => r.data),

  saveConfiguration: (data: Record<string, unknown>) =>
    api.put<ApiResponse<null>>('/prescriptions/configuration', data).then((r) => r.data),

  getVitalUnits: () =>
    api.get<ApiResponse<{ units: VitalUnitsMap }>>('/prescriptions/vital-units').then((r) => r.data),

  getPatientDetailHistory: (patientId: string) =>
    api.get<ApiResponse<{
      fullName: string;
      ageDisplay: string;
      genderDisplay: string;
      phoneDisplay: string;
      rawData: { address: string };
      lockedVitals: PrescriptionVitals | null;
      medicalHistory: { conditions?: Array<{ name: string; value: string; since?: string }>; noHistory?: boolean } | null;
    }>>('/patientDetail-history', { params: { id: patientId } }).then((r) => r.data),
};

// ─── Invoice API ─────────────────────────────────────────────────────

export const invoiceApi = {
  getInvoices: (params?: { organizationId?: string; patientId?: string; status?: string; startDate?: string; endDate?: string }) =>
    api.get<ApiResponse<Invoice[]>>('/invoices', { params }).then((r) => r.data),

  getInvoice: (invoiceId: string) =>
    api.get<ApiResponse<Invoice>>(`/invoices/${invoiceId}`).then((r) => r.data),

  createInvoice: (invoice: Partial<Invoice>) =>
    api.post<ApiResponse<Invoice>>('/invoices', invoice).then((r) => r.data),

  updateInvoice: (invoiceId: string, data: Partial<Invoice>) =>
    api.put<ApiResponse<null>>(`/invoices/${invoiceId}`, data).then((r) => r.data),

  getReceipts: (invoiceId: string) =>
    api.get<ApiResponse<unknown>>(`/invoices/${invoiceId}/receipts`).then((r) => r.data),
};

// ─── Payment API ─────────────────────────────────────────────────────

export const paymentApi = {
  createPayment: (payment: { invoiceId: string; amount: number; method: string; collectedBy: string }) =>
    api.post<ApiResponse<{ paymentId: string; receiptId: string }>>('/payments', payment).then((r) => r.data),

  getPayments: (params?: { organizationId?: string; startDate?: string; endDate?: string }) =>
    api.get<ApiResponse<Payment[]>>('/payments', { params }).then((r) => r.data),
};

// ─── Masters API ─────────────────────────────────────────────────────

// Helper to unwrap nested master data responses: { data: { symptoms: [...] } } → { data: [...] }
function unwrapMaster<T>(response: { data: ApiResponse<Record<string, T[]>> }): ApiResponse<T[]> {
  const envelope = response.data;
  const nested = envelope.data;
  const arr = Object.values(nested)[0] || [];
  return { ...envelope, data: arr };
}

export const mastersApi = {
  getSymptoms: (search?: string) =>
    api.get('/masters/symptoms', { params: { search } }).then(r => unwrapMaster<MasterSymptom>(r)),

  getDiagnoses: (search?: string) =>
    api.get('/masters/diagnoses', { params: { search } }).then(r => unwrapMaster<MasterDiagnosis>(r)),

  getMedications: (search?: string) =>
    api.get('/masters/medications', { params: { search } }).then(r => unwrapMaster<MasterMedication>(r)),

  getLabTests: (search?: string) =>
    api.get('/masters/lab-tests', { params: { search } }).then(r => unwrapMaster<MasterLabTest>(r)),

  getServices: (organizationId: string) =>
    api.get('/masters/services', { params: { organizationId } }).then(r => unwrapMaster<MasterService>(r)),

  searchServices: (params: { organizationId?: string; search?: string }) =>
    api.get('/masters/services', { params }).then(r => unwrapMaster<MasterService>(r)),

  createService: (data: { name: string; price: number; description?: string; category?: string; organizationId?: string }) =>
    api.post<ApiResponse<{ service: MasterService }>>('/masters/services', data).then(r => r.data),

  getExaminationFindings: (search?: string) =>
    api.get('/masters/examination-findings', { params: { search } }).then(r => unwrapMaster<MasterExaminationFinding>(r)),

  getProcedures: (search?: string) =>
    api.get('/masters/procedures', { params: { search } }).then(r => unwrapMaster<MasterProcedure>(r)),

  getSalutations: () =>
    api.get('/masters/salutations').then(r => unwrapMaster<{ salutationId: string; label: string }>(r)),

  bulkImport: (type: string, items: Record<string, unknown>[]) =>
    api.post<ApiResponse<{ inserted: number; failed: number; errors: Array<{ index: number; error: string }> }>>('/masters/bulk-import', { type, items }).then(r => r.data),
};

// ─── Templates API ───────────────────────────────────────────────────

export const templatesApi = {
  getTemplates: (params: {
    organization_id: string;
    branch_id: string;
    doctor_id?: string;
    type?: string;
    template_id?: string;
  }) =>
    api.get<ApiResponse<PrescriptionTemplate[]>>('/prescription-Templates/template-gethandler', { params }).then((r) => r.data),

  createTemplate: (data: Record<string, unknown>) =>
    api.post<ApiResponse<{ template_id: string }>>('/prescription-Templates/template-posthandler', data).then((r) => r.data),

  updateTemplate: (data: Record<string, unknown>) =>
    api.put<ApiResponse<null>>('/prescription-Templates/template-edithandler', data).then((r) => r.data),

  deleteTemplate: (params: {
    organization_id: string;
    branch_id: string;
    template_id: string;
    template_type: string;
  }) =>
    api.delete<ApiResponse<null>>('/prescription-Templates/template-deletehandler', { params }).then((r) => r.data),

  getMainTemplates: (params: { organization_id: string; branch_id?: string }) =>
    api.get<ApiResponse<PrescriptionTemplate[]>>('/prescription-Templates/main-template-handler', { params }).then((r) => r.data),
};

// ─── Analytics API ───────────────────────────────────────────────────

export const analyticsApi = {
  getSummary: (params?: { organizationId?: string; startDate?: string; endDate?: string }) =>
    api.get<ApiResponse<AnalyticsSummary>>('/analytics/summary', { params }).then((r) => r.data),
};

// ─── Print Settings API ──────────────────────────────────────────────

export const printSettingsApi = {
  getSettings: (params: { organization_id: string; branch_id: string }) =>
    api.get<ApiResponse<Record<string, unknown>>>('/printSettings', { params }).then((r) => r.data),

  saveSettings: (settings: Record<string, unknown>) =>
    api.post<ApiResponse<null>>('/printSettings', settings).then((r) => r.data),
};

export default api;
