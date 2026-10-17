export type PriorityLevel = 'P1' | 'P2' | 'P3' | 'P4';

export type VerificationStatus = 'unverified' | 'escalated' | 'verified_fire' | 'possible_false_alarm';

export type FalseAlarmReason =
  | 'agricultural_stubble_burning'
  | 'brick_kiln_industrial_flare'
  | 'cloud_reflection_sensor_noise'
  | 'controlled_prescribed_fireline'
  | 'ranger_scouted_no_fire'
  | 'other';

export interface VerificationDecision {
  decision: 'verified_fire' | 'possible_false_alarm' | 'escalated';
  reason?: FalseAlarmReason | string;
  reasonLabel?: string;
  customNotes?: string;
  reviewerName: string;
  reviewerRole: string;
  reviewedAt: string;
}

export interface AuditLogEntry {
  action: string;
  user: string;
  timestamp: string;
  details?: string;
}

export interface RangerGate {
  id: string;
  name: string;
  type: 'core_gate' | 'buffer_gate' | 'hq';
  coordinates: [number, number]; // [lat, lon]
  description: string;
}

export interface Incident {
  _id: string;
  incidentId: string;
  title: string;
  latitude: number;
  longitude: number;
  source: 'VIIRS_NOAA20' | 'VIIRS_SNPP' | 'MODIS_TERRA' | 'MODIS_AQUA' | 'CSV_INGEST' | 'SYNTHETIC_TEST';
  satellite: string;
  instrument: string;
  confidence: 'low' | 'nominal' | 'high' | number;
  confidencePercent: number;
  frp: number; // Fire Radiative Power in MW
  brightness: number; // Kelvin (e.g. 330.5 K)
  brightT31?: number; // Kelvin (VIIRS band I-5 / MODIS 31)
  scan?: number;
  track?: number;
  daynight: 'D' | 'N';
  acqDate: string; // YYYY-MM-DD
  acqTime: string; // HHMM
  timestamp: string; // ISO-8601
  priority: PriorityLevel;
  priorityScore: number;
  priorityExplanation: string;
  zone: 'Core Zone' | 'Buffer Zone' | 'Reserve Boundary' | 'External Outskirts';
  nearestRangerGate: {
    gateId: string;
    gateName: string;
    distanceKm: number;
  };
  verificationStatus: VerificationStatus;
  verificationDecision?: VerificationDecision;
  auditHistory: AuditLogEntry[];
  isSynthetic: boolean;
  notes?: string;
  corroboratingHotspotsCount?: number;
}

export interface RouteResponse {
  success: boolean;
  isRealRoadRoute: boolean;
  provider: 'OSRM' | 'STRAIGHT_LINE_FALLBACK';
  distanceKm: number;
  durationMinutes: number;
  coordinates: [number, number][]; // [lat, lon] coordinates for polyline
  waypoints: {
    start: [number, number];
    end: [number, number];
  };
  disclaimer: string;
  warning?: string;
}
