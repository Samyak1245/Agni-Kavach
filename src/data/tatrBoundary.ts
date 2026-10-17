import type { RangerGate } from '../types/incident.ts';

// Tadoba-Andhari Tiger Reserve (TATR) Bounding Box & Coordinates
// Located in Chandrapur District, Maharashtra, India.
// Core Zone: ~625.82 km² | Buffer Zone: ~1,101.77 km² (~1,727 km² total)
export const TATR_BOUNDS = {
  minLat: 20.08,
  maxLat: 20.55,
  minLon: 79.20,
  maxLon: 79.72,
  center: [20.32, 79.44] as [number, number],
};

// Official TATR Ranger Gates & Forest Checkposts
export const TATR_RANGER_GATES: RangerGate[] = [
  {
    id: 'gate-moharli',
    name: 'Moharli Gate (South Core Entry / Range HQ)',
    type: 'core_gate',
    coordinates: [20.2450, 79.3175],
    description: 'Main tourism and protection range post. Quick access to Telia and Moharli lake zones.'
  },
  {
    id: 'gate-kolara',
    name: 'Kolara Gate (North Core Entry)',
    type: 'core_gate',
    coordinates: [20.4890, 79.3520],
    description: 'North core access checkpost. Guard station on Chimur-Warora route.'
  },
  {
    id: 'gate-navegaon',
    name: 'Navegaon Gate (North-East Core Entry)',
    type: 'core_gate',
    coordinates: [20.5120, 79.4350],
    description: 'North-East core entry and anti-poaching patrol base station.'
  },
  {
    id: 'gate-khutwanda',
    name: 'Khutwanda Gate (West Core Entry)',
    type: 'core_gate',
    coordinates: [20.3120, 79.2890],
    description: 'Direct western approach to Tadoba lake core meadows.'
  },
  {
    id: 'gate-pangdi',
    name: 'Pangdi Gate (South-East Buffer Entry)',
    type: 'buffer_gate',
    coordinates: [20.1250, 79.5280],
    description: 'Kolsa-Pangdi buffer protection post with watchtower.'
  },
  {
    id: 'gate-zari',
    name: 'Zari Gate (Buffer & Kolsa Entry)',
    type: 'buffer_gate',
    coordinates: [20.1860, 79.5930],
    description: 'Checkpost bordering human settlements and teak plantations.'
  },
  {
    id: 'hq-chandrapur',
    name: 'Chandrapur Forest Control HQ',
    type: 'hq',
    coordinates: [19.9530, 79.2960],
    description: 'Central Divisional Forest Office (DFO) and Emergency Incident Command.'
  }
];

// Simplified polygon for Core Zone (Tadoba National Park & Andhari Wildlife Sanctuary core)
export const TATR_CORE_POLYGON: [number, number][] = [
  [20.46, 79.31],
  [20.49, 79.37],
  [20.46, 79.46],
  [20.40, 79.53],
  [20.32, 79.52],
  [20.25, 79.48],
  [20.21, 79.41],
  [20.22, 79.32],
  [20.28, 79.28],
  [20.36, 79.27],
  [20.42, 79.28],
  [20.46, 79.31]
];

// Simplified polygon for Buffer Zone encompassing surrounding reserve forests
export const TATR_BUFFER_POLYGON: [number, number][] = [
  [20.53, 79.24],
  [20.55, 79.42],
  [20.52, 79.62],
  [20.41, 79.68],
  [20.24, 79.69],
  [20.10, 79.64],
  [20.08, 79.48],
  [20.12, 79.30],
  [20.20, 79.22],
  [20.38, 79.19],
  [20.48, 79.20],
  [20.53, 79.24]
];
