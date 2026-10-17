import { Incident } from '../types/incident.ts';
import { calculateIncidentPriority } from '../utils/triage.ts';
import { classifyTATRZone, findNearestRangerGate } from '../utils/geo.ts';

// Helper to construct seed incidents with automatic spatial classification and explainable priority
function createIncident(params: {
  incidentId: string;
  title: string;
  latitude: number;
  longitude: number;
  source: Incident['source'];
  satellite: string;
  instrument: string;
  confidence: Incident['confidence'];
  confidencePercent: number;
  frp: number;
  brightness: number;
  brightT31?: number;
  daynight: 'D' | 'N';
  hoursAgo: number;
  isSynthetic: boolean;
  verificationStatus?: Incident['verificationStatus'];
  notes?: string;
  corroboratingHotspotsCount?: number;
}): Incident {
  const now = new Date();
  const obsTime = new Date(now.getTime() - params.hoursAgo * 60 * 60 * 1000);
  const acqDate = obsTime.toISOString().split('T')[0];
  const acqTime = `${String(obsTime.getUTCHours()).padStart(2, '0')}${String(obsTime.getUTCMinutes()).padStart(2, '0')}`;
  
  const zone = classifyTATRZone(params.latitude, params.longitude);
  const nearestGate = findNearestRangerGate(params.latitude, params.longitude);

  const triage = calculateIncidentPriority({
    frp: params.frp,
    confidencePercent: params.confidencePercent,
    zone,
    hoursSinceObservation: params.hoursAgo,
    corroboratingCount: params.corroboratingHotspotsCount || 1,
    isNight: params.daynight === 'N',
  });

  return {
    _id: `inc_${params.incidentId.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
    incidentId: params.incidentId,
    title: params.title,
    latitude: params.latitude,
    longitude: params.longitude,
    source: params.source,
    satellite: params.satellite,
    instrument: params.instrument,
    confidence: params.confidence,
    confidencePercent: params.confidencePercent,
    frp: params.frp,
    brightness: params.brightness,
    brightT31: params.brightT31,
    daynight: params.daynight,
    acqDate,
    acqTime,
    timestamp: obsTime.toISOString(),
    priority: triage.priority,
    priorityScore: triage.score,
    priorityExplanation: triage.explanation,
    zone,
    nearestRangerGate: nearestGate,
    verificationStatus: params.verificationStatus || 'unverified',
    auditHistory: [
      {
        action: 'OBSERVATION_INGESTED',
        user: 'FIRMS_INGEST_PIPELINE',
        timestamp: new Date(obsTime.getTime() + 10 * 60 * 1000).toISOString(),
        details: `Ingested from ${params.satellite} ${params.instrument} pass. Initial triage computed as ${triage.priority}.`,
      },
    ],
    isSynthetic: params.isSynthetic,
    notes: params.notes,
    corroboratingHotspotsCount: params.corroboratingHotspotsCount || 1,
  };
}

export const SEED_INCIDENTS: Incident[] = [
  createIncident({
    incidentId: 'TATR-2026-081',
    title: 'Thermal Anomaly near Telia Dam & Moharli Southern Ridge',
    latitude: 20.2580,
    longitude: 79.3320,
    source: 'VIIRS_NOAA20',
    satellite: 'NOAA-20',
    instrument: 'VIIRS (375m)',
    confidence: 'high',
    confidencePercent: 94,
    frp: 32.4,
    brightness: 368.6,
    brightT31: 302.1,
    daynight: 'N',
    hoursAgo: 1.2,
    isSynthetic: false,
    corroboratingHotspotsCount: 3,
    notes: 'Nighttime high-intensity thermal anomaly detected inside primary tiger breeding corridor. Multiple co-located pixels.',
  }),
  createIncident({
    incidentId: 'TATR-2026-082',
    title: 'Hotspot Cluster in Kolsa Range Teak Reserve',
    latitude: 20.3120,
    longitude: 79.4850,
    source: 'VIIRS_SNPP',
    satellite: 'Suomi NPP',
    instrument: 'VIIRS (375m)',
    confidence: 'high',
    confidencePercent: 88,
    frp: 21.8,
    brightness: 359.2,
    brightT31: 298.4,
    daynight: 'D',
    hoursAgo: 3.5,
    isSynthetic: false,
    corroboratingHotspotsCount: 2,
    notes: 'Dense dry deciduous forest canopy. Wind vector moving north-west.',
  }),
  createIncident({
    incidentId: 'TATR-2026-083',
    title: 'Moderate Heat Signature along Navegaon Buffer Transition',
    latitude: 20.4950,
    longitude: 79.4450,
    source: 'VIIRS_NOAA20',
    satellite: 'NOAA-20',
    instrument: 'VIIRS (375m)',
    confidence: 'nominal',
    confidencePercent: 68,
    frp: 9.6,
    brightness: 344.8,
    brightT31: 296.0,
    daynight: 'D',
    hoursAgo: 5.8,
    isSynthetic: false,
    corroboratingHotspotsCount: 1,
    notes: 'Located along boundary fireline. Could be controlled departmental burning or uncontained flare.',
  }),
  createIncident({
    incidentId: 'TATR-2026-084',
    title: 'Suspected Agricultural Burn / Chimur Farmlands Border',
    latitude: 20.5280,
    longitude: 79.3620,
    source: 'MODIS_TERRA',
    satellite: 'Terra',
    instrument: 'MODIS (1km)',
    confidence: 'nominal',
    confidencePercent: 58,
    frp: 6.2,
    brightness: 338.5,
    brightT31: 294.2,
    daynight: 'D',
    hoursAgo: 8.4,
    isSynthetic: false,
    corroboratingHotspotsCount: 1,
    notes: 'Bordering paddy fields outside northern sanctuary border. High likelihood of post-harvest crop stubble burning.',
  }),
  createIncident({
    incidentId: 'TATR-2026-085',
    title: 'Low Radiative Signature near Pangdi Eastern Edge',
    latitude: 20.1450,
    longitude: 79.5620,
    source: 'VIIRS_SNPP',
    satellite: 'Suomi NPP',
    instrument: 'VIIRS (375m)',
    confidence: 'low',
    confidencePercent: 42,
    frp: 3.1,
    brightness: 332.4,
    brightT31: 292.0,
    daynight: 'D',
    hoursAgo: 14.2,
    isSynthetic: false,
    corroboratingHotspotsCount: 1,
    notes: 'Isolated low-confidence detection. Close to village boundary road.',
  }),
  createIncident({
    incidentId: 'TATR-2026-086',
    title: 'Historical Active Fire Pass (48h Audit Record)',
    latitude: 20.4120,
    longitude: 79.3240,
    source: 'VIIRS_NOAA20',
    satellite: 'NOAA-20',
    instrument: 'VIIRS (375m)',
    confidence: 'nominal',
    confidencePercent: 72,
    frp: 11.0,
    brightness: 356.0,
    brightT31: 295.0,
    daynight: 'D',
    hoursAgo: 44.0,
    isSynthetic: false,
    verificationStatus: 'verified_fire',
    corroboratingHotspotsCount: 1,
    notes: 'Historical record for trend analysis. Extinguished by Quick Response Team on Day 2.',
  }),
  createIncident({
    incidentId: 'TEST-SYNTHETIC-901',
    title: '[SYNTHETIC BENCHMARK] Simulated High Intensity Core Blaze',
    latitude: 20.3650,
    longitude: 79.3890,
    source: 'SYNTHETIC_TEST',
    satellite: 'VIIRS_SIMULATED',
    instrument: 'BENCHMARK_SIM',
    confidence: 'high',
    confidencePercent: 99,
    frp: 45.0,
    brightness: 385.2,
    brightT31: 310.0,
    daynight: 'N',
    hoursAgo: 0.5,
    isSynthetic: true,
    corroboratingHotspotsCount: 4,
    notes: 'LABELED SYNTHETIC DATA: Created for emergency drill dispatch testing near Tadoba core lake.',
  }),
  createIncident({
    incidentId: 'TEST-SYNTHETIC-902',
    title: '[SYNTHETIC BENCHMARK] Brick Kiln Thermal Illusion Test Case',
    latitude: 20.0920,
    longitude: 79.3140,
    source: 'SYNTHETIC_TEST',
    satellite: 'VIIRS_SIMULATED',
    instrument: 'BENCHMARK_SIM',
    confidence: 'nominal',
    confidencePercent: 62,
    frp: 7.8,
    brightness: 341.4,
    brightT31: 295.0,
    daynight: 'N',
    hoursAgo: 2.1,
    isSynthetic: true,
    verificationStatus: 'possible_false_alarm',
    corroboratingHotspotsCount: 1,
    notes: 'LABELED SYNTHETIC DATA: Simulates an industrial brick kiln near Ballarpur-Chandrapur coal & kiln belt.',
  }),
];
