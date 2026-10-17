import React, { useState } from 'react';
import {
  Satellite,
  FileSpreadsheet,
  Upload,
  CheckCircle,
  AlertTriangle,
  Play,
  RotateCcw,
  Info,
  Shield,
  Layers,
} from 'lucide-react';

interface DataIngestionLabProps {
  onRefreshData: () => Promise<void>;
}

// Sample CSV datasets ready for immediate evaluation
const SAMPLE_TATR_CSV = `latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight
20.2740,79.3450,342.1,0.38,0.36,2026-10-16,0815,NOAA-20,VIIRS,high,2.0NRT,301.2,18.5,D
20.3420,79.4120,336.5,0.40,0.37,2026-10-16,0815,NOAA-20,VIIRS,nominal,2.0NRT,298.0,12.2,D
20.4810,79.3890,329.8,0.39,0.36,2026-10-16,0815,NOAA-20,VIIRS,nominal,2.0NRT,295.4,7.4,D
21.1458,79.0882,350.2,0.42,0.38,2026-10-16,0815,NOAA-20,VIIRS,high,2.0NRT,305.1,34.0,D`;

const SAMPLE_KAGGLE_WILDFIRE_CSV = `latitude,longitude,brightness,confidence,acq_date,acq_time,satellite,instrument,frp,daynight
20.2310,79.3100,328.0,75,2026-10-15,1930,Suomi-NPP,VIIRS,11.3,N
20.1980,79.4620,319.4,45,2026-10-15,1930,Suomi-NPP,VIIRS,4.8,N
19.0760,72.8777,340.0,90,2026-10-15,1930,Suomi-NPP,VIIRS,25.0,N`;

export const DataIngestionLab: React.FC<DataIngestionLabProps> = ({ onRefreshData }) => {
  const [csvContent, setCsvContent] = useState<string>(SAMPLE_TATR_CSV);
  const [firmsApiKey, setFirmsApiKey] = useState<string>('');
  const [isSyncingFirms, setIsSyncingFirms] = useState<boolean>(false);
  const [firmsResult, setFirmsResult] = useState<{ success: boolean; message: string; count: number } | null>(null);

  const [isIngestingCsv, setIsIngestingCsv] = useState<boolean>(false);
  const [csvResult, setCsvResult] = useState<{
    totalRows: number;
    withinTatrCount: number;
    outOfBoundsCount: number;
    duplicatesSkipped: number;
    errors: string[];
    message: string;
  } | null>(null);

  // Ingest CSV handler
  const handleIngestCsv = async () => {
    setIsIngestingCsv(true);
    setCsvResult(null);

    try {
      const response = await fetch('/api/incidents/upload-csv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvContent }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'CSV ingestion failed');
      }

      setCsvResult(data);
      await onRefreshData();
    } catch (err) {
      setCsvResult({
        totalRows: 0,
        withinTatrCount: 0,
        outOfBoundsCount: 0,
        duplicatesSkipped: 0,
        errors: [(err as Error).message],
        message: 'Failed to process CSV file.',
      });
    } finally {
      setIsIngestingCsv(false);
    }
  };

  // NASA FIRMS Live Query Handler
  const handlePollFirms = async () => {
    setIsSyncingFirms(true);
    setFirmsResult(null);

    try {
      const queryParam = firmsApiKey.trim() ? `?apiKey=${encodeURIComponent(firmsApiKey.trim())}` : '';
      const response = await fetch(`/api/firms/sync${queryParam}`);
      const data = await response.json();
      setFirmsResult(data);
    } catch (err) {
      setFirmsResult({
        success: false,
        message: (err as Error).message,
        count: 0,
      });
    } finally {
      setIsSyncingFirms(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Intro Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-5">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-amber-400 shrink-0">
            <Satellite className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              NASA FIRMS & Dataset Ingestion Pipeline
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                VIIRS 375m / MODIS 1km
              </span>
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Agni Kavach ingests active thermal anomalies, filters against the <strong>Tadoba-Andhari Tiger Reserve boundary</strong>, eliminates duplicate satellite passes, normalizes Fire Radiative Power (MW), and computes priority rankings before presenting alerts to dispatchers.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Section 1: NASA FIRMS API Live Query */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Satellite className="w-4 h-4 text-cyan-400" />
              <span>NASA FIRMS Live API Connector</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">NRT Area Sync</span>
          </div>

          <div className="space-y-2 text-xs text-slate-300">
            <p>
              Connect directly to the NASA FIRMS Active Fire API. Coordinates are automatically bounded to the Tadoba-Andhari Tiger Reserve bounding box:
            </p>
            <div className="bg-slate-950 rounded p-2.5 font-mono text-[11px] text-amber-300/90 border border-slate-800">
              TATR Bounding Box: 79.20°E, 20.08°N to 79.72°E, 20.55°N
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400 block">
              NASA FIRMS MAP KEY (Optional - uses calibrated archive if omitted):
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={firmsApiKey}
                onChange={e => setFirmsApiKey(e.target.value)}
                placeholder="Enter 32-char NASA FIRMS Map Key"
                className="flex-1 bg-slate-950 border border-slate-800 rounded px-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-cyan-500 font-mono"
              />
              <button
                onClick={handlePollFirms}
                disabled={isSyncingFirms}
                className="px-4 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium text-xs shadow-md transition flex items-center gap-1.5 shrink-0"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{isSyncingFirms ? 'Querying...' : 'Poll FIRMS API'}</span>
              </button>
            </div>
          </div>

          {firmsResult && (
            <div
              className={`p-3 rounded border text-xs ${
                firmsResult.success
                  ? 'bg-cyan-950/40 border-cyan-800/80 text-cyan-200'
                  : 'bg-red-950/40 border-red-800/80 text-red-200'
              }`}
            >
              <div className="font-semibold flex items-center gap-1.5">
                {firmsResult.success ? <CheckCircle className="w-4 h-4 text-cyan-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
                <span>{firmsResult.success ? 'FIRMS Feed Synchronized' : 'FIRMS Query Failed'}</span>
              </div>
              <p className="mt-1 text-[11px] text-slate-300">{firmsResult.message}</p>
            </div>
          )}

          <div className="bg-slate-950/70 border border-slate-800/80 rounded p-3 text-[11px] text-slate-400 space-y-1">
            <strong className="text-slate-300 block">FIRMS Hotspot vs Ground Wildfire Truth:</strong>
            <p>
              A satellite hotspot indicates elevated 4-micron radiance within a 375m² pixel. It is a <em>potential thermal anomaly</em>, not definitive proof of a spreading forest fire. Agni Kavach enforces false-alarm verification before mobilization.
            </p>
          </div>
        </div>

        {/* Section 2: CSV / Kaggle Dataset Ingestion */}
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <FileSpreadsheet className="w-4 h-4 text-amber-400" />
              <span>CSV & Kaggle Dataset Inspector</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">Schema Parser</span>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400">Load Preset:</span>
            <button
              onClick={() => setCsvContent(SAMPLE_TATR_CSV)}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 transition"
            >
              NASA FIRMS TATR Pass
            </button>
            <button
              onClick={() => setCsvContent(SAMPLE_KAGGLE_WILDFIRE_CSV)}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700 transition"
            >
              Kaggle Wildfire Schema
            </button>
          </div>

          {/* Textarea */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-400 block">
              Raw CSV Content (supports VIIRS/MODIS headers):
            </label>
            <textarea
              value={csvContent}
              onChange={e => setCsvContent(e.target.value)}
              rows={8}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 font-mono text-[11px] text-slate-300 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Ingest Button */}
          <button
            onClick={handleIngestCsv}
            disabled={isIngestingCsv || !csvContent.trim()}
            className="w-full py-2 rounded-md bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-medium text-xs shadow-md transition flex items-center justify-center gap-2"
          >
            <Upload className="w-4 h-4" />
            <span>{isIngestingCsv ? 'Parsing & Filtering...' : 'Inspect, Filter & Ingest to Active Incidents'}</span>
          </button>

          {/* Ingestion Results HUD */}
          {csvResult && (
            <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg space-y-2 text-xs">
              <div className="font-semibold text-slate-200">{csvResult.message}</div>
              <div className="grid grid-cols-3 gap-2 font-mono text-[11px] pt-1">
                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <span className="text-slate-500 block">Total Rows:</span>
                  <strong className="text-white">{csvResult.totalRows}</strong>
                </div>
                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <span className="text-slate-500 block">Within TATR:</span>
                  <strong className="text-emerald-400">{csvResult.withinTatrCount}</strong>
                </div>
                <div className="bg-slate-900 p-2 rounded border border-slate-800">
                  <span className="text-slate-500 block">Out of Bounds:</span>
                  <strong className="text-amber-400">{csvResult.outOfBoundsCount}</strong>
                </div>
              </div>

              {csvResult.duplicatesSkipped > 0 && (
                <div className="text-[11px] text-slate-400">
                  ⚠️ {csvResult.duplicatesSkipped} duplicate observations safely skipped to avoid double-counting.
                </div>
              )}

              {csvResult.errors && csvResult.errors.length > 0 && (
                <div className="text-[11px] text-red-400 bg-red-950/40 p-2 rounded">
                  Errors: {csvResult.errors.join(', ')}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
