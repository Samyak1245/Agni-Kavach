import { TATR_BOUNDS, TATR_CORE_POLYGON, TATR_BUFFER_POLYGON, TATR_RANGER_GATES } from '../data/tatrBoundary.ts';
import type { RangerGate } from '../types/incident.ts';

/**
 * Calculates straight line Haversine distance between two coordinates in kilometers.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Checks if a point [lat, lon] lies within a polygon using the Ray-Casting algorithm.
 */
export function isPointInPolygon(
  point: [number, number],
  polygon: [number, number][]
): boolean {
  const [lat, lon] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];

    const intersect =
      yi > lon !== yj > lon && lat < ((xj - xi) * (lon - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Classifies an incident coordinate into TATR operational zones.
 */
export function classifyTATRZone(
  lat: number,
  lon: number
): 'Core Zone' | 'Buffer Zone' | 'Reserve Boundary' | 'External Outskirts' {
  if (isPointInPolygon([lat, lon], TATR_CORE_POLYGON)) {
    return 'Core Zone';
  }
  if (isPointInPolygon([lat, lon], TATR_BUFFER_POLYGON)) {
    return 'Buffer Zone';
  }
  // Check if within the general bounding box
  if (
    lat >= TATR_BOUNDS.minLat &&
    lat <= TATR_BOUNDS.maxLat &&
    lon >= TATR_BOUNDS.minLon &&
    lon <= TATR_BOUNDS.maxLon
  ) {
    return 'Reserve Boundary';
  }
  return 'External Outskirts';
}

/**
 * Finds the nearest official ranger gate or checkpost to the target coordinates.
 */
export function findNearestRangerGate(
  lat: number,
  lon: number,
  gates: RangerGate[] = TATR_RANGER_GATES
): { gateId: string; gateName: string; distanceKm: number } {
  let nearest = gates[0];
  let minDistance = calculateHaversineDistanceKm(
    lat,
    lon,
    nearest.coordinates[0],
    nearest.coordinates[1]
  );

  for (let i = 1; i < gates.length; i++) {
    const gate = gates[i];
    const dist = calculateHaversineDistanceKm(
      lat,
      lon,
      gate.coordinates[0],
      gate.coordinates[1]
    );
    if (dist < minDistance) {
      minDistance = dist;
      nearest = gate;
    }
  }

  return {
    gateId: nearest.id,
    gateName: nearest.name,
    distanceKm: minDistance,
  };
}

/**
 * Validates latitude and longitude ranges.
 */
export function isValidCoordinate(lat: number, lon: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lon === 'number' &&
    !isNaN(lat) &&
    !isNaN(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180
  );
}
