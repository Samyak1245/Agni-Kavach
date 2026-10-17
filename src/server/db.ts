import mongoose, { Schema } from 'mongoose';
import { Incident, VerificationDecision, AuditLogEntry } from '../types/incident.ts';
import { SEED_INCIDENTS } from './seedData.ts';

// Audit log sub-schema
const AuditLogSchema = new Schema<AuditLogEntry>({
  action: { type: String, required: true },
  user: { type: String, required: true },
  timestamp: { type: String, required: true },
  details: { type: String },
}, { _id: false });

// Verification decision sub-schema
const VerificationDecisionSchema = new Schema<VerificationDecision>({
  decision: { type: String, enum: ['verified_fire', 'possible_false_alarm', 'escalated'], required: true },
  reason: { type: String },
  reasonLabel: { type: String },
  customNotes: { type: String },
  reviewerName: { type: String, required: true },
  reviewerRole: { type: String, required: true },
  reviewedAt: { type: String, required: true },
}, { _id: false });

// Incident Mongoose Schema
export const IncidentSchema = new Schema<Incident>({
  incidentId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  source: { type: String, required: true },
  satellite: { type: String, required: true },
  instrument: { type: String, required: true },
  confidence: { type: Schema.Types.Mixed, required: true },
  confidencePercent: { type: Number, required: true },
  frp: { type: Number, required: true },
  brightness: { type: Number, required: true },
  brightT31: { type: Number },
  scan: { type: Number },
  track: { type: Number },
  daynight: { type: String, enum: ['D', 'N'], required: true },
  acqDate: { type: String, required: true },
  acqTime: { type: String, required: true },
  timestamp: { type: String, required: true },
  priority: { type: String, enum: ['P1', 'P2', 'P3', 'P4'], required: true },
  priorityScore: { type: Number, required: true },
  priorityExplanation: { type: String, required: true },
  zone: { type: String, required: true },
  nearestRangerGate: {
    gateId: { type: String, required: true },
    gateName: { type: String, required: true },
    distanceKm: { type: Number, required: true },
  },
  verificationStatus: {
    type: String,
    enum: ['unverified', 'escalated', 'verified_fire', 'possible_false_alarm'],
    default: 'unverified',
  },
  verificationDecision: { type: VerificationDecisionSchema },
  auditHistory: [AuditLogSchema],
  isSynthetic: { type: Boolean, default: false },
  notes: { type: String },
  corroboratingHotspotsCount: { type: Number, default: 1 },
}, {
  timestamps: true,
});

export let IncidentModel: mongoose.Model<Incident> | null = null;
let isMongoConnected = false;

// Active store memory cache (mirrors MongoDB Atlas and serves as immediate fallback)
let inMemoryStore: Incident[] = JSON.parse(JSON.stringify(SEED_INCIDENTS));

export async function initDatabase(): Promise<{ isConnected: boolean; connectionType: string }> {
  const mongoUri = process.env.MONGODB_URI;

  if (mongoUri && mongoUri.startsWith('mongodb')) {
    try {
      console.log('Connecting to MongoDB Atlas at', mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:****@'));
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
      });
      isMongoConnected = true;
      IncidentModel = mongoose.model<Incident>('Incident', IncidentSchema);
      console.log('MongoDB Atlas connected successfully.');

      // Check if DB is empty and seed
      const count = await IncidentModel.countDocuments();
      if (count === 0) {
        console.log('Seeding initial TATR incidents to MongoDB...');
        await IncidentModel.insertMany(SEED_INCIDENTS);
      }
      return { isConnected: true, connectionType: 'MongoDB Atlas' };
    } catch (err) {
      console.warn('MongoDB connection failed or timed out. Operating with resilient in-memory Mongoose-aligned store:', (err as Error).message);
      isMongoConnected = false;
      return { isConnected: false, connectionType: 'In-Memory (Mongoose Schema Aligned)' };
    }
  } else {
    console.log('No MONGODB_URI configured. Operating with in-memory resilient store seeded for Tadoba-Andhari Tiger Reserve.');
    return { isConnected: false, connectionType: 'In-Memory (Mongoose Schema Aligned)' };
  }
}

export function getDatabaseStatus(): { isConnected: boolean; connectionType: string; count: number } {
  return {
    isConnected: isMongoConnected,
    connectionType: isMongoConnected ? 'MongoDB Atlas' : 'In-Memory (Mongoose Schema Aligned)',
    count: inMemoryStore.length,
  };
}

export async function getAllIncidents(): Promise<Incident[]> {
  if (isMongoConnected && IncidentModel) {
    try {
      const docs = await IncidentModel.find().lean();
      return docs as unknown as Incident[];
    } catch {
      // Fallback to in-memory if query fails
      return inMemoryStore;
    }
  }
  return inMemoryStore;
}

export async function getIncidentById(id: string): Promise<Incident | null> {
  if (isMongoConnected && IncidentModel) {
    try {
      const doc = await IncidentModel.findOne({
        $or: [{ _id: id }, { incidentId: id }]
      }).lean();
      if (doc) return doc as unknown as Incident;
    } catch {
      // Fallback
    }
  }

  const match = inMemoryStore.find(
    (inc) => inc._id === id || inc.incidentId.toLowerCase() === id.toLowerCase()
  );
  return match || null;
}

export async function saveIncident(incident: Incident): Promise<Incident> {
  const existingIdx = inMemoryStore.findIndex(
    (i) => i.incidentId.toLowerCase() === incident.incidentId.toLowerCase() || i._id === incident._id
  );

  if (existingIdx >= 0) {
    inMemoryStore[existingIdx] = incident;
  } else {
    inMemoryStore.unshift(incident);
  }

  if (isMongoConnected && IncidentModel) {
    try {
      await IncidentModel.findOneAndUpdate(
        { incidentId: incident.incidentId },
        incident,
        { upsert: true, new: true }
      );
    } catch (err) {
      console.error('Failed to sync to MongoDB:', err);
    }
  }

  return incident;
}

export async function recordVerificationDecision(
  id: string,
  decisionData: VerificationDecision
): Promise<Incident | null> {
  const incident = await getIncidentById(id);
  if (!incident) return null;

  incident.verificationStatus = decisionData.decision;
  incident.verificationDecision = decisionData;

  const actionName =
    decisionData.decision === 'verified_fire'
      ? 'FIRE_VERIFIED_BY_REVIEWER'
      : decisionData.decision === 'possible_false_alarm'
      ? 'MARKED_AS_POSSIBLE_FALSE_ALARM'
      : 'ESCALATED_FOR_GROUND_SCOUT';

  incident.auditHistory.push({
    action: actionName,
    user: `${decisionData.reviewerName} (${decisionData.reviewerRole})`,
    timestamp: decisionData.reviewedAt || new Date().toISOString(),
    details: decisionData.reasonLabel
      ? `Reason: ${decisionData.reasonLabel}. Notes: ${decisionData.customNotes || 'N/A'}`
      : decisionData.customNotes || 'No notes provided',
  });

  return await saveIncident(incident);
}

export function resetToSeed(): void {
  inMemoryStore = JSON.parse(JSON.stringify(SEED_INCIDENTS));
}
