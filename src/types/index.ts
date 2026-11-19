export type UserRole = 'field_worker' | 'supervisor';

export interface User {
  id: string;
  username: string;
  password?: string;
  name: string;
  role: UserRole;
  email?: string;
  cachedOffline: boolean;
  token: string;
  createdAt?: string;
}

export type RecordStatus =
  | 'draft'
  | 'pending'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'synced';

export interface CensusAmenities {
  electricity: boolean;
  pipedWater: boolean;
  sanitationToilet: boolean;
  lpgGas: boolean;
  rationCard: boolean;
  internetAccess: boolean;
  solarPower: boolean;
  bankAccount: boolean;
}

export interface CensusData {
  // Head of Family details
  headName: string;
  aadharNumber: string; // 12-digit UIDAI, e.g. "9876 5432 1098"
  phoneNumber: string; // 10-digit mobile
  gender: 'Male' | 'Female' | 'Other';
  age: string;

  // Household & Demographic Details
  buildingNo?: string;
  totalMembers: string;
  adultCount: string;
  childCount: string;
  socialCategory: 'General' | 'OBC' | 'SC' | 'ST';
  primaryLanguage: string;

  // Housing & Living Conditions
  houseType: 'Pucca (Concrete)' | 'Semi-Pucca' | 'Kutcha (Mud/Thatch)';
  ownershipStatus: 'Owned' | 'Rented' | 'Government Allotted' | 'Other';

  // Amenities Checkboxes (Multi-select)
  amenities: CensusAmenities;

  // Economic Profile
  primaryOccupation:
    | 'Agriculture / Farming'
    | 'Daily Wage Labour'
    | 'Government / Public Sector'
    | 'Private Sector'
    | 'Self-Employed / Business'
    | 'Unemployed / Other';
  annualIncomeBracket:
    | '< ₹50,000'
    | '₹50,000 - ₹1,50,000'
    | '₹1,50,000 - ₹3,00,000'
    | '> ₹3,00,000';

  // Notes
  notes?: string;
}

export interface FieldRecord {
  id: string;
  siteName: string;
  coordinates: {
    latitude: number;
    longitude: number;
    accuracy?: number;
  };
  observationType: string;
  data: CensusData;
  photoUri?: string;
  photoCompressedSize?: string;
  photoOriginalSize?: string;
  status: RecordStatus;
  version: number;
  vectorClock: { [userId: string]: number };
  createdAt: string;
  updatedAt: string;
  submittedBy: string;
  submittedByName: string;
  reviewedBy?: string;
  reviewedByName?: string;
  reviewedAt?: string;
  supervisorNotes?: string;
}

export interface SyncQueueItem {
  id: string;
  recordId: string;
  siteName: string;
  observationType: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  deltaPayload: Partial<FieldRecord>;
  retryCount: number;
  lastAttempt?: string;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  errorReason?: string;
}

export type ScreenName =
  | 'Splash'
  | 'Login'
  | 'Dashboard'
  | 'DataCollection'
  | 'MyRecords'
  | 'SyncQueue'
  | 'AllRecords'
  | 'SupervisorReview'
  | 'UserManagement';
