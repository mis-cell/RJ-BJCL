// Types and interfaces for Lorry Dispatch System

export type UserRole =
  | "SUPER_ADMIN"
  | "MAIN_GATE"
  | "MILL_WEIGHTMENT"
  | "ELECTRIC_WEIGHTMENT"
  | "STORE_DEPT";

export type DepartmentType = "Jute" | "Store" | "Finish Good" | "Other";

export type LorryStatus =
  | "GATE_ENTRY"
  | "WAITING_FOR_MILL_GROSS"
  | "ELECTRIC_GROSS_PENDING"
  | "WAITING_FOR_UNLOADING"
  | "MILL_TARE_PENDING"
  | "ELECTRIC_TARE_PENDING"
  | "STORE_PENDING"
  | "FINISH_GOOD_PENDING"
  | "OTHER_PENDING"
  | "READY_FOR_GATE_EXIT"
  | "COMPLETED";

export interface LorryRecord {
  id: string;
  gatePassNo: string;
  lorryNo: string;
  driverPhone: string;
  department: DepartmentType;
  broker: string;
  quality: string;
  mokam: string;
  marka: string;
  status: LorryStatus;
  
  // Timestamps & Dates
  inTime: string;
  outTime?: string;
  entryDate?: string;
  outDate?: string;
  chalanNo?: string;
  partyName?: string;
  description?: string;
  quantity?: number;
  unit?: string;
  gateGrossWeight?: number;
  gateTareWeight?: number;
  gateNetWeight?: number;
  outRemarks?: string;
  grade?: string;
  currentStage?: string;

  // Weights (in KG)
  millGrossWeight?: number;
  millGrossTime?: string;
  
  electricGrossWeight?: number;
  electricGrossTime?: string;
  
  millTareWeight?: number;
  millTareTime?: string;
  
  electricTareWeight?: number;
  electricTareTime?: string;

  // Computed Net Weights
  millNetWeight?: number;
  electricNetWeight?: number;
  finalNetWeight?: number;
  
  // Approval metadata
  deptApprovedBy?: string;
  deptApprovedTime?: string;
  remarks?: string;
  
  // GPS tag at entry
  entryGpsLocation?: { lat: number; lng: number; distanceMeters: number };
}

export interface AppAlert {
  id: string;
  timestamp: string;
  title: string;
  message: string;
  targetRole: UserRole | "ALL";
  lorryNo?: string;
  gatePassNo?: string;
  read: boolean;
  type: "info" | "success" | "warning" | "alert";
}

export interface SystemSettings {
  millZeroOffsetKg: number;
  electricZeroOffsetKg: number;
  inactivityTimeoutMinutes: number;
  geofenceRadiusMeters: number;
  millLat: number;
  millLng: number;
  enforceGeofence: boolean;
  allowScreenCapture: boolean;
}

export interface MasterOptions {
  brokers: string[];
  qualities: string[];
  mokams: string[];
  markas: string[];
}

export interface SystemUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  active: boolean;
  lastActive: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  username: string;
  role: UserRole;
  action: string;
  details: string;
}
