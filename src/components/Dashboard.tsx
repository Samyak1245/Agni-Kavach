import React, { useState } from 'react';
import { Incident, PriorityLevel, VerificationStatus } from '../types/incident.ts';
import {
  Flame,
  Navigation,
  CheckCircle,
  AlertOctagon,
  HelpCircle,
  Clock,
  MapPin,
  Satellite,
  Info,
  Search,
  Copy,
  Check,
  ChevronRight,
  ShieldCheck,
  Eye,
  SlidersHorizontal,
} from 'lucide-react';

interface DashboardProps {
  incidents: Incident[];
  onSelectIncidentForMap: (incident: Incident) => void;
  onOpenVerifyModal: (incident: Incident) => void;
  loading: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  incidents,
  onSelectIncidentForMap,
  onOpenVerifyModal,
  loading,
}) => {
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [zoneFilter, setZoneFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Compute counts
  const totalCount = incidents.length;
  const p1Count = incidents.filter(i => i.priority === 'P1').length;
  const p2Count = incidents.filter(i => i.priority === 'P2').length;
  const pendingCount = incidents.filter(i => i.verificationStatus === 'unverified').length;
  const verifiedCount = incidents.filter(i => i.verificationStatus === 'verified_fire').length;
  const falseAlarmCount = incidents.filter(i => i.verificationStatus === 'possible_false_alarm').length;

  // Filter incidents
  const filtered = incidents.filter(i => {
    if (priorityFilter !== 'ALL' && i.priority !== priorityFilter) return false;
    if (zoneFilter !== 'ALL' && !i.zone.toLowerCase().includes(zoneFilter.toLowerCase())) return false;
    if (statusFilter !== 'ALL' && i.verificationStatus !== statusFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const match =
        i.incidentId.toLowerCase().includes(q) ||
        i.title.toLowerCase().includes(q) ||
        i.nearestRangerGate.gateName.toLowerCase().includes(q) ||
        i.satellite.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const handleCopyCoords = (lat: number, lon: number, id: string) => {
    navigator.clipboard.writeText(`${lat}, ${lon}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getPriorityBadge = (priority: PriorityLevel) => {
    switch (priority) {
      case 'P1':
        return {
          bg: 'bg-red-950/90 text-red-300 border-red-700/80 ring-1 ring-red-500/40',
          label: 'P1 Urgent Review',
          dot: 'bg-red-500 animate-pulse',
        };
      case 'P2':
        return {
          bg: 'bg-amber-950/80 text-amber-300 border-amber-700/80',
          label: 'P2 High Priority',
          dot: 'bg-amber-400',
        };
      case 'P3':
        return {
          bg: 'bg-yellow-950/70 text-yellow-300 border-yellow-700/60',
          label: 'P3 Needs Verification',
          dot: 'bg-yellow-400',
        };
      case 'P4':
      default:
        return {
          bg: 'bg-slate-800 text-slate-300 border-slate-700',
          label: 'P4 Stale / Low Urgency',
          dot: 'bg-slate-400',
        };
    }
  };

  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case 'verified_fire':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-red-900/40 text-red-400 border border-red-700/60">
            <Flame className="w-3 h-3 text-red-500" /> Fire Verified
          </span>
        );
      case 'possible_false_alarm':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-900/40 text-emerald-400 border border-emerald-700/60">
            <CheckCircle className="w-3 h-3 text-emerald-400" /> False Alarm
          </span>
        );
      case 'escalated':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-amber-900/40 text-amber-400 border border-amber-700/60">
            <AlertOctagon className="w-3 h-3 text-amber-400" /> Escalated
          </span>
        );
      case 'unverified':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            <HelpCircle className="w-3 h-3 text-slate-400" /> Unverified
          </span>
        );
    }
  };

  const formatHoursAgo = (isoString: string) => {
    const diffHours = (Date.now() - new Date(isoString).getTime()) / (1000 * 60 * 60);
    if (diffHours < 1) {
      const mins = Math.max(1, Math.round(diffHours * 60));
      return `${mins}m ago`;
    }
    if (diffHours < 24) {
      return `${Math.round(diffHours * 10) / 10}h ago`;
    }
    const days = Math.round(diffHours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 shadow-sm">
          <div className="text-xs font-medium text-slate-400">Total Hotspots</div>
          <div className="text-2xl font-bold text-white mt-1">{totalCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Active TATR log</div>
        </div>

        <div className="bg-red-950/40 border border-red-900/60 rounded-lg p-3.5 shadow-sm">
          <div className="text-xs font-medium text-red-300">P1 Urgent Review</div>
          <div className="text-2xl font-bold text-red-400 mt-1">{p1Count}</div>
          <div className="text-[11px] text-red-400/80 mt-0.5">Immediate assessment</div>
        </div>

        <div className="bg-amber-950/40 border border-amber-900/60 rounded-lg p-3.5 shadow-sm">
          <div className="text-xs font-medium text-amber-300">P2 High Priority</div>
          <div className="text-2xl font-bold text-amber-400 mt-1">{p2Count}</div>
          <div className="text-[11px] text-amber-400/80 mt-0.5">Recent significant</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 shadow-sm">
          <div className="text-xs font-medium text-slate-400">Awaiting Verification</div>
          <div className="text-2xl font-bold text-amber-200 mt-1">{pendingCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Needs ranger review</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 shadow-sm">
          <div className="text-xs font-medium text-slate-400">Fire Verified</div>
          <div className="text-2xl font-bold text-red-300 mt-1">{verifiedCount}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Strike team active</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-3.5 shadow-sm">
          <div className="text-xs font-medium text-slate-400">False Alarms</div>
          <div className="text-2xl font-bold text-emerald-400 mt-1">{falseAlarmCount}</div>
          <div className="text-[11px] text-emerald-500/80 mt-0.5">Documented & cleared</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by Incident ID, Range name, Gate, or Satellite..."
              className="w-full bg-slate-950 border border-slate-800 rounded-md pl-9 pr-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500 transition"
            />
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mr-1">
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
              <span>Filters:</span>
            </div>

            {/* Priority Select */}
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Priorities</option>
              <option value="P1">P1 Urgent Review</option>
              <option value="P2">P2 High Priority</option>
              <option value="P3">P3 Needs Verification</option>
              <option value="P4">P4 Stale / Low Urgency</option>
            </select>

            {/* Zone Select */}
            <select
              value={zoneFilter}
              onChange={e => setZoneFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Zones</option>
              <option value="Core">Core Zone</option>
              <option value="Buffer">Buffer Zone</option>
              <option value="Boundary">Reserve Boundary</option>
            </select>

            {/* Status Select */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Verification Statuses</option>
              <option value="unverified">Unverified Only</option>
              <option value="verified_fire">Verified Fire</option>
              <option value="possible_false_alarm">False Alarms</option>
              <option value="escalated">Escalated</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Alert List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-400 px-1">
          <span>
            Showing <strong className="text-slate-200">{filtered.length}</strong> of{' '}
            <strong className="text-slate-200">{totalCount}</strong> incidents sorted by priority
          </span>
          <span className="text-[11px] text-slate-500">
            A FIRMS hotspot is a potential thermal anomaly requiring ground/scout validation
          </span>
        </div>

        {loading ? (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-12 text-center text-slate-400">
            <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full mx-auto mb-3" />
            Loading satellite observations...
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-12 text-center text-slate-400">
            <Info className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <p className="font-medium text-slate-300">No incidents match the active filters.</p>
            <p className="text-xs text-slate-500 mt-1">Try resetting your filters or search term.</p>
          </div>
        ) : (
          filtered.map(incident => {
            const badge = getPriorityBadge(incident.priority);
            const isCopied = copiedId === incident.incidentId;

            return (
              <div
                key={incident._id}
                className={`bg-slate-900/90 border rounded-lg p-4 transition hover:border-slate-700 shadow-sm ${
                  incident.priority === 'P1'
                    ? 'border-red-900/80 bg-gradient-to-r from-red-950/20 to-slate-900'
                    : incident.priority === 'P2'
                    ? 'border-amber-900/50'
                    : 'border-slate-800'
                }`}
              >
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  {/* Left Column: ID, Priority, Title, Explanation */}
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Priority Tag */}
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold border ${badge.bg}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                        {badge.label}
                      </span>

                      {/* Status */}
                      {getStatusBadge(incident.verificationStatus)}

                      {/* Observation Age */}
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        {formatHoursAgo(incident.timestamp)}
                        <span className="text-slate-600">({incident.acqDate} {incident.acqTime} UTC)</span>
                      </span>
                    </div>

                    {/* Title */}
                    <h3 className="text-sm sm:text-base font-semibold text-slate-100 flex items-center gap-2">
                      {incident.title}
                    </h3>

                    {/* Priority Explanation */}
                    {/* <div className="flex items-start gap-1.5 text-xs text-amber-200/90 bg-amber-950/30 border border-amber-900/40 rounded px-2.5 py-1.5">
                      <Info className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span>{incident.priorityExplanation}</span>
                    </div> */}

                    {/* Telemetry Chips */}
                    <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-slate-400 pt-1">
                      {/* Coordinates */}
                      <button
                        onClick={() => handleCopyCoords(incident.latitude, incident.longitude, incident.incidentId)}
                        className="inline-flex items-center gap-1 hover:text-slate-200 transition text-slate-300 font-mono"
                        title="Click to copy coordinates"
                      >
                        <MapPin className="w-3.5 h-3.5 text-amber-400" />
                        <span>{incident.latitude.toFixed(4)}°N, {incident.longitude.toFixed(4)}°E</span>
                        {isCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-slate-500" />}
                      </button>

                      {/* Zone */}
                      <span className="text-slate-500">|</span>
                      <span className="text-slate-300">
                        Zone: <strong className={incident.zone === 'Core Zone' ? 'text-red-400' : 'text-amber-400'}>{incident.zone}</strong>
                      </span>

                      {/* Nearest Gate */}
                      <span className="text-slate-500">|</span>
                      <span>
                        Nearest Gate: <strong className="text-slate-200">{incident.nearestRangerGate.gateName.split('(')[0]}</strong> ({incident.nearestRangerGate.distanceKm} km)
                      </span>

                      {/* Satellite Source & Instrument */}
                      <span className="text-slate-500">|</span>
                      <span className="inline-flex items-center gap-1 text-slate-300">
                        <Satellite className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{incident.satellite} {incident.instrument}</span>
                      </span>

                      {/* Thermal Power */}
                      <span className="text-slate-500">|</span>
                      <span>
                        FRP: <strong className="text-amber-400 font-mono">{incident.frp} MW</strong>
                      </span>

                      {/* Brightness */}
                      <span className="text-slate-500">|</span>
                      <span>
                        Temp: <strong className="text-slate-200 font-mono">{(incident.brightness - 273.15).toFixed(2)} °C</strong>
                      </span>

                      {/* Confidence */}
                      <span className="text-slate-500">|</span>
                      <span>
                        Confidence: <strong className="text-emerald-400">{incident.confidencePercent}%</strong>
                      </span>
                    </div>

                    {/* False alarm reason if present */}
                    {incident.verificationStatus === 'possible_false_alarm' && incident.verificationDecision && (
                      <div className="text-xs bg-emerald-950/40 border border-emerald-800/50 rounded p-2 text-emerald-300">
                        <strong>False Alarm Classified:</strong> {incident.verificationDecision.reasonLabel || incident.verificationDecision.reason}
                        {incident.verificationDecision.customNotes && (
                          <span className="block text-slate-400 mt-0.5">Notes: {incident.verificationDecision.customNotes}</span>
                        )}
                        <span className="block text-[11px] text-slate-500 mt-0.5">
                          Reviewed by {incident.verificationDecision.reviewerName} ({incident.verificationDecision.reviewerRole}) on {new Date(incident.verificationDecision.reviewedAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Actions */}
                  <div className="flex flex-row lg:flex-col items-center lg:items-end gap-2 w-full lg:w-auto shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                    {/* View Alert / Navigate Button */}
                    <button
                      onClick={() => onSelectIncidentForMap(incident)}
                      className="flex-1 lg:flex-initial flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-amber-600 hover:bg-amber-500 text-white font-medium text-xs sm:text-sm shadow-md transition"
                    >
                      <Navigation className="w-4 h-4" />
                      <span>View Alert / Navigate</span>
                      <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                    </button>

                    {/* Verify Signal Button */}
                    <button
                      onClick={() => onOpenVerifyModal(incident)}
                      className="flex-1 lg:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-xs transition"
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Verify Signal</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
