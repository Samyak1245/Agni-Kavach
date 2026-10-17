import { Incident } from '../types/incident.ts';
import { TATR_BOUNDS } from '../data/tatrBoundary.ts';
import { classifyTATRZone, findNearestRangerGate, isValidCoordinate } from '../utils/geo.ts';
import { calculateIncidentPriority } from '../utils/triage.ts';

export interface CSVParseResult {
  totalRows: number;
  withinTatrCount: number;
  outOfBoundsCount: number;
  duplicatesSkipped: number;
  incidentsCreated: Incident[];
  errors: string[];
}

/**
 * Normalizes and ingests raw CSV lines (VIIRS / MODIS format).
 * Header expected: latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight
 */
export function parseFirmsOrKaggleCSV(csvText: string, existingIncidents: Incident[]): CSVParseResult {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) {
    return {
      totalRows: 0,
      withinTatrCount: 0,
      outOfBoundsCount: 0,
      duplicatesSkipped: 0,
      incidentsCreated: [],
      errors: ['CSV file is empty or missing headers.'],
    };
  }

  const headerLine = lines[0].toLowerCase();
  const headers = headerLine.split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
  
  const latIdx = headers.findIndex(h => h.includes('lat'));
  const lonIdx = headers.findIndex(h => h.includes('lon'));
  const frpIdx = headers.findIndex(h => h === 'frp' || h.includes('power'));
  const brightIdx = headers.findIndex(h => h.includes('bright_ti4') || h.includes('brightness') || h.includes('bright_t31'));
  const confIdx = headers.findIndex(h => h.includes('conf'));
  const dateIdx = headers.findIndex(h => h.includes('date') || h.includes('acq_date'));
  const timeIdx = headers.findIndex(h => h.includes('time') || h.includes('acq_time'));
  const satIdx = headers.findIndex(h => h.includes('sat'));
  const daynightIdx = headers.findIndex(h => h.includes('daynight') || h.includes('day_night'));

  if (latIdx === -1 || lonIdx === -1) {
    return {
      totalRows: lines.length - 1,
      withinTatrCount: 0,
      outOfBoundsCount: 0,
      duplicatesSkipped: 0,
      incidentsCreated: [],
      errors: ['Required columns "latitude" and "longitude" were not found in CSV header.'],
    };
  }

  const created: Incident[] = [];
  const errors: string[] = [];
  let withinTatrCount = 0;
  let outOfBoundsCount = 0;
  let duplicatesSkipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const row = lines[i].split(',').map(col => col.trim().replace(/^["']|["']$/g, ''));
    if (row.length < 2) continue;

    const lat = parseFloat(row[latIdx]);
    const lon = parseFloat(row[lonIdx]);

    if (!isValidCoordinate(lat, lon)) {
      errors.push(`Row ${i}: Invalid coordinates (${row[latIdx]}, ${row[lonIdx]})`);
      continue;
    }

    // Check TATR bounds filter (with a small buffer margin ~0.1 deg)
    const inTATR =
      lat >= TATR_BOUNDS.minLat - 0.1 &&
      lat <= TATR_BOUNDS.maxLat + 0.1 &&
      lon >= TATR_BOUNDS.minLon - 0.1 &&
      lon <= TATR_BOUNDS.maxLon + 0.1;

    if (!inTATR) {
      outOfBoundsCount++;
      continue;
    }

    withinTatrCount++;

    // Parse attributes with safe defaults
    const frp = frpIdx !== -1 && !isNaN(parseFloat(row[frpIdx])) ? parseFloat(row[frpIdx]) : 5.0;
    const brightness = brightIdx !== -1 && !isNaN(parseFloat(row[brightIdx])) ? parseFloat(row[brightIdx]) : 320.0;
    const rawConf = confIdx !== -1 ? row[confIdx] : 'nominal';
    const acqDate = dateIdx !== -1 && row[dateIdx] ? row[dateIdx] : new Date().toISOString().split('T')[0];
    const acqTime = timeIdx !== -1 && row[timeIdx] ? row[timeIdx].padStart(4, '0') : '1200';
    const satellite = satIdx !== -1 && row[satIdx] ? row[satIdx] : 'NOAA-20';
    const daynight = daynightIdx !== -1 && row[daynightIdx]?.toUpperCase() === 'N' ? 'N' : 'D';

    // Confidence normalization
    let confidencePercent = 60;
    let confidenceEnum: Incident['confidence'] = 'nominal';
    if (!isNaN(parseFloat(rawConf))) {
      confidencePercent = Math.min(100, Math.max(0, parseFloat(rawConf)));
      confidenceEnum = confidencePercent >= 80 ? 'high' : confidencePercent >= 50 ? 'nominal' : 'low';
    } else {
      const lower = String(rawConf).toLowerCase();
      if (lower.includes('h') || lower.includes('high')) {
        confidenceEnum = 'high';
        confidencePercent = 85;
      } else if (lower.includes('l') || lower.includes('low')) {
        confidenceEnum = 'low';
        confidencePercent = 40;
      } else {
        confidenceEnum = 'nominal';
        confidencePercent = 65;
      }
    }

    // Check duplicate by spatial tolerance (~0.005 deg is ~500m) and timestamp
    const isDuplicate = existingIncidents.some(
      ex =>
        Math.abs(ex.latitude - lat) < 0.005 &&
        Math.abs(ex.longitude - lon) < 0.005 &&
        ex.acqDate === acqDate
    );

    if (isDuplicate) {
      duplicatesSkipped++;
      continue;
    }

    const zone = classifyTATRZone(lat, lon);
    const nearestGate = findNearestRangerGate(lat, lon);
    
    // Parse timestamp
    let isoTimestamp = new Date().toISOString();
    try {
      const hours = parseInt(acqTime.slice(0, 2), 10) || 0;
      const minutes = parseInt(acqTime.slice(2, 4), 10) || 0;
      const d = new Date(`${acqDate}T00:00:00.000Z`);
      d.setUTCHours(hours, minutes);
      isoTimestamp = d.toISOString();
    } catch {
      // Keep fallback ISO
    }

    const hoursAgo = Math.max(0.1, (Date.now() - new Date(isoTimestamp).getTime()) / (1000 * 60 * 60));

    const triage = calculateIncidentPriority({
      frp,
      confidencePercent,
      zone,
      hoursSinceObservation: hoursAgo,
      isNight: daynight === 'N',
    });

    const incId = `TATR-CSV-${String(existingIncidents.length + created.length + 1).padStart(3, '0')}`;

    created.push({
      _id: `inc_${incId.toLowerCase()}`,
      incidentId: incId,
      title: `Observation in ${zone} near ${nearestGate.gateName.split('(')[0].trim()}`,
      latitude: Math.round(lat * 10000) / 10000,
      longitude: Math.round(lon * 10000) / 10000,
      source: 'CSV_INGEST',
      satellite,
      instrument: 'VIIRS/MODIS',
      confidence: confidenceEnum,
      confidencePercent,
      frp: Math.round(frp * 10) / 10,
      brightness: Math.round(brightness * 10) / 10,
      daynight,
      acqDate,
      acqTime,
      timestamp: isoTimestamp,
      priority: triage.priority,
      priorityScore: triage.score,
      priorityExplanation: triage.explanation,
      zone,
      nearestRangerGate: nearestGate,
      verificationStatus: 'unverified',
      auditHistory: [
        {
          action: 'CSV_DATASET_INGESTION',
          user: 'DATA_INGEST_OPERATOR',
          timestamp: new Date().toISOString(),
          details: `Ingested from CSV dataset. Row ${i}.`,
        },
      ],
      isSynthetic: false,
      notes: `Ingested via CSV uploader. Satellite: ${satellite}, Time: ${acqDate} ${acqTime} UTC.`,
    });
  }

  return {
    totalRows: lines.length - 1,
    withinTatrCount,
    outOfBoundsCount,
    duplicatesSkipped,
    incidentsCreated: created,
    errors,
  };
}

/**
 * NASA FIRMS API sync helper
 */
export async function queryNASA_FIRMS(apiKey?: string): Promise<{
  success: boolean;
  message: string;
  count: number;
  isSimulated: boolean;
}> {
  const key = apiKey || process.env.FIRMS_MAP_KEY;
  if (!key || key === 'your_firms_map_key') {
    return {
      success: true,
      message: 'No NASA FIRMS API Map Key configured. Operating in calibrated Tadoba archive & test observation mode.',
      count: 0,
      isSimulated: true,
    };
  }

  try {
    // NASA FIRMS area bounding box format: minLon,minLat,maxLon,maxLat
    // For Tadoba: 79.20,20.08,79.72,20.55
    const area = `${TATR_BOUNDS.minLon},${TATR_BOUNDS.minLat},${TATR_BOUNDS.maxLon},${TATR_BOUNDS.maxLat}`;
    const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/VIIRS_NOAA20_NRT/${area}/1`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!resp.ok) {
      return {
        success: false,
        message: `NASA FIRMS HTTP ${resp.status}: ${resp.statusText}`,
        count: 0,
        isSimulated: false,
      };
    }

    const text = await resp.text();
    return {
      success: true,
      message: 'Successfully polled NASA FIRMS live satellite pass for Tadoba-Andhari.',
      count: text.split('\n').length - 1,
      isSimulated: false,
    };
  } catch (err) {
    return {
      success: false,
      message: `NASA FIRMS connection error: ${(err as Error).message}`,
      count: 0,
      isSimulated: true,
    };
  }
}
