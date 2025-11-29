export interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  age: number;
  gender: "Male" | "Female" | "Other";
  address: string;
  phone: string;
  emergencyContact: string;
  medicalHistory: string;
  lastVisit: string;
  allergies: string;
  currentDiagnosis: string;
  existingConditions: string;
}

export interface LabTest {
  id: string;
  patientId: string;
  testName: string;
  orderedDate: string;
  status: "Pending" | "Completed";
  results: string;
  documents: string[];
}

export interface TimelineEvent {
  id: string;
  patientId: string;
  timestamp: string;
  actor: string;
  actorRole: string;
  activity: string;
  type: "admission" | "lab" | "medication" | "note" | "billing" | "discharge";
}

export interface Note {
  id: string;
  patientId: string;
  type: "doctor" | "nurse";
  author: string;
  timestamp: string;
  content: string;
}

export interface BillingItem {
  id: string;
  patientId: string;
  description: string;
  cost: number;
  status: "Pending" | "Paid";
  date: string;
}

export interface Medication {
  id: string;
  patientId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  prescribedDate: string;
  prescribedBy: string;
  status: "Active" | "Discontinued";
  instructions: string;
  refills: { date: string; pharmacist: string }[];
}

export interface InsuranceClaim {
  id: string;
  billingItemId: string;
  claimDate: string;
  status: "Initiated" | "Pending" | "Approved" | "Rejected" | "Settled";
  claimedAmount: number;
  approvedAmount: number;
  settlementDate?: string;
  notes: string;
}

export interface Insurance {
  id: string;
  patientId: string;
  // Provider Information
  providerName: string;
  policyName: string;
  policyType: "Individual" | "Family" | "Group" | "Government";
  policyNumber: string;
  providerContact: string;
  // Coverage Details
  coverageType: "Cashless" | "Reimbursement" | "Both";
  coveragePercentage: number;
  coverageLimit: number;
  deductible: number;
  copay: number;
  preAuthRequired: boolean;
  // Policy Status
  policyStartDate: string;
  policyEndDate: string;
  status: "Active" | "Expired" | "Suspended";
  // Documents
  documents: {
    type: "Policy" | "Claim" | "PreAuthorization" | "Other";
    name: string;
    uploadDate: string;
  }[];
  // Claims
  claims: InsuranceClaim[];
  // Audit
  notes: {
    timestamp: string;
    author: string;
    content: string;
  }[];
}

const STORAGE_KEYS = {
  PATIENTS: "hospital_patients",
  LAB_TESTS: "hospital_lab_tests",
  TIMELINE: "hospital_timeline",
  NOTES: "hospital_notes",
  BILLING: "hospital_billing",
  MEDICATIONS: "hospital_medications",
  INSURANCE: "hospital_insurance",
};

// Initialize mock data
const initialPatients: Patient[] = [
  {
    id: "P001",
    firstName: "John",
    lastName: "Doe",
    age: 45,
    gender: "Male",
    address: "123 Main St, New York, NY 10001",
    phone: "(555) 123-4567",
    emergencyContact: "(555) 987-6543",
    medicalHistory: "Hypertension, Type 2 Diabetes",
    lastVisit: "2024-01-15",
    allergies: "Penicillin",
    currentDiagnosis: "Acute bronchitis",
    existingConditions: "Hypertension, Type 2 Diabetes",
  },
  {
    id: "P002",
    firstName: "Jane",
    lastName: "Smith",
    age: 32,
    gender: "Female",
    address: "456 Oak Ave, Brooklyn, NY 11201",
    phone: "(555) 234-5678",
    emergencyContact: "(555) 876-5432",
    medicalHistory: "Asthma",
    lastVisit: "2024-01-10",
    allergies: "None",
    currentDiagnosis: "Annual checkup",
    existingConditions: "Asthma",
  },
  {
    id: "P003",
    firstName: "Robert",
    lastName: "Johnson",
    age: 67,
    gender: "Male",
    address: "789 Pine Rd, Queens, NY 11354",
    phone: "(555) 345-6789",
    emergencyContact: "(555) 765-4321",
    medicalHistory: "Heart disease, Arthritis",
    lastVisit: "2024-01-12",
    allergies: "Sulfa drugs",
    currentDiagnosis: "Chest pain evaluation",
    existingConditions: "Coronary artery disease, Osteoarthritis",
  },
];

const initialLabTests: LabTest[] = [
  {
    id: "L001",
    patientId: "P001",
    testName: "Complete Blood Count",
    orderedDate: "2024-01-15",
    status: "Completed",
    results: "Normal range - WBC: 7.5, RBC: 5.2, Platelets: 250",
    documents: [],
  },
  {
    id: "L002",
    patientId: "P001",
    testName: "Chest X-Ray",
    orderedDate: "2024-01-15",
    status: "Pending",
    results: "",
    documents: [],
  },
];

const initialTimeline: TimelineEvent[] = [
  {
    id: "T001",
    patientId: "P001",
    timestamp: "2024-01-15T09:00:00",
    actor: "Dr. Sarah Wilson",
    actorRole: "Doctor",
    activity: "Patient admitted for acute bronchitis",
    type: "admission",
  },
  {
    id: "T002",
    patientId: "P001",
    timestamp: "2024-01-15T09:30:00",
    actor: "Dr. Sarah Wilson",
    actorRole: "Doctor",
    activity: "Ordered Complete Blood Count and Chest X-Ray",
    type: "lab",
  },
];

const initialNotes: Note[] = [
  {
    id: "N001",
    patientId: "P001",
    type: "doctor",
    author: "Dr. Sarah Wilson",
    timestamp: "2024-01-15T10:00:00",
    content: "Patient presents with persistent cough and mild fever. Diagnosed with acute bronchitis. Prescribed antibiotics and rest.",
  },
  {
    id: "N002",
    patientId: "P001",
    type: "nurse",
    author: "Nurse Maria Garcia",
    timestamp: "2024-01-15T10:30:00",
    content: "Vital signs recorded: BP 130/85, Temp 100.2°F, Pulse 78. Patient comfortable and resting.",
  },
];

const initialBilling: BillingItem[] = [
  {
    id: "B001",
    patientId: "P001",
    description: "Consultation Fee",
    cost: 150,
    status: "Paid",
    date: "2024-01-15",
  },
  {
    id: "B002",
    patientId: "P001",
    description: "Complete Blood Count",
    cost: 75,
    status: "Pending",
    date: "2024-01-15",
  },
  {
    id: "B003",
    patientId: "P001",
    description: "Chest X-Ray",
    cost: 200,
    status: "Pending",
    date: "2024-01-15",
  },
];

const initialMedications: Medication[] = [
  {
    id: "M001",
    patientId: "P001",
    medicationName: "Amoxicillin",
    dosage: "500mg",
    frequency: "3 times daily",
    prescribedDate: "2024-01-15",
    prescribedBy: "Dr. Sarah Wilson",
    status: "Active",
    instructions: "Take with food. Complete full course.",
    refills: [
      { date: "2024-01-15", pharmacist: "Central Pharmacy" },
    ],
  },
  {
    id: "M002",
    patientId: "P001",
    medicationName: "Lisinopril",
    dosage: "10mg",
    frequency: "Once daily",
    prescribedDate: "2023-12-01",
    prescribedBy: "Dr. Sarah Wilson",
    status: "Active",
    instructions: "Take in the morning for blood pressure control.",
    refills: [
      { date: "2023-12-01", pharmacist: "Central Pharmacy" },
      { date: "2024-01-05", pharmacist: "Central Pharmacy" },
    ],
  },
];

const initialInsurance: Insurance[] = [
  {
    id: "I001",
    patientId: "P001",
    providerName: "Blue Cross Blue Shield",
    policyName: "Premium Health Plan",
    policyType: "Individual",
    policyNumber: "BCBS-2024-123456",
    providerContact: "1-800-555-1234",
    coverageType: "Cashless",
    coveragePercentage: 80,
    coverageLimit: 500000,
    deductible: 1000,
    copay: 20,
    preAuthRequired: true,
    policyStartDate: "2024-01-01",
    policyEndDate: "2024-12-31",
    status: "Active",
    documents: [
      {
        type: "Policy",
        name: "policy-document.pdf",
        uploadDate: "2024-01-01",
      },
    ],
    claims: [],
    notes: [
      {
        timestamp: "2024-01-15T09:00:00",
        author: "Insurance Desk",
        content: "Policy verified and active. Pre-authorization approved for current admission.",
      },
    ],
  },
];

// Storage utilities
function initStorage() {
  if (!localStorage.getItem(STORAGE_KEYS.PATIENTS)) {
    localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(initialPatients));
  }
  if (!localStorage.getItem(STORAGE_KEYS.LAB_TESTS)) {
    localStorage.setItem(STORAGE_KEYS.LAB_TESTS, JSON.stringify(initialLabTests));
  }
  if (!localStorage.getItem(STORAGE_KEYS.TIMELINE)) {
    localStorage.setItem(STORAGE_KEYS.TIMELINE, JSON.stringify(initialTimeline));
  }
  if (!localStorage.getItem(STORAGE_KEYS.NOTES)) {
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(initialNotes));
  }
  if (!localStorage.getItem(STORAGE_KEYS.BILLING)) {
    localStorage.setItem(STORAGE_KEYS.BILLING, JSON.stringify(initialBilling));
  }
  if (!localStorage.getItem(STORAGE_KEYS.MEDICATIONS)) {
    localStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(initialMedications));
  }
  if (!localStorage.getItem(STORAGE_KEYS.INSURANCE)) {
    localStorage.setItem(STORAGE_KEYS.INSURANCE, JSON.stringify(initialInsurance));
  }
}

export const mockApi = {
  // Patients
  getPatients: (): Patient[] => {
    initStorage();
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.PATIENTS) || "[]");
  },
  
  getPatient: (id: string): Patient | undefined => {
    const patients = mockApi.getPatients();
    return patients.find((p) => p.id === id);
  },
  
  addPatient: (patient: Omit<Patient, "id">): Patient => {
    const patients = mockApi.getPatients();
    const newPatient = {
      ...patient,
      id: `P${String(patients.length + 1).padStart(3, "0")}`,
    };
    patients.push(newPatient);
    localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patients));
    return newPatient;
  },
  
  updatePatient: (id: string, updates: Partial<Patient>): Patient | undefined => {
    const patients = mockApi.getPatients();
    const index = patients.findIndex((p) => p.id === id);
    if (index === -1) return undefined;
    patients[index] = { ...patients[index], ...updates };
    localStorage.setItem(STORAGE_KEYS.PATIENTS, JSON.stringify(patients));
    return patients[index];
  },
  
  // Lab Tests
  getLabTests: (patientId: string): LabTest[] => {
    initStorage();
    const tests = JSON.parse(localStorage.getItem(STORAGE_KEYS.LAB_TESTS) || "[]");
    return tests.filter((t: LabTest) => t.patientId === patientId);
  },
  
  addLabTest: (test: Omit<LabTest, "id">): LabTest => {
    const tests = JSON.parse(localStorage.getItem(STORAGE_KEYS.LAB_TESTS) || "[]");
    const newTest = {
      ...test,
      id: `L${String(tests.length + 1).padStart(3, "0")}`,
    };
    tests.push(newTest);
    localStorage.setItem(STORAGE_KEYS.LAB_TESTS, JSON.stringify(tests));
    return newTest;
  },
  
  updateLabTest: (id: string, updates: Partial<LabTest>): LabTest | undefined => {
    const tests = JSON.parse(localStorage.getItem(STORAGE_KEYS.LAB_TESTS) || "[]");
    const index = tests.findIndex((t: LabTest) => t.id === id);
    if (index === -1) return undefined;
    tests[index] = { ...tests[index], ...updates };
    localStorage.setItem(STORAGE_KEYS.LAB_TESTS, JSON.stringify(tests));
    return tests[index];
  },
  
  // Timeline
  getTimeline: (patientId: string): TimelineEvent[] => {
    initStorage();
    const timeline = JSON.parse(localStorage.getItem(STORAGE_KEYS.TIMELINE) || "[]");
    return timeline
      .filter((e: TimelineEvent) => e.patientId === patientId)
      .sort((a: TimelineEvent, b: TimelineEvent) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
  },
  
  addTimelineEvent: (event: Omit<TimelineEvent, "id">): TimelineEvent => {
    const timeline = JSON.parse(localStorage.getItem(STORAGE_KEYS.TIMELINE) || "[]");
    const newEvent = {
      ...event,
      id: `T${String(timeline.length + 1).padStart(3, "0")}`,
    };
    timeline.push(newEvent);
    localStorage.setItem(STORAGE_KEYS.TIMELINE, JSON.stringify(timeline));
    return newEvent;
  },
  
  // Notes
  getNotes: (patientId: string, type?: "doctor" | "nurse"): Note[] => {
    initStorage();
    const notes = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES) || "[]");
    return notes
      .filter((n: Note) => n.patientId === patientId && (!type || n.type === type))
      .sort((a: Note, b: Note) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
  },
  
  addNote: (note: Omit<Note, "id">): Note => {
    const notes = JSON.parse(localStorage.getItem(STORAGE_KEYS.NOTES) || "[]");
    const newNote = {
      ...note,
      id: `N${String(notes.length + 1).padStart(3, "0")}`,
    };
    notes.push(newNote);
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
    return newNote;
  },
  
  // Billing
  getBilling: (patientId: string): BillingItem[] => {
    initStorage();
    const billing = JSON.parse(localStorage.getItem(STORAGE_KEYS.BILLING) || "[]");
    return billing.filter((b: BillingItem) => b.patientId === patientId);
  },
  
  addBillingItem: (item: Omit<BillingItem, "id">): BillingItem => {
    const billing = JSON.parse(localStorage.getItem(STORAGE_KEYS.BILLING) || "[]");
    const newItem = {
      ...item,
      id: `B${String(billing.length + 1).padStart(3, "0")}`,
    };
    billing.push(newItem);
    localStorage.setItem(STORAGE_KEYS.BILLING, JSON.stringify(billing));
    return newItem;
  },
  
  updateBillingItem: (id: string, updates: Partial<BillingItem>): BillingItem | undefined => {
    const billing = JSON.parse(localStorage.getItem(STORAGE_KEYS.BILLING) || "[]");
    const index = billing.findIndex((b: BillingItem) => b.id === id);
    if (index === -1) return undefined;
    billing[index] = { ...billing[index], ...updates };
    localStorage.setItem(STORAGE_KEYS.BILLING, JSON.stringify(billing));
    return billing[index];
  },
  
  // Medications
  getMedications: (patientId: string): Medication[] => {
    initStorage();
    const medications = JSON.parse(localStorage.getItem(STORAGE_KEYS.MEDICATIONS) || "[]");
    return medications.filter((m: Medication) => m.patientId === patientId);
  },
  
  addMedication: (medication: Omit<Medication, "id">): Medication => {
    const medications = JSON.parse(localStorage.getItem(STORAGE_KEYS.MEDICATIONS) || "[]");
    const newMedication = {
      ...medication,
      id: `M${String(medications.length + 1).padStart(3, "0")}`,
    };
    medications.push(newMedication);
    localStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(medications));
    return newMedication;
  },
  
  updateMedication: (id: string, updates: Partial<Medication>): Medication | undefined => {
    const medications = JSON.parse(localStorage.getItem(STORAGE_KEYS.MEDICATIONS) || "[]");
    const index = medications.findIndex((m: Medication) => m.id === id);
    if (index === -1) return undefined;
    medications[index] = { ...medications[index], ...updates };
    localStorage.setItem(STORAGE_KEYS.MEDICATIONS, JSON.stringify(medications));
    return medications[index];
  },
  
  // Insurance
  getInsurance: (patientId: string): Insurance | undefined => {
    initStorage();
    const insurance = JSON.parse(localStorage.getItem(STORAGE_KEYS.INSURANCE) || "[]");
    return insurance.find((i: Insurance) => i.patientId === patientId);
  },
  
  addInsurance: (insurance: Omit<Insurance, "id">): Insurance => {
    const allInsurance = JSON.parse(localStorage.getItem(STORAGE_KEYS.INSURANCE) || "[]");
    const newInsurance = {
      ...insurance,
      id: `I${String(allInsurance.length + 1).padStart(3, "0")}`,
    };
    allInsurance.push(newInsurance);
    localStorage.setItem(STORAGE_KEYS.INSURANCE, JSON.stringify(allInsurance));
    return newInsurance;
  },
  
  updateInsurance: (id: string, updates: Partial<Insurance>): Insurance | undefined => {
    const allInsurance = JSON.parse(localStorage.getItem(STORAGE_KEYS.INSURANCE) || "[]");
    const index = allInsurance.findIndex((i: Insurance) => i.id === id);
    if (index === -1) return undefined;
    allInsurance[index] = { ...allInsurance[index], ...updates };
    localStorage.setItem(STORAGE_KEYS.INSURANCE, JSON.stringify(allInsurance));
    return allInsurance[index];
  },
  
  deleteInsurance: (id: string): boolean => {
    const allInsurance = JSON.parse(localStorage.getItem(STORAGE_KEYS.INSURANCE) || "[]");
    const filtered = allInsurance.filter((i: Insurance) => i.id !== id);
    localStorage.setItem(STORAGE_KEYS.INSURANCE, JSON.stringify(filtered));
    return filtered.length < allInsurance.length;
  },
};
