/**
 * API Service Layer for PatientCare Hub
 * Handles all API calls to the backend
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/patientcare';

// Get auth token from localStorage
export function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

// Set auth token in localStorage
export function setAuthToken(token: string): void {
  localStorage.setItem('auth_token', token);
}

// Remove auth token from localStorage
export function removeAuthToken(): void {
  localStorage.removeItem('auth_token');
}

// Get auth headers
function getAuthHeaders(): HeadersInit {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

// Generic API request function
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      // Unauthorized - clear token and redirect to login
      removeAuthToken();
      window.location.href = '/login';
      throw new Error('Unauthorized');
    }
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || 'An error occurred');
  }

  return response.json();
}

// ==================== AUTHENTICATION ====================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export const authApi = {
  login: async (credentials: LoginRequest): Promise<TokenResponse> => {
    return apiRequest<TokenResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  },

  getCurrentUser: async (): Promise<User> => {
    return apiRequest<User>('/auth/me');
  },
};

// ==================== PATIENTS & PATIENTCARE DASHBOARD ====================

export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  address: string;
  phone: string;
  emergencyContact: string;
  medicalHistory: string;
  lastVisit: string;
  allergies: string;
  currentDiagnosis: string;
  existingConditions: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface PatientCreate {
  firstName: string;
  lastName: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  address: string;
  phone: string;
  emergencyContact: string;
  medicalHistory?: string;
  lastVisit: string;
  allergies?: string;
  currentDiagnosis?: string;
  existingConditions?: string;
}

export interface PatientUpdate {
  firstName?: string;
  lastName?: string;
  age?: number;
  gender?: 'Male' | 'Female' | 'Other';
  address?: string;
  phone?: string;
  emergencyContact?: string;
  medicalHistory?: string;
  lastVisit?: string;
  allergies?: string;
  currentDiagnosis?: string;
  existingConditions?: string;
}

export interface GenderCounts {
  male: number;
  female: number;
  other: number;
}

export interface AgeBucketCounts {
  under_18: number;
  from_18_35: number;
  from_36_60: number;
  over_60: number;
}

export interface VisitTrendPoint {
  date: string;
  count: number;
}

export interface BillingSummary {
  total_amount: number;
  pending_amount: number;
  paid_amount: number;
}

export interface PatientCareDashboardMetrics {
  total_patients: number;
  gender_counts: GenderCounts;
  age_buckets: AgeBucketCounts;
  recent_visits: VisitTrendPoint[];
  billing_summary: BillingSummary;
}

export const patientsApi = {
  getAll: async (): Promise<Patient[]> => {
    return apiRequest<Patient[]>('/patients');
  },

  getById: async (id: string): Promise<Patient> => {
    return apiRequest<Patient>(`/patients/${id}`);
  },

  create: async (patient: PatientCreate): Promise<Patient> => {
    return apiRequest<Patient>('/patients', {
      method: 'POST',
      body: JSON.stringify(patient),
    });
  },

  update: async (id: string, patient: PatientUpdate): Promise<Patient> => {
    return apiRequest<Patient>(`/patients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patient),
    });
  },

  getDashboardMetrics: async (): Promise<PatientCareDashboardMetrics> => {
    return apiRequest<PatientCareDashboardMetrics>('/dashboard/metrics');
  },
};

// ==================== LAB TESTS ====================

export interface LabTest {
  id: string;
  patientId: string;
  testName: string;
  orderedDate: string;
  status: 'Pending' | 'Completed';
  results: string;
  documents: string[];
}

export interface LabTestCreate {
  patientId: string;
  testName: string;
  orderedDate: string;
  status?: 'Pending' | 'Completed';
  results?: string;
  documents?: string[];
}

export interface LabTestUpdate {
  testName?: string;
  orderedDate?: string;
  status?: 'Pending' | 'Completed';
  results?: string;
  documents?: string[];
}

export const labTestsApi = {
  getByPatient: async (patientId: string): Promise<LabTest[]> => {
    return apiRequest<LabTest[]>(`/patients/${patientId}/lab-tests`);
  },

  create: async (test: LabTestCreate): Promise<LabTest> => {
    return apiRequest<LabTest>(`/patients/${test.patientId}/lab-tests`, {
      method: 'POST',
      body: JSON.stringify(test),
    });
  },

  update: async (id: string, test: LabTestUpdate): Promise<LabTest> => {
    return apiRequest<LabTest>(`/lab-tests/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(test),
    });
  },
};

// ==================== TIMELINE ====================

export interface TimelineEvent {
  id: string;
  patientId: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  activity: string;
  type: 'admission' | 'lab' | 'medication' | 'note' | 'billing' | 'discharge';
}

export interface TimelineEventCreate {
  patientId: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  activity: string;
  type: 'admission' | 'lab' | 'medication' | 'note' | 'billing' | 'discharge';
}

export const timelineApi = {
  getByPatient: async (patientId: string): Promise<TimelineEvent[]> => {
    return apiRequest<TimelineEvent[]>(`/patients/${patientId}/timeline`);
  },

  create: async (event: TimelineEventCreate): Promise<TimelineEvent> => {
    return apiRequest<TimelineEvent>(`/patients/${event.patientId}/timeline`, {
      method: 'POST',
      body: JSON.stringify(event),
    });
  },
};

// ==================== NOTES ====================

export interface Note {
  id: string;
  patientId: string;
  type: 'doctor' | 'nurse';
  author: string;
  timestamp: string;
  content: string;
}

export interface NoteCreate {
  patientId: string;
  type: 'doctor' | 'nurse';
  author: string;
  timestamp: string;
  content: string;
}

export interface NotesResponse {
  doctor: Note[];
  nurse: Note[];
}

export const notesApi = {
  getByPatient: async (patientId: string, type?: 'doctor' | 'nurse'): Promise<NotesResponse> => {
    const response = await apiRequest<NotesResponse>(`/patients/${patientId}/notes`);
    if (type) {
      return {
        doctor: type === 'doctor' ? response.doctor : [],
        nurse: type === 'nurse' ? response.nurse : [],
      };
    }
    return response;
  },

  create: async (note: NoteCreate): Promise<Note> => {
    return apiRequest<Note>(`/patients/${note.patientId}/notes`, {
      method: 'POST',
      body: JSON.stringify(note),
    });
  },
};

// ==================== BILLING ====================

export interface BillingItem {
  id: string;
  patientId: string;
  description: string;
  cost: number;
  status: 'Pending' | 'Paid';
  date: string;
}

export interface BillingItemCreate {
  patientId: string;
  description: string;
  cost: number;
  status?: 'Pending' | 'Paid';
  date: string;
}

export interface BillingItemUpdate {
  description?: string;
  cost?: number;
  status?: 'Pending' | 'Paid';
  date?: string;
}

export const billingApi = {
  getByPatient: async (patientId: string): Promise<BillingItem[]> => {
    return apiRequest<BillingItem[]>(`/patients/${patientId}/billing`);
  },

  create: async (item: BillingItemCreate): Promise<BillingItem> => {
    return apiRequest<BillingItem>(`/patients/${item.patientId}/billing`, {
      method: 'POST',
      body: JSON.stringify(item),
    });
  },

  update: async (id: string, item: BillingItemUpdate): Promise<BillingItem> => {
    return apiRequest<BillingItem>(`/billing/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(item),
    });
  },
};

// ==================== MEDICATIONS ====================

export interface MedicationRefill {
  date: string;
  pharmacist: string;
}

export interface Medication {
  id: string;
  patientId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  prescribedDate: string;
  prescribedBy: string;
  status: 'Active' | 'Discontinued';
  instructions: string;
  refills: MedicationRefill[];
}

export interface MedicationCreate {
  patientId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  prescribedDate: string;
  prescribedBy: string;
  status?: 'Active' | 'Discontinued';
  instructions?: string;
  refills?: MedicationRefill[];
}

export interface MedicationUpdate {
  medicationName?: string;
  dosage?: string;
  frequency?: string;
  prescribedDate?: string;
  prescribedBy?: string;
  status?: 'Active' | 'Discontinued';
  instructions?: string;
  refills?: MedicationRefill[];
}

export const medicationsApi = {
  getByPatient: async (patientId: string): Promise<Medication[]> => {
    return apiRequest<Medication[]>(`/patients/${patientId}/medications`);
  },

  create: async (medication: MedicationCreate): Promise<Medication> => {
    return apiRequest<Medication>(`/patients/${medication.patientId}/medications`, {
      method: 'POST',
      body: JSON.stringify(medication),
    });
  },

  update: async (id: string, medication: MedicationUpdate): Promise<Medication> => {
    return apiRequest<Medication>(`/medications/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(medication),
    });
  },
};

// ==================== INSURANCE ====================

export interface InsuranceDocument {
  type: 'Policy' | 'Claim' | 'PreAuthorization' | 'Other';
  name: string;
  uploadDate: string;
}

export interface InsuranceClaim {
  id: string;
  billingItemId: string;
  claimDate: string;
  status: 'Initiated' | 'Pending' | 'Approved' | 'Rejected' | 'Settled';
  claimedAmount: number;
  approvedAmount: number;
  settlementDate?: string;
  notes: string;
}

export interface InsuranceNote {
  timestamp: string;
  author: string;
  content: string;
}

export interface Insurance {
  id: string;
  patientId: string;
  providerName: string;
  policyName: string;
  policyType: 'Individual' | 'Family' | 'Group' | 'Government';
  policyNumber: string;
  providerContact: string;
  coverageType: 'Cashless' | 'Reimbursement' | 'Both';
  coveragePercentage: number;
  coverageLimit: number;
  deductible: number;
  copay: number;
  preAuthRequired: boolean;
  policyStartDate: string;
  policyEndDate: string;
  status: 'Active' | 'Expired' | 'Suspended';
  documents: InsuranceDocument[];
  claims: InsuranceClaim[];
  notes: InsuranceNote[];
}

export interface InsuranceCreate {
  patientId: string;
  providerName: string;
  policyName: string;
  policyType: 'Individual' | 'Family' | 'Group' | 'Government';
  policyNumber: string;
  providerContact: string;
  coverageType: 'Cashless' | 'Reimbursement' | 'Both';
  coveragePercentage: number;
  coverageLimit: number;
  deductible: number;
  copay: number;
  preAuthRequired: boolean;
  policyStartDate: string;
  policyEndDate: string;
  status?: 'Active' | 'Expired' | 'Suspended';
  documents?: InsuranceDocument[];
  claims?: InsuranceClaim[];
  notes?: InsuranceNote[];
}

export interface InsuranceUpdate {
  providerName?: string;
  policyName?: string;
  policyType?: 'Individual' | 'Family' | 'Group' | 'Government';
  policyNumber?: string;
  providerContact?: string;
  coverageType?: 'Cashless' | 'Reimbursement' | 'Both';
  coveragePercentage?: number;
  coverageLimit?: number;
  deductible?: number;
  copay?: number;
  preAuthRequired?: boolean;
  policyStartDate?: string;
  policyEndDate?: string;
  status?: 'Active' | 'Expired' | 'Suspended';
  documents?: InsuranceDocument[];
  claims?: InsuranceClaim[];
  notes?: InsuranceNote[];
}

export const insuranceApi = {
  getByPatient: async (patientId: string): Promise<Insurance | null> => {
    return apiRequest<Insurance | null>(`/patients/${patientId}/insurance`);
  },

  create: async (insurance: InsuranceCreate): Promise<Insurance> => {
    return apiRequest<Insurance>(`/patients/${insurance.patientId}/insurance`, {
      method: 'POST',
      body: JSON.stringify(insurance),
    });
  },

  update: async (id: string, insurance: InsuranceUpdate): Promise<Insurance> => {
    return apiRequest<Insurance>(`/insurance/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(insurance),
    });
  },

  delete: async (id: string): Promise<void> => {
    return apiRequest<void>(`/insurance/${id}`, {
      method: 'DELETE',
    });
  },
};

// ==================== DASHBOARD ====================

export interface PatientDashboard {
  patient: Patient;
  labTests: LabTest[];
  timeline: TimelineEvent[];
  doctorNotes: Note[];
  nurseNotes: Note[];
  billing: BillingItem[];
  medications: Medication[];
  insurance: Insurance | null;
}

export const dashboardApi = {
  getByPatient: async (patientId: string): Promise<PatientDashboard> => {
    return apiRequest<PatientDashboard>(`/patients/${patientId}/dashboard`);
  },
};

// ==================== DISCHARGE FLOW API ====================

const DISCHARGE_API_URL = import.meta.env.VITE_API_URL?.replace('/patientcare', '') || 'http://localhost:8000/api';

// Generic API request function for discharge flow (no auth required for now)
async function dischargeApiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${DISCHARGE_API_URL}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(error.detail || 'An error occurred');
  }

  return response.json();
}

export interface DischargePatient {
  id: string;
  mrn: string;
  name: string;
  age?: number;
  admission_id: string;
  diagnosis?: string;
  internal_hospital_id?: string;
  notes?: string;
  discharge_status: 'pending' | 'in_progress' | 'ready' | 'completed' | 'blocked';
  ready_for_discharge_eval: boolean;
  extraction_completed: boolean;
  tasks_generated: boolean;
  created_at: string;
  updated_at: string;
}

export interface DischargePatientCreate {
  mrn: string;
  name: string;
  age?: number;
  admission_id: string;
  diagnosis?: string;
  internal_hospital_id?: string;
  notes?: string;
}

export interface ExtractedData {
  id: string;
  patient_id: string;
  labs?: Record<string, any>;
  vitals?: Record<string, any>;
  pharmacy_pending?: string[];
  radiology_pending?: string[];
  billing_pending?: Record<string, any>;
  doctor_notes?: string[];
  procedures?: string[];
  nursing_notes?: string[];
  discharge_blockers?: string[];
  raw_data?: Record<string, any>;
  extracted_at: string;
}

export interface DischargeTask {
  id: string;
  patient_id: string;
  title: string;
  description?: string;
  category: 'medical' | 'operational' | 'financial';
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  deadline?: string;
  assigned_to?: string;
  created_at: string;
  completed_at?: string;
}

export interface AgentLog {
  id: string;
  patient_id: string;
  agent_type: string;
  reasoning?: string;
  action: string;
  result?: Record<string, any>;
  error?: string;
  timestamp: string;
}

export interface DischargeDashboard {
  patient: DischargePatient;
  extracted_data?: ExtractedData;
  tasks: DischargeTask[];
  agent_logs: AgentLog[];
}

export interface DashboardStatusCounts {
  pending: number;
  in_progress: number;
  ready: number;
  completed: number;
  blocked: number;
}

export interface TaskStatusCounts {
  pending: number;
  in_progress: number;
  completed: number;
  failed: number;
}

export interface TaskCategoryCounts {
  medical: number;
  operational: number;
  financial: number;
}

export interface TaskPriorityCounts {
  low: number;
  medium: number;
  high: number;
  critical: number;
}

export interface TasksSummary {
  total: number;
  by_status: TaskStatusCounts;
  by_category: TaskCategoryCounts;
  by_priority: TaskPriorityCounts;
}

export interface BlockerMetric {
  name: string;
  count: number;
}

export interface TodayDischarge {
  patient_id: string;
  name: string;
  mrn: string;
  status: DischargePatient['discharge_status'];
  updated_at: string;
}

export interface BlockedPatientSummary {
  patient_id: string;
  name: string;
  mrn: string;
  discharge_status: DischargePatient['discharge_status'];
  blockers: string[];
}

export interface DashboardMetrics {
  total_patients: number;
  status_counts: DashboardStatusCounts;
  blocked_count: number;
  today_ready: number;
  today_completed: number;
  tasks_summary: TasksSummary;
  top_blockers: BlockerMetric[];
  todays_discharges: TodayDischarge[];
  blocked_patients: BlockedPatientSummary[];
}

export interface OverviewKpis {
  current_inpatients: number;
  pending_discharges: number;
  avg_readiness_score: number | null;
  avg_length_of_stay_days: number | null;
  expected_discharges_24h: number;
  high_readmission_risk: number;
}

export interface OverviewThroughputPoint {
  date: string;
  actual: number;
  target: number;
  movingAvg: number;
}

export interface OverviewTaskTrendPoint {
  date: string;
  completed: number;
  outstanding: number;
}

export interface OverviewDelayReason {
  reason: string;
  count: number;
  avgDelayHours: number;
}

export interface OverviewWardOccupancy {
  ward: string;
  occupancy: number;
  nurseRatio?: string | null;
  expected24h: number;
}

export interface OverviewPatientSummary {
  id: string;
  name: string;
  age?: number;
  ward?: string;
  bed?: string;
  mrn: string;
  diagnosis?: string;
  readinessScore?: number;
  pendingTasks: number;
  lastAdmission: string;
  nextAction?: string | null;
  dischargeStatus: string;
  delayReason?: string | null;
  losDays: number;
  insuranceType?: string | null;
  attendingPhysician?: string | null;
  riskLevel?: string | null;
}

export interface OverviewResponse {
  kpis: OverviewKpis;
  throughput: OverviewThroughputPoint[];
  taskTrend: OverviewTaskTrendPoint[];
  delayReasons: OverviewDelayReason[];
  occupancyByWard: OverviewWardOccupancy[];
  patients: OverviewPatientSummary[];
}

export const dischargeFlowApi = {
  getPatients: async (): Promise<DischargePatient[]> => {
    return dischargeApiRequest<DischargePatient[]>('/patients');
  },

  getPatient: async (patientId: string): Promise<DischargePatient> => {
    return dischargeApiRequest<DischargePatient>(`/patients/${patientId}`);
  },

  createPatient: async (patient: DischargePatientCreate): Promise<DischargePatient> => {
    return dischargeApiRequest<DischargePatient>('/patients', {
      method: 'POST',
      body: JSON.stringify(patient),
    });
  },

  getDashboard: async (patientId: string): Promise<DischargeDashboard> => {
    return dischargeApiRequest<DischargeDashboard>(`/patients/${patientId}/dashboard`);
  },

  markReady: async (patientId: string): Promise<{ success: boolean; message: string }> => {
    return dischargeApiRequest<{ success: boolean; message: string }>(
      `/patients/${patientId}/mark-ready`,
      { method: 'POST' }
    );
  },

  extract: async (patientId: string): Promise<{ success: boolean; message: string }> => {
    return dischargeApiRequest<{ success: boolean; message: string }>(
      `/patients/${patientId}/extract`,
      { method: 'POST' }
    );
  },

  generateTasks: async (patientId: string): Promise<{ success: boolean; message: string }> => {
    return dischargeApiRequest<{ success: boolean; message: string }>(
      `/patients/${patientId}/generate-tasks`,
      { method: 'POST' }
    );
  },

  updateTaskStatus: async (taskId: string, status: DischargeTask['status']): Promise<void> => {
    return dischargeApiRequest<void>(`/tasks/${taskId}/status?status=${status}`, {
      method: 'PATCH',
    });
  },

  getDashboardMetrics: async (): Promise<DashboardMetrics> => {
    return dischargeApiRequest<DashboardMetrics>('/dashboard/metrics');
  },

  getOverview: async (): Promise<OverviewResponse> => {
    return dischargeApiRequest<OverviewResponse>('/overview');
  },
};

