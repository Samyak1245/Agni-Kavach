import { RouteResponse } from '../types/incident.ts';
import { calculateHaversineDistanceKm } from '../utils/geo.ts';

const SAFETY_DISCLAIMER =
  'OPERATIONAL ADVISORY: This route is a navigation aid calculated from public road networks. Unpaved tiger reserve firelines, locked forest barrier gates, seasonal monsoon washouts, and wildlife corridor night curfews are NOT accounted for. All forest department personnel and strike forces must follow official range SOPs and authorized checkpost clearances.';

export async function calculateRoute(
  startLat: number,
  startLon: number,
  endLat: number,
  endLon: number
): Promise<RouteResponse> {
  const straightLineDist = calculateHaversineDistanceKm(startLat, startLon, endLat, endLon);

  try {
    // OSRM accepts coordinates in format: longitude,latitude
    const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${startLon},${startLat};${endLon},${endLat}?overview=full&geometries=geojson&steps=false`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const res = await fetch(osrmUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'AgniKavach-TATR-FireResponse/1.0',
      },
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
        const route = data.routes[0];
        const roadDistanceKm = Math.round((route.distance / 1000) * 10) / 10;
        const durationMinutes = Math.round(route.duration / 60);

        // OSRM GeoJSON coordinates are [lon, lat] -> convert to Leaflet [lat, lon]
        const leafletCoords: [number, number][] = route.geometry.coordinates.map(
          (pt: [number, number]) => [pt[1], pt[0]]
        );

        return {
          success: true,
          isRealRoadRoute: true,
          provider: 'OSRM',
          distanceKm: roadDistanceKm,
          durationMinutes,
          coordinates: leafletCoords,
          waypoints: {
            start: [startLat, startLon],
            end: [endLat, endLon],
          },
          disclaimer: SAFETY_DISCLAIMER,
        };
      }
    }
  } catch (err) {
    console.warn('OSRM routing request failed or timed out:', (err as Error).message);
  }

  // Fallback to straight-line navigation if road routing is unavailable or in deep off-road jungle
  return {
    success: true,
    isRealRoadRoute: false,
    provider: 'STRAIGHT_LINE_FALLBACK',
    distanceKm: straightLineDist,
    durationMinutes: 0, // Never fabricate travel time for off-road straight line
    coordinates: [
      [startLat, startLon],
      [endLat, endLon],
    ],
    waypoints: {
      start: [startLat, startLon],
      end: [endLat, endLon],
    },
    disclaimer: SAFETY_DISCLAIMER,
    warning:
      'Straight-line direct vector shown: Incident is situated off paved road network or routing server timed out. Driving duration is not estimated.',
  };
}
