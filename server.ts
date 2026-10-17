import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  initDatabase,
  getAllIncidents,
  getIncidentById,
  saveIncident,
  recordVerificationDecision,
  getDatabaseStatus,
  resetToSeed,
} from './src/server/db.ts';
import { calculateRoute } from './src/server/routingService.ts';
import { parseFirmsOrKaggleCSV, queryNASA_FIRMS } from './src/server/firmsService.ts';
import { TATR_BOUNDS, TATR_CORE_POLYGON, TATR_BUFFER_POLYGON, TATR_RANGER_GATES } from './src/data/tatrBoundary.ts';
import { isValidCoordinate } from './src/utils/geo.ts';
import { VerificationDecision } from './src/types/incident.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Priority weight sorting helper (P1 > P2 > P3 > P4)
const priorityOrder: Record<string, number> = { P1: 4, P2: 3, P3: 2, P4: 1 };

// API Routes

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  const dbStatus = getDatabaseStatus();
  res.json({
    status: 'healthy',
    service: 'Agni Kavach Backend API',
    region: 'Tadoba-Andhari Tiger Reserve (TATR), Maharashtra',
    timestamp: new Date().toISOString(),
    database: dbStatus,
  });
});

// GET /api/incidents - Return priority-sorted incidents
app.get('/api/incidents', async (req: Request, res: Response) => {
  try {
    const incidents = await getAllIncidents();
    const { priority, zone, status, search, includeSynthetic } = req.query;

    let filtered = [...incidents];

    if (priority && typeof priority === 'string') {
      filtered = filtered.filter(i => i.priority === priority);
    }
    if (zone && typeof zone === 'string') {
      filtered = filtered.filter(i => i.zone.toLowerCase().includes(zone.toLowerCase()));
    }
    if (status && typeof status === 'string') {
      filtered = filtered.filter(i => i.verificationStatus === status);
    }
    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      filtered = filtered.filter(
        i =>
          i.incidentId.toLowerCase().includes(q) ||
          i.title.toLowerCase().includes(q) ||
          i.nearestRangerGate.gateName.toLowerCase().includes(q) ||
          i.satellite.toLowerCase().includes(q)
      );
    }
    if (includeSynthetic === 'false') {
      filtered = filtered.filter(i => !i.isSynthetic);
    }

    // Sort by priority descending (P1 first, then higher priorityScore, then freshest)
    filtered.sort((a, b) => {
      const pDiff = (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
      if (pDiff !== 0) return pDiff;
      const scoreDiff = (b.priorityScore || 0) - (a.priorityScore || 0);
      if (scoreDiff !== 0) return scoreDiff;
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    res.json({
      success: true,
      count: filtered.length,
      data: filtered,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// GET /api/incidents/:id - Return single incident
app.get('/api/incidents/:id', async (req: Request, res: Response) => {
  try {
    const incident = await getIncidentById(req.params.id);
    if (!incident) {
      return res.status(404).json({ success: false, error: 'Incident not found' });
    }
    res.json({ success: true, data: incident });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// GET /api/incidents/:id/map - Return incident map details & boundary context
app.get('/api/incidents/:id/map', async (req: Request, res: Response) => {
  try {
    const incident = await getIncidentById(req.params.id);
    if (!incident) {
      return res.status(404).json({ success: false, error: 'Incident not found' });
    }

    res.json({
      success: true,
      incident,
      tatrGeography: {
        bounds: TATR_BOUNDS,
        corePolygon: TATR_CORE_POLYGON,
        bufferPolygon: TATR_BUFFER_POLYGON,
        rangerGates: TATR_RANGER_GATES,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// PATCH /api/incidents/:id/status - Quick status update
app.patch('/api/incidents/:id/status', async (req: Request, res: Response) => {
  try {
    const { status, user, notes } = req.body;
    const allowed = ['unverified', 'escalated', 'verified_fire', 'possible_false_alarm'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, error: 'Invalid verification status' });
    }

    const incident = await getIncidentById(req.params.id);
    if (!incident) {
      return res.status(404).json({ success: false, error: 'Incident not found' });
    }

    incident.verificationStatus = status;
    incident.auditHistory.push({
      action: `STATUS_UPDATED_TO_${status.toUpperCase()}`,
      user: user || 'TATR_CONTROL_ROOM',
      timestamp: new Date().toISOString(),
      details: notes || 'Direct status transition',
    });

    const saved = await saveIncident(incident);
    res.json({ success: true, data: saved });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// POST /api/incidents/:id/verify - Submit formal verification decision
app.post('/api/incidents/:id/verify', async (req: Request, res: Response) => {
  try {
    const { decision, reason, reasonLabel, customNotes, reviewerName, reviewerRole } = req.body;

    if (!decision || !['verified_fire', 'possible_false_alarm', 'escalated'].includes(decision)) {
      return res.status(400).json({
        success: false,
        error: 'decision must be one of: "verified_fire", "possible_false_alarm", "escalated"',
      });
    }

    // False alarm requires a documented reason
    if (decision === 'possible_false_alarm' && (!reason || String(reason).trim().length === 0)) {
      return res.status(400).json({
        success: false,
        error: 'A specific reason is mandatory when classifying an incident as a false alarm.',
      });
    }

    const decisionPayload: VerificationDecision = {
      decision,
      reason,
      reasonLabel,
      customNotes,
      reviewerName: reviewerName?.trim() || 'Duty Ranger',
      reviewerRole: reviewerRole?.trim() || 'TATR Field Officer',
      reviewedAt: new Date().toISOString(),
    };

    const updated = await recordVerificationDecision(req.params.id, decisionPayload);
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Incident not found' });
    }

    res.json({
      success: true,
      message: `Incident ${updated.incidentId} successfully recorded as ${decision}.`,
      data: updated,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// POST /api/routes - Calculate real driving route
app.post('/api/routes', async (req: Request, res: Response) => {
  try {
    const { startLat, startLon, endLat, endLon } = req.body;

    const sLat = parseFloat(startLat);
    const sLon = parseFloat(startLon);
    const eLat = parseFloat(endLat);
    const eLon = parseFloat(endLon);

    if (!isValidCoordinate(sLat, sLon) || !isValidCoordinate(eLat, eLon)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid start or end coordinates supplied.',
      });
    }

    const routeData = await calculateRoute(sLat, sLon, eLat, eLon);
    res.json(routeData);
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// POST /api/incidents/upload-csv - Ingest CSV dataset
app.post('/api/incidents/upload-csv', async (req: Request, res: Response) => {
  try {
    const { csvContent } = req.body;
    if (!csvContent || typeof csvContent !== 'string') {
      return res.status(400).json({ success: false, error: 'csvContent string is required.' });
    }

    const existing = await getAllIncidents();
    const result = parseFirmsOrKaggleCSV(csvContent, existing);

    for (const inc of result.incidentsCreated) {
      await saveIncident(inc);
    }

    res.json({
      success: true,
      ...result,
      message: `Processed ${result.totalRows} rows. Ingested ${result.incidentsCreated.length} new incidents within TATR region.`,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// GET /api/firms/sync - Query NASA FIRMS API
app.get('/api/firms/sync', async (req: Request, res: Response) => {
  try {
    const apiKey = typeof req.query.apiKey === 'string' ? req.query.apiKey : undefined;
    const firmsRes = await queryNASA_FIRMS(apiKey);
    res.json(firmsRes);
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

// POST /api/incidents/reset-demo - Reset data
app.post('/api/incidents/reset-demo', async (req: Request, res: Response) => {
  resetToSeed();
  res.json({ success: true, message: 'Reset data to calibrated Tadoba seed incidents.' });
});

// Full-stack Vite integration
async function startServer() {
  await initDatabase();

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Agni Kavach Backend & Vite dev server running on http://localhost:${PORT}`);
  });
}

startServer();
