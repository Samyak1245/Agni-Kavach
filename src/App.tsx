import React, { useState, useEffect } from 'react';
import { Incident } from './types/incident.ts';
import { Header } from './components/Header.tsx';
import { Dashboard } from './components/Dashboard.tsx';
import { TacticalMap } from './components/TacticalMap.tsx';
import { VerificationModal } from './components/VerificationModal.tsx';
import { DataIngestionLab } from './components/DataIngestionLab.tsx';
import { FieldLimitations } from './components/FieldLimitations.tsx';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'triage' | 'map' | 'ingest' | 'limitations'>('triage');
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [verifyModalIncident, setVerifyModalIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [dbType, setDbType] = useState<string>('Connecting...');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Show temporary toast notification
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Fetch all incidents and health
  const fetchIncidents = async () => {
    try {
      setLoading(true);
      const [incRes, healthRes] = await Promise.all([
        fetch('/api/incidents'),
        fetch('/api/health'),
      ]);

      if (incRes.ok) {
        const data = await incRes.json();
        setIncidents(data.data || []);
        if (data.data?.length > 0 && !selectedIncident) {
          // Default selection to first P1 or top priority incident
          setSelectedIncident(data.data[0]);
        }
      }

      if (healthRes.ok) {
        const health = await healthRes.json();
        setDbType(health.database?.connectionType || 'Mongoose Store');
      }
    } catch (err) {
      console.error('Failed to fetch incidents:', err);
      showToast('Could not fetch incidents from backend API.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
  }, []);

  // Check URL hash for direct incident link e.g. #/incidents/TATR-2026-081/map
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      const match = hash.match(/#\/?incidents\/([A-Za-z0-9_-]+)\/map/);
      if (match && incidents.length > 0) {
        const targetId = match[1];
        const found = incidents.find(
          i => i.incidentId.toLowerCase() === targetId.toLowerCase() || i._id === targetId
        );
        if (found) {
          setSelectedIncident(found);
          setActiveTab('map');
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [incidents]);

  // Navigate to map for a specific incident
  const handleSelectIncidentForMap = (incident: Incident) => {
    setSelectedIncident(incident);
    setActiveTab('map');
    window.location.hash = `/incidents/${incident.incidentId}/map`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Submit verification decision
  const handleSaveDecision = async (incidentId: string, payload: any) => {
    try {
      const response = await fetch(`/api/incidents/${incidentId}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || 'Failed to record decision');
      }

      showToast(
        payload.decision === 'verified_fire'
          ? 'Wildfire verified! Strike force deployment status updated.'
          : payload.decision === 'possible_false_alarm'
          ? 'False alarm classification recorded in audit history.'
          : 'Incident escalated for reconnaissance scout.',
        'success'
      );

      // Refresh list
      await fetchIncidents();
      if (selectedIncident && (selectedIncident._id === incidentId || selectedIncident.incidentId === incidentId)) {
        setSelectedIncident(resData.data);
      }
    } catch (err) {
      showToast((err as Error).message, 'error');
      throw err;
    }
  };

  // Reset to default seed
  const handleResetDemo = async () => {
    try {
      const res = await fetch('/api/incidents/reset-demo', { method: 'POST' });
      if (res.ok) {
        showToast('Reset data to calibrated Tadoba-Andhari seed incidents.', 'info');
        await fetchIncidents();
      }
    } catch {
      showToast('Failed to reset demo.', 'error');
    }
  };

  const p1Count = incidents.filter(i => i.priority === 'P1').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-lg shadow-2xl border text-xs font-medium animate-in fade-in slide-in-from-bottom-3 duration-200 bg-slate-900 border-slate-700 text-white">
          {toast.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
          {toast.type === 'error' && <AlertTriangle className="w-4 h-4 text-red-400" />}
          {toast.type === 'info' && <Info className="w-4 h-4 text-cyan-400" />}
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="ml-2 text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        incidentCount={incidents.length}
        p1Count={p1Count}
        dbType={dbType}
        onResetDemo={handleResetDemo}
      />

      {/* View Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'triage' && (
          <Dashboard
            incidents={incidents}
            onSelectIncidentForMap={handleSelectIncidentForMap}
            onOpenVerifyModal={inc => setVerifyModalIncident(inc)}
            loading={loading}
          />
        )}

        {activeTab === 'map' && (
          <TacticalMap
            selectedIncident={selectedIncident}
            allIncidents={incidents}
            onSelectIncident={inc => {
              setSelectedIncident(inc);
              window.location.hash = `/incidents/${inc.incidentId}/map`;
            }}
            onOpenVerifyModal={inc => setVerifyModalIncident(inc)}
          />
        )}

        {activeTab === 'ingest' && (
          <DataIngestionLab onRefreshData={fetchIncidents} />
        )}

        {activeTab === 'limitations' && (
          <FieldLimitations />
        )}
      </main>

      {/* Verification & False Alarm Modal */}
      <VerificationModal
        incident={verifyModalIncident}
        isOpen={!!verifyModalIncident}
        onClose={() => setVerifyModalIncident(null)}
        onSaveDecision={handleSaveDecision}
      />

      {/* Operational Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-xs text-slate-500 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            Agni Kavach (Fire Shield) | WildHack 2026 Challenge C: Forest Fire Detection & Response
          </div>
          <div className="text-[11px] text-slate-600">
            Tadoba-Andhari Tiger Reserve (TATR) Operational Command | MERN Stack Prototype
          </div>
        </div>
      </footer>
    </div>
  );
}
