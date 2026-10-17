import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Incident, RouteResponse } from '../types/incident.ts';
import { TATR_BOUNDS, TATR_CORE_POLYGON, TATR_BUFFER_POLYGON, TATR_RANGER_GATES } from '../data/tatrBoundary.ts';
import {
  Navigation,
  MapPin,
  Compass,
  AlertTriangle,
  Clock,
  Flame,
  ShieldCheck,
  RotateCcw,
  Layers,
  ArrowRight,
  Info,
  Car,
  AlertOctagon,
  Copy,
  Check,
} from 'lucide-react';

interface TacticalMapProps {
  selectedIncident: Incident | null;
  allIncidents: Incident[];
  onSelectIncident: (inc: Incident) => void;
  onOpenVerifyModal: (inc: Incident) => void;
}

export const TacticalMap: React.FC<TacticalMapProps> = ({
  selectedIncident,
  allIncidents,
  onSelectIncident,
  onOpenVerifyModal,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);

  // Layer groups
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const boundaryLayerRef = useRef<L.LayerGroup | null>(null);

  // State
  const [userCoords, setUserCoords] = useState<[number, number] | null>(null);
  const [userLocationSource, setUserLocationSource] = useState<'actual' | 'simulated' | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState<boolean>(false);

  const [routeData, setRouteData] = useState<RouteResponse | null>(null);
  const [isRouting, setIsRouting] = useState<boolean>(false);
  const [routeError, setRouteError] = useState<string | null>(null);

  const [copiedCoords, setCopiedCoords] = useState(false);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return; // already created

    const map = L.map(mapContainerRef.current, {
      center: selectedIncident ? [selectedIncident.latitude, selectedIncident.longitude] : TATR_BOUNDS.center,
      zoom: selectedIncident ? 12 : 11,
      minZoom: 9,
      maxZoom: 18,
    });

    // High quality OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors | Agni Kavach TATR',
      maxZoom: 19,
    }).addTo(map);

    // Create Layer Groups
    const boundaryLayer = L.layerGroup().addTo(map);
    const markersLayer = L.layerGroup().addTo(map);
    const routeLayer = L.layerGroup().addTo(map);

    boundaryLayerRef.current = boundaryLayer;
    markersLayerRef.current = markersLayer;
    routeLayerRef.current = routeLayer;
    mapInstanceRef.current = map;

    // Draw TATR Boundaries
    // 1. Buffer Zone Polygon
    L.polygon(TATR_BUFFER_POLYGON, {
      color: '#eab308', // Amber
      weight: 2,
      dashArray: '6, 6',
      fillColor: '#ca8a04',
      fillOpacity: 0.08,
    })
      .bindTooltip('<strong>TATR Buffer Zone</strong><br/>1,101 km² Eco-sensitive forest belt', { sticky: true })
      .addTo(boundaryLayer);

    // 2. Core Zone Polygon
    L.polygon(TATR_CORE_POLYGON, {
      color: '#ef4444', // Red
      weight: 3,
      dashArray: '8, 4',
      fillColor: '#dc2626',
      fillOpacity: 0.14,
    })
      .bindTooltip('<strong>TATR Critical Core Zone</strong><br/>625 km² Protected Tiger Habitat (Strict Entry)', { sticky: true })
      .addTo(boundaryLayer);

    // 3. Official Ranger Gates
    TATR_RANGER_GATES.forEach(gate => {
      const gateIcon = L.divIcon({
        className: 'custom-gate-icon',
        html: `<div style="background-color: #1e293b; color: #38bdf8; border: 2px solid #38bdf8; border-radius: 6px; padding: 2px 5px; font-size: 10px; font-weight: bold; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.5);">🚪 ${gate.name.split('(')[0].trim()}</div>`,
        iconSize: [100, 20],
        iconAnchor: [50, 10],
      });

      L.marker(gate.coordinates, { icon: gateIcon })
        .bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; line-height: 1.4;">
            <strong style="color: #0369a1;">${gate.name}</strong><br/>
            <span>Type: ${gate.type.replace('_', ' ').toUpperCase()}</span><br/>
            <p style="margin: 4px 0 0 0; color: #475569;">${gate.description}</p>
            <div style="font-family: monospace; font-size: 11px; margin-top: 4px; color: #64748b;">
              [${gate.coordinates[0]}, ${gate.coordinates[1]}]
            </div>
          </div>
        `)
        .addTo(boundaryLayer);
    });

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers when incidents or selectedIncident changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    allIncidents.forEach(inc => {
      const isSelected = selectedIncident?._id === inc._id;

      // Color based on priority
      const markerColor =
        inc.priority === 'P1' ? '#ef4444' : inc.priority === 'P2' ? '#f59e0b' : inc.priority === 'P3' ? '#eab308' : '#94a3b8';

      const iconHtml = `
        <div style="position: relative; width: ${isSelected ? '36px' : '26px'}; height: ${isSelected ? '36px' : '26px'};">
          <div style="position: absolute; inset: 0; border-radius: 50%; background-color: ${markerColor}; opacity: ${isSelected ? '0.35' : '0.2'}; ${isSelected ? 'animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;' : ''}"></div>
          <div style="position: absolute; inset: 3px; border-radius: 50%; background-color: ${markerColor}; border: 2px solid #ffffff; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5);">
            <span style="font-size: ${isSelected ? '16px' : '12px'};">🔥</span>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'incident-marker-icon',
        html: iconHtml,
        iconSize: [isSelected ? 36 : 26, isSelected ? 36 : 26],
        iconAnchor: [isSelected ? 18 : 13, isSelected ? 18 : 13],
      });

      const marker = L.marker([inc.latitude, inc.longitude], { icon: customIcon });

      marker.bindPopup(`
        <div style="font-family: sans-serif; font-size: 12px; min-width: 200px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
            <strong style="color: ${markerColor};">${inc.priority} Alert</strong>
            <span style="font-family: monospace; font-size: 10px; background: #f1f5f9; padding: 1px 4px; border-radius: 3px;">${inc.incidentId}</span>
          </div>
          <div style="font-weight: 600; margin-bottom: 4px;">${inc.title}</div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 6px;">
            FRP: <strong>${inc.frp} MW</strong> | Temp: <strong>${(inc.brightness - 273.15).toFixed(2)} °C</strong><br/>
            Confidence: <strong>${inc.confidencePercent}%</strong> | Zone: <strong>${inc.zone}</strong><br/>
            Source: <strong>${inc.satellite} ${inc.instrument}</strong>
          </div>
          <button id="btn-select-${inc._id}" style="width: 100%; background-color: #d97706; color: white; border: none; border-radius: 4px; padding: 4px 8px; font-size: 11px; cursor: pointer; font-weight: bold;">
            Select for Navigation & Route
          </button>
        </div>
      `);

      marker.on('popupopen', () => {
        const btn = document.getElementById(`btn-select-${inc._id}`);
        if (btn) {
          btn.onclick = () => onSelectIncident(inc);
        }
      });

      marker.addTo(markersLayer);
    });

    // Pan to selected incident
    if (selectedIncident) {
      map.setView([selectedIncident.latitude, selectedIncident.longitude], 12, { animate: true });
    }
  }, [allIncidents, selectedIncident]);

  // Handle User Location Marker
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    // Check if user marker exists, or re-render
    const existingUserMarker = (map as any)._userLocationMarker;
    if (existingUserMarker) {
      markersLayer.removeLayer(existingUserMarker);
      (map as any)._userLocationMarker = null;
    }

    if (userCoords) {
      const userIcon = L.divIcon({
        className: 'user-location-icon',
        html: `
          <div style="position: relative; width: 32px; height: 32px;">
            <div style="position: absolute; inset: 0; border-radius: 50%; background-color: #38bdf8; opacity: 0.4; animation: ping 1.8s infinite;"></div>
            <div style="position: absolute; inset: 4px; border-radius: 50%; background-color: #0284c7; border: 3px solid #ffffff; box-shadow: 0 4px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center; color: white; font-size: 12px;">
              📍
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });

      const userMarker = L.marker(userCoords, { icon: userIcon, zIndexOffset: 1000 })
        .bindTooltip(
          `<strong>${userLocationSource === 'actual' ? 'My Current Location' : 'Ranger Simulated Post'}</strong><br/>${userCoords[0].toFixed(4)}, ${userCoords[1].toFixed(4)}`,
          { permanent: true, direction: 'top', offset: [0, -16] }
        )
        .addTo(markersLayer);

      (map as any)._userLocationMarker = userMarker;
    }
  }, [userCoords, userLocationSource]);

  // Request Route when both User and Incident Coordinates exist
  const fetchRoute = async (start: [number, number], end: [number, number]) => {
    setIsRouting(true);
    setRouteError(null);

    try {
      const response = await fetch('/api/routes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startLat: start[0],
          startLon: start[1],
          endLat: end[0],
          endLon: end[1],
        }),
      });

      if (!response.ok) {
        throw new Error(`Routing server error: HTTP ${response.status}`);
      }

      const data: RouteResponse = await response.json();
      setRouteData(data);

      // Render polyline on map
      const map = mapInstanceRef.current;
      const routeLayer = routeLayerRef.current;
      if (map && routeLayer) {
        routeLayer.clearLayers();

        const polylineColor = data.isRealRoadRoute ? '#0284c7' : '#f59e0b';
        const polylineDash = data.isRealRoadRoute ? undefined : '8, 8';

        const line = L.polyline(data.coordinates, {
          color: polylineColor,
          weight: 5,
          opacity: 0.9,
          dashArray: polylineDash,
        }).addTo(routeLayer);

        // Fit map bounds to show full route
        map.fitBounds(line.getBounds(), { padding: [50, 50] });
      }
    } catch (err) {
      setRouteError((err as Error).message);
    } finally {
      setIsRouting(false);
    }
  };

  // Browser Geolocation handler (Requirement 4.C)
  const handleUseCurrentLocation = () => {
    setLocationError(null);
    setIsLocating(true);

    if (!navigator.geolocation) {
      setLocationError('Browser Geolocation is not supported by your current browser.');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      position => {
        const coords: [number, number] = [position.coords.latitude, position.coords.longitude];
        setUserCoords(coords);
        setUserLocationSource('actual');
        setIsLocating(false);

        if (selectedIncident) {
          fetchRoute(coords, [selectedIncident.latitude, selectedIncident.longitude]);
        }
      },
      error => {
        setIsLocating(false);
        let msg = 'Could not retrieve your location.';
        switch (error.code) {
          case error.PERMISSION_DENIED:
            msg = 'Location permission was denied. Please allow location access in your browser settings to calculate routes from your real location.';
            break;
          case error.POSITION_UNAVAILABLE:
            msg = 'Location information is unavailable from your device or network fix.';
            break;
          case error.TIMEOUT:
            msg = 'Location request timed out. Please retry.';
            break;
        }
        setLocationError(msg);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  };

  // Quick simulation option for evaluators outside Maharashtra
  const handleSimulateAtMoharli = () => {
    setLocationError(null);
    const moharliCoords: [number, number] = [20.2450, 79.3175];
    setUserCoords(moharliCoords);
    setUserLocationSource('simulated');

    if (selectedIncident) {
      fetchRoute(moharliCoords, [selectedIncident.latitude, selectedIncident.longitude]);
    }
  };

  const handleSimulateAtChandrapurHQ = () => {
    setLocationError(null);
    const hqCoords: [number, number] = [19.9530, 79.2960];
    setUserCoords(hqCoords);
    setUserLocationSource('simulated');

    if (selectedIncident) {
      fetchRoute(hqCoords, [selectedIncident.latitude, selectedIncident.longitude]);
    }
  };

  const handleClearRoute = () => {
    setUserCoords(null);
    setRouteData(null);
    setRouteError(null);
    if (routeLayerRef.current) {
      routeLayerRef.current.clearLayers();
    }
  };

  const copyIncidentCoords = () => {
    if (!selectedIncident) return;
    navigator.clipboard.writeText(`${selectedIncident.latitude}, ${selectedIncident.longitude}`);
    setCopiedCoords(true);
    setTimeout(() => setCopiedCoords(false), 2000);
  };

  return (
    <div className="space-y-4">
      {/* Tactical Control Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          {/* Active Target Header */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
                Active Tactical Incident
              </span>
              {selectedIncident ? (
                <span
                  className={`text-xs px-2 py-0.5 rounded font-bold ${
                    selectedIncident.priority === 'P1'
                      ? 'bg-red-950 text-red-300 border border-red-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}
                >
                  {selectedIncident.priority} - {selectedIncident.incidentId}
                </span>
              ) : (
                <span className="text-xs text-slate-500">None selected</span>
              )}
            </div>

            <div className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              {selectedIncident ? selectedIncident.title : 'Select an incident from the list or map'}
            </div>

            {selectedIncident && (
              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 font-mono">
                <button
                  onClick={copyIncidentCoords}
                  className="flex items-center gap-1 hover:text-slate-200 transition"
                >
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>
                    {selectedIncident.latitude.toFixed(4)}°N, {selectedIncident.longitude.toFixed(4)}°E
                  </span>
                  {copiedCoords ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-500" />}
                </button>
                <span>|</span>
                <span>Zone: <strong className="text-slate-200">{selectedIncident.zone}</strong></span>
                <span>|</span>
                <span>FRP: <strong className="text-amber-400">{selectedIncident.frp} MW</strong></span>
                <span>|</span>
                <span>Nearest Gate: <strong className="text-slate-200">{selectedIncident.nearestRangerGate.gateName.split('(')[0]}</strong></span>
              </div>
            )}
          </div>

          {/* Action Buttons: Geolocation & Simulators */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Real Browser Geolocation Button (Requirement 4.C) */}
            <button
              onClick={handleUseCurrentLocation}
              disabled={isLocating || !selectedIncident}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-xs sm:text-sm shadow-md transition"
              title="Obtain actual device coordinates via Browser Geolocation API"
            >
              <Navigation className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
              <span>{isLocating ? 'Obtaining Fix...' : 'Use My Current Location'}</span>
            </button>

            {/* Quick evaluator simulated positions */}
            <div className="hidden sm:flex items-center border-l border-slate-700 pl-2 gap-1.5">
              <span className="text-[11px] text-slate-500">Simulate:</span>
              <button
                onClick={handleSimulateAtMoharli}
                disabled={!selectedIncident}
                className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition"
                title="Simulate route origin stationed at Moharli Gate"
              >
                Moharli Gate
              </button>
              <button
                onClick={handleSimulateAtChandrapurHQ}
                disabled={!selectedIncident}
                className="px-2.5 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition"
                title="Simulate route origin at Chandrapur District Forest HQ"
              >
                Chandrapur HQ
              </button>
            </div>

            {/* Clear Route */}
            {userCoords && (
              <button
                onClick={handleClearRoute}
                className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition"
                title="Clear route"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}

            {/* Verify Signal Trigger */}
            {selectedIncident && (
              <button
                onClick={() => onOpenVerifyModal(selectedIncident)}
                className="flex items-center gap-1.5 px-3 py-2 rounded bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-600/50 text-xs font-semibold transition"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Verify Signal</span>
              </button>
            )}
          </div>
        </div>

        {/* Location Error Display */}
        {locationError && (
          <div className="mt-3 text-xs bg-red-950/80 border border-red-800/80 rounded p-2.5 text-red-200 flex items-start gap-2">
            <AlertOctagon className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong>Geolocation Notice:</strong> {locationError}
              <div className="text-[11px] text-red-300/80 mt-1">
                Tip: You can use the "Moharli Gate" or "Chandrapur HQ" simulator buttons above to preview road routing inside the reserve.
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Map + Sidebar Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Map Container */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-lg flex flex-col">
          {/* Map Surface */}
          <div className="relative w-full h-[520px] sm:h-[620px] z-10">
            <div ref={mapContainerRef} className="w-full h-full" />

            {/* Map Legends Overlay */}
            <div className="absolute top-3 right-3 z-[400] bg-slate-950/90 backdrop-blur-sm border border-slate-800 p-2.5 rounded-md shadow-lg text-[11px] text-slate-300 space-y-1.5 max-w-[210px]">
              <div className="font-bold text-white flex items-center gap-1 border-b border-slate-800 pb-1">
                <Layers className="w-3.5 h-3.5 text-amber-400" />
                <span>TATR Sanctuary Layers</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm border-2 border-red-500 bg-red-900/30" />
                <span>Core Zone (Strict Habitat)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm border-2 border-yellow-500 bg-yellow-900/20" />
                <span>Buffer Zone (Eco-Belt)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs">🚪</span>
                <span>Ranger Gates & Outposts</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs">🔥</span>
                <span>Active Thermal Hotspots</span>
              </div>
              {userCoords && (
                <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                  <span>Ranger Origin / User</span>
                </div>
              )}
            </div>

            {/* Routing Loading Overlay */}
            {isRouting && (
              <div className="absolute inset-0 z-[500] bg-slate-950/40 backdrop-blur-[2px] flex items-center justify-center">
                <div className="bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 shadow-2xl flex items-center gap-3 text-slate-200 text-sm">
                  <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
                  <span>Calculating real road route via OSRM...</span>
                </div>
              </div>
            )}
          </div>

          {/* Operational Safety Disclaimer Banner (Requirement 4.E) */}
          <div className="bg-amber-950/40 border-t border-amber-900/50 p-3 text-xs text-amber-200/90 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-semibold text-amber-300">
                Field Operations & Navigation Safety Protocol:
              </div>
              <p className="text-[11px] leading-relaxed text-amber-200/80">
                Calculated routes are navigation aids based on public road geometries. Forest tracks, tiger movement corridors, monsoon stream washouts, and locked ranger barrier gates are NOT reflected in civilian routing engines. Field teams must confirm road passability with Range Forest Officers (RFO) and adhere to official tiger reserve safety SOPs.
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar: Route Details & Quick Incident Selector */}
        <div className="space-y-4">
          {/* Route Metrics HUD */}
          {routeData ? (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Car className="w-4 h-4 text-cyan-400" />
                  <span>Route Navigation</span>
                </h4>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                    routeData.isRealRoadRoute
                      ? 'bg-blue-950 text-blue-300 border border-blue-800'
                      : 'bg-amber-950 text-amber-300 border border-amber-800'
                  }`}
                >
                  {routeData.provider}
                </span>
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="bg-slate-950 rounded p-2.5 border border-slate-800">
                  <div className="text-[11px] text-slate-400">Road Distance</div>
                  <div className="text-xl font-bold text-white font-mono mt-0.5">
                    {routeData.distanceKm} <span className="text-xs text-slate-400 font-normal">km</span>
                  </div>
                </div>

                <div className="bg-slate-950 rounded p-2.5 border border-slate-800">
                  <div className="text-[11px] text-slate-400">Estimated Travel</div>
                  <div className="text-xl font-bold text-amber-400 font-mono mt-0.5">
                    {routeData.isRealRoadRoute ? (
                      <>
                        {routeData.durationMinutes} <span className="text-xs text-slate-400 font-normal">mins</span>
                      </>
                    ) : (
                      <span className="text-xs text-amber-300 font-normal">Off-road direct</span>
                    )}
                  </div>
                </div>
              </div>

              {routeData.warning && (
                <div className="text-[11px] bg-amber-950/50 border border-amber-900/60 rounded p-2 text-amber-300">
                  {routeData.warning}
                </div>
              )}

              <div className="text-[11px] text-slate-400 space-y-1 pt-1 border-t border-slate-800">
                <div>
                  Origin:{' '}
                  <strong className="text-slate-200">
                    {userLocationSource === 'actual' ? 'My Geolocation' : 'Simulated Gate'}
                  </strong>{' '}
                  ({userCoords?.[0].toFixed(3)}, {userCoords?.[1].toFixed(3)})
                </div>
                <div>
                  Destination:{' '}
                  <strong className="text-slate-200">{selectedIncident?.incidentId}</strong> (
                  {selectedIncident?.latitude.toFixed(3)}, {selectedIncident?.longitude.toFixed(3)})
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 text-center text-slate-400 space-y-2">
              <Navigation className="w-8 h-8 text-slate-500 mx-auto" />
              <div className="text-xs font-medium text-slate-300">No active navigation route</div>
              <p className="text-[11px] text-slate-500">
                Click <strong>"Use My Current Location"</strong> or select a gate above to calculate an actual driving route.
              </p>
            </div>
          )}

          {/* Quick Incidents Drawer */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-2">
            <div className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
              <span>Incidents ({allIncidents.length})</span>
              <span className="text-[10px] text-slate-500">Click to focus</span>
            </div>

            <div className="max-h-[300px] overflow-y-auto space-y-1.5 pr-1">
              {allIncidents.map(inc => {
                const isSelected = selectedIncident?._id === inc._id;
                return (
                  <button
                    key={inc._id}
                    onClick={() => {
                      onSelectIncident(inc);
                      if (userCoords) {
                        fetchRoute(userCoords, [inc.latitude, inc.longitude]);
                      }
                    }}
                    className={`w-full text-left p-2 rounded transition flex items-center justify-between text-xs border ${
                      isSelected
                        ? 'bg-amber-950/60 border-amber-600 text-white font-semibold'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="space-y-0.5 truncate pr-2">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            inc.priority === 'P1' ? 'bg-red-500' : inc.priority === 'P2' ? 'bg-amber-500' : 'bg-yellow-500'
                          }`}
                        />
                        <span className="font-mono font-bold">{inc.incidentId}</span>
                        <span className="text-[10px] text-slate-400 truncate">({inc.zone})</span>
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">{inc.title}</div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
