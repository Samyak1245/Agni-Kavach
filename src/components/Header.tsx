import React, { useState, useEffect } from 'react';
import { Flame, ShieldAlert, Database, RefreshCw, Radio, Compass, FileSpreadsheet, AlertTriangle } from 'lucide-react';

interface HeaderProps {
  activeTab: 'triage' | 'map' | 'ingest' | 'limitations';
  setActiveTab: (tab: 'triage' | 'map' | 'ingest' | 'limitations') => void;
  incidentCount: number;
  p1Count: number;
  dbType: string;
  onResetDemo: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  incidentCount,
  p1Count,
  dbType,
  onResetDemo,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }) + ' IST'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-slate-950 border-b border-slate-800 text-slate-100 sticky top-0 z-40 shadow-xl">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Branding */}
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-amber-500 to-red-600 flex items-center justify-center shadow-lg shadow-red-950/50 ring-1 ring-amber-400/30">
            <Flame className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Agni Kavach <span className="text-xs font-semibold px-2 py-0.5 rounded bg-red-950/80 text-red-400 border border-red-800/60 font-mono tracking-wide">FIRE SHIELD</span>
              </h1>
              <span className="text-xs font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                TATR Ops
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Tadoba-Andhari Tiger Reserve | Forest Fire Detection & Ranger Response
            </p>
          </div>
        </div>

        {/* Live Status Indicators */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs">
          {/* Clock */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-slate-300 font-mono">
            <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>{timeStr || 'Connecting...'}</span>
          </div>

          
          {/* P1 Alerts Counter */}
          {p1Count > 0 ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-950/80 border border-red-700/60 text-red-300 animate-pulse">
              <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
              <span className="font-bold">{p1Count}</span>
              <span>P1 Critical</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 border border-slate-800 text-emerald-400">
              <span>0 P1 Critical</span>
            </div>
          )}

          {/* Reset Demo button */}
          <button
            onClick={onResetDemo}
            title="Reset to default calibrated Tadoba observations"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden md:inline">Reset Seed</span>
          </button>
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="bg-slate-900/90 border-t border-slate-800/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex space-x-1 sm:space-x-3 overflow-x-auto py-2">
          <button
            onClick={() => setActiveTab('triage')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-medium transition whitespace-nowrap ${
              activeTab === 'triage'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-950/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Alerts & Priority Triage</span>
            <span className="ml-1 px-1.5 py-0.2 rounded text-xs bg-slate-950/50">
              {incidentCount}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-medium transition whitespace-nowrap ${
              activeTab === 'map'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-950/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Compass className="w-4 h-4" />
            <span>Tactical Map & Navigation</span>
          </button>

          <button
            onClick={() => setActiveTab('ingest')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-medium transition whitespace-nowrap ${
              activeTab === 'ingest'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-950/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>NASA FIRMS & CSV Lab</span>
          </button>

          <button
            onClick={() => setActiveTab('limitations')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md text-xs sm:text-sm font-medium transition whitespace-nowrap ${
              activeTab === 'limitations'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-950/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Field Limits & SOPs</span>
          </button>
        </div>
      </div>
    </header>
  );
};
