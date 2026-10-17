import React, { useState } from 'react';
import { Incident, FalseAlarmReason } from '../types/incident.ts';
import {
  X,
  ShieldCheck,
  AlertTriangle,
  Flame,
  CheckCircle,
  Clock,
  User,
  History,
  FileText,
  HelpCircle,
} from 'lucide-react';

interface VerificationModalProps {
  incident: Incident | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveDecision: (incidentId: string, payload: any) => Promise<void>;
}

const FALSE_ALARM_REASONS: { id: FalseAlarmReason; label: string; description: string }[] = [
  {
    id: 'agricultural_stubble_burning',
    label: 'Agricultural Stubble Burning',
    description: 'Post-harvest crop residue or stubble fire outside sanctuary buffer boundaries.',
  },
  {
    id: 'brick_kiln_industrial_flare',
    label: 'Brick Kiln / Industrial Thermal Flare',
    description: 'Continuous industrial heat source in Chandrapur-Ballarpur mining & coal/kiln belt.',
  },
  {
    id: 'cloud_reflection_sensor_noise',
    label: 'Solar Glint / Cloud Edge Sensor Glare',
    description: 'Optical glint off high-altitude cirrus clouds or reflective soil mistaken by sensor.',
  },
  {
    id: 'controlled_prescribed_fireline',
    label: 'Authorized Prescribed Departmental Burn',
    description: 'Scheduled counter-fire or perimeter fireline clearance managed by forest staff.',
  },
  {
    id: 'ranger_scouted_no_fire',
    label: 'Ranger Ground Scout Inspected (Zero Fire/Smoke)',
    description: 'Physical foot patrol or drone scout verified coordinates with no signs of active combustion.',
  },
  {
    id: 'other',
    label: 'Other Contextual Cause',
    description: 'Other verified non-wildfire thermal signature requiring manual logging.',
  },
];

export const VerificationModal: React.FC<VerificationModalProps> = ({
  incident,
  isOpen,
  onClose,
  onSaveDecision,
}) => {
  if (!isOpen || !incident) return null;

  const [decision, setDecision] = useState<'verified_fire' | 'possible_false_alarm' | 'escalated'>(
    incident.verificationStatus === 'verified_fire'
      ? 'verified_fire'
      : incident.verificationStatus === 'possible_false_alarm'
      ? 'possible_false_alarm'
      : 'verified_fire'
  );

  const [reason, setReason] = useState<FalseAlarmReason | string>(
    (incident.verificationDecision?.reason as FalseAlarmReason) || 'agricultural_stubble_burning'
  );
  const [reviewerName, setReviewerName] = useState<string>(
    incident.verificationDecision?.reviewerName || 'RFO Moharli'
  );
  const [reviewerRole, setReviewerRole] = useState<string>(
    incident.verificationDecision?.reviewerRole || 'Range Forest Officer'
  );
  const [customNotes, setCustomNotes] = useState<string>(
    incident.verificationDecision?.customNotes || ''
  );
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (decision === 'possible_false_alarm' && !reason) {
      setErrorMessage('You must select a specific reason when classifying as a false alarm.');
      return;
    }

    if (!reviewerName.trim()) {
      setErrorMessage('Please provide reviewer name.');
      return;
    }

    setSubmitting(true);
    try {
      const selectedReasonObj = FALSE_ALARM_REASONS.find(r => r.id === reason);
      const payload = {
        decision,
        reason: decision === 'possible_false_alarm' ? reason : undefined,
        reasonLabel: decision === 'possible_false_alarm' ? selectedReasonObj?.label || reason : undefined,
        reviewerName,
        reviewerRole,
        customNotes,
      };

      await onSaveDecision(incident._id, payload);
      onClose();
    } catch (err) {
      setErrorMessage((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Forest Fire Signal Verification
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {incident.incidentId}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Audit decision and false-alarm classification for Tadoba-Andhari Tiger Reserve
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition p-1.5 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Evidence Snapshot */}
        <div className="bg-slate-950/50 border-b border-slate-800 px-6 py-3 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3 text-slate-300 font-mono">
          <div>
            <span className="text-slate-500 block">Thermal FRP</span>
            <strong className="text-amber-400 text-sm">{incident.frp} MW</strong>
          </div>
          <div>
            <span className="text-slate-500 block">Brightness Temp</span>
            <strong className="text-slate-100 text-sm">{(incident.brightness - 273.15).toFixed(2)} °C</strong>
          </div>
          <div>
            <span className="text-slate-500 block">Confidence</span>
            <strong className="text-emerald-400 text-sm">{incident.confidencePercent}%</strong>
          </div>
          <div>
            <span className="text-slate-500 block">TATR Location</span>
            <strong className="text-red-400 text-sm">{incident.zone}</strong>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Action Choice Radio Cards */}
          <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Verification Decision:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Option 1: Verified Fire */}
              <button
                type="button"
                onClick={() => setDecision('verified_fire')}
                className={`p-3 rounded-lg border text-left transition flex flex-col justify-between ${
                  decision === 'verified_fire'
                    ? 'bg-red-950/60 border-red-600 ring-1 ring-red-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <Flame className="w-4 h-4 text-red-500" />
                  <span className="text-xs font-bold uppercase">Actionable</span>
                </div>
                <div className="font-semibold text-sm text-slate-100">Fire Verified</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Real active wildfire confirmed. Dispatch strike force.
                </div>
              </button>

              {/* Option 2: Possible False Alarm */}
              <button
                type="button"
                onClick={() => setDecision('possible_false_alarm')}
                className={`p-3 rounded-lg border text-left transition flex flex-col justify-between ${
                  decision === 'possible_false_alarm'
                    ? 'bg-emerald-950/60 border-emerald-600 ring-1 ring-emerald-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <CheckCircle className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold uppercase">Clear</span>
                </div>
                <div className="font-semibold text-sm text-slate-100">Possible False Alarm</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Requires documented reason (stubble, kiln, glint).
                </div>
              </button>

              {/* Option 3: Escalate for Scout */}
              <button
                type="button"
                onClick={() => setDecision('escalated')}
                className={`p-3 rounded-lg border text-left transition flex flex-col justify-between ${
                  decision === 'escalated'
                    ? 'bg-amber-950/60 border-amber-600 ring-1 ring-amber-500 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold uppercase">Investigate</span>
                </div>
                <div className="font-semibold text-sm text-slate-100">Escalate for Scout</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Ambiguous signal. Request drone or ground patrol.
                </div>
              </button>
            </div>
          </div>


          {/* Reviewer Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">
                Reviewer Officer Name *
              </label>
              <input
                type="text"
                value={reviewerName}
                onChange={e => setReviewerName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                placeholder="e.g. S. Deshmukh"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1">
                Designation / Role *
              </label>
              <input
                type="text"
                value={reviewerRole}
                onChange={e => setReviewerRole(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                placeholder="e.g. Range Forest Officer (Moharli)"
              />
            </div>
          </div>

          {/* Operational Notes */}
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1">
              Field Notes & Evidence Context
            </label>
            <textarea
              value={customNotes}
              onChange={e => setCustomNotes(e.target.value)}
              rows={2}
              className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
              placeholder="e.g. Confirmed with watchtower at Telia Ridge. Zero smoke visible. Wind steady 8 km/h NW."
            />
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="text-xs text-red-400 bg-red-950/60 border border-red-800/80 rounded p-2.5">
              {errorMessage}
            </div>
          )}

          {/* Audit History */}
          {incident.auditHistory && incident.auditHistory.length > 0 && (
            <div className="border-t border-slate-800 pt-3">
              <div className="text-xs font-semibold text-slate-400 flex items-center gap-1.5 mb-2">
                <History className="w-3.5 h-3.5 text-slate-500" />
                <span>Auditable Decision History ({incident.auditHistory.length}):</span>
              </div>
              <div className="max-h-28 overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px]">
                {incident.auditHistory.map((entry, idx) => (
                  <div key={idx} className="bg-slate-950 rounded p-2 border border-slate-800 text-slate-400">
                    <div className="flex justify-between text-slate-300">
                      <strong>{entry.action}</strong>
                      <span className="text-[10px] text-slate-500">{new Date(entry.timestamp).toLocaleString()}</span>
                    </div>
                    <div className="text-slate-400 mt-0.5">{entry.details}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">By: {entry.user}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded text-xs text-slate-400 hover:text-white transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-md bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-medium text-xs shadow-md transition"
            >
              {submitting ? 'Saving to Database...' : 'Record Decision in MongoDB'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
