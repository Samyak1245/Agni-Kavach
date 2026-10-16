import { createHash } from "node:crypto";
import SatelliteObservation from "../models/SatelliteObservation.js";
import { TATR_FIRMS_BBOX } from "../../../src/data/tatrGeoData.ts";

const DEFAULT_SOURCE = "VIIRS_SNPP_NRT";
const ALLOWED_SOURCES = new Set([
  "VIIRS_SNPP_NRT",
  "VIIRS_NOAA20_NRT",
  "VIIRS_NOAA21_NRT",
  "MODIS_NRT",
]);

function parseCsvLine(line) {
  const fields = [];
  let field = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"' && insideQuotes) {
      field += '"';
      i += 1;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === "," && !insideQuotes) {
      fields.push(field.trim());
      field = "";
    } else {
      field += char;
    }
  }

  fields.push(field.trim());
  return fields;
}

function numberOrNull(value) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readField(row, indexes, ...names) {
  for (const name of names) {
    const index = indexes[name];
    if (Number.isInteger(index) && index >= 0) return row[index] ?? "";
  }
  return "";
}

function normalizeDateTime(acqDate, acqTime) {
  const date = String(acqDate || "").trim();
  const time = String(acqTime || "").trim().padStart(4, "0");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{4}$/.test(time)) return null;

  const hours = Number(time.slice(0, 2));
  const minutes = Number(time.slice(2, 4));
  if (hours > 23 || minutes > 59) return null;

  const acquiredAt = new Date(`${date}T${time.slice(0, 2)}:${time.slice(2, 4)}:00.000Z`);
  return Number.isNaN(acquiredAt.getTime()) ? null : acquiredAt;
}

function sourceToSatellite(source, rawSatellite) {
  const raw = String(rawSatellite || "").toUpperCase();
  if (source === "VIIRS_NOAA20_NRT" || raw === "NOAA-20" || raw === "N20") return "VIIRS_NOAA20";
  if (source === "VIIRS_NOAA21_NRT" || raw === "NOAA-21" || raw === "N21") return "VIIRS_NOAA21";
  if (source === "MODIS_NRT") {
    if (raw.includes("AQUA") || raw === "A") return "MODIS_Aqua";
    return "MODIS_Terra";
  }
  return "VIIRS_SNPP";
}

function sourceToInstrument(source) {
  return source.startsWith("MODIS") ? "MODIS" : "VIIRS";
}

function makeExternalId({ source, latitude, longitude, acqDate, acqTime, scan, track, satellite }) {
  const stableText = [
    source,
    Number(latitude).toFixed(4),
    Number(longitude).toFixed(4),
    acqDate,
    String(acqTime).padStart(4, "0"),
    scan ?? "",
    track ?? "",
    satellite ?? "",
  ].join("|");
  return createHash("sha256").update(stableText).digest("hex").slice(0, 32);
}

function parseFirmsCsv(csvText, source) {
  const lines = String(csvText || "").split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  const indexes = Object.fromEntries(headers.map((header, index) => [header, index]));
  if (indexes.latitude === undefined || indexes.longitude === undefined) {
    throw new Error("NASA FIRMS response did not contain latitude and longitude columns.");
  }

  const parsedObservations = [];
  const seen = new Set();

  for (const line of lines.slice(1)) {
    const row = parseCsvLine(line);
    const latitude = numberOrNull(readField(row, indexes, "latitude"));
    const longitude = numberOrNull(readField(row, indexes, "longitude"));
    if (latitude === null || longitude === null) continue;
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) continue;

    const acqDate = readField(row, indexes, "acq_date");
    const acqTime = String(readField(row, indexes, "acq_time")).padStart(4, "0");
    const acquiredAt = normalizeDateTime(acqDate, acqTime);
    if (!acquiredAt) continue;

    const rawSatellite = readField(row, indexes, "satellite");
    const satellite = sourceToSatellite(source, rawSatellite);
    const instrument = sourceToInstrument(source);
    const scan = numberOrNull(readField(row, indexes, "scan"));
    const track = numberOrNull(readField(row, indexes, "track"));
    const externalId = makeExternalId({
      source,
      latitude,
      longitude,
      acqDate,
      acqTime,
      scan,
      track,
      satellite,
    });
    if (seen.has(externalId)) continue;
    seen.add(externalId);

    const confidenceRaw = readField(row, indexes, "confidence");
    const confidence = confidenceRaw === "" ? "unavailable" : numberOrNull(confidenceRaw) ?? confidenceRaw.toLowerCase();
    const brightRaw = readField(row, indexes, "bright_ti4", "brightness");
    const brightT31Raw = readField(row, indexes, "bright_ti5", "bright_t31");
    const frpRaw = readField(row, indexes, "frp");
    const daynightRaw = readField(row, indexes, "daynight").toUpperCase();

    parsedObservations.push({
      source,
      externalId,
      latitude,
      longitude,
      acquiredAt,
      satellite,
      instrument,
      confidence,
      brightness: numberOrNull(brightRaw),
      brightT31: numberOrNull(brightT31Raw),
      scan,
      track,
      frp: numberOrNull(frpRaw),
      daynight: daynightRaw === "N" ? "N" : daynightRaw === "D" ? "D" : "U",
      version: readField(row, indexes, "version"),
      ingestedAt: new Date(),
      provenance: "nasa_firms_live",
      rawData: {
        acqDate,
        acqTime,
        satellite: rawSatellite,
        instrument,
        confidence: confidenceRaw,
        brightness: brightRaw,
        brightT31: brightT31Raw,
        frp: frpRaw,
        daynight: daynightRaw,
        scan,
        track,
        version: readField(row, indexes, "version"),
        source,
      },
    });
  }

  return parsedObservations;
}

export function toFrontendObservation(document) {
  const observation = typeof document?.toObject === "function" ? document.toObject() : document;
  const raw = observation.rawData || {};
  const acquiredAt = observation.acquiredAt ? new Date(observation.acquiredAt) : new Date();
  const acqDate = raw.acqDate || acquiredAt.toISOString().slice(0, 10);
  const acqTime = String(raw.acqTime || `${String(acquiredAt.getUTCHours()).padStart(2, "0")}${String(acquiredAt.getUTCMinutes()).padStart(2, "0")}`).padStart(4, "0");

  return {
    id: String(observation.externalId || observation._id),
    latitude: observation.latitude,
    longitude: observation.longitude,
    brightness: Number.isFinite(observation.brightness) ? observation.brightness : 0,
    scan: observation.scan ?? undefined,
    track: observation.track ?? undefined,
    acqDate,
    acqTime,
    satellite: observation.satellite || "VIIRS_SNPP",
    instrument: observation.instrument || "VIIRS",
    confidence: observation.confidence ?? "unavailable",
    version: observation.version || undefined,
    brightT31: observation.brightT31 ?? undefined,
    frp: Number.isFinite(observation.frp) ? observation.frp : 0,
    daynight: observation.daynight === "N" ? "N" : "D",
    ingestedAt: observation.ingestedAt ? new Date(observation.ingestedAt).toISOString() : new Date().toISOString(),
    provenance: observation.provenance || "nasa_firms_live",
  };
}

export async function fetchNasaFirmsHotspots({ days = 3, source = DEFAULT_SOURCE } = {}) {
  const mapKey = process.env.VIIRS_API_KEY || process.env.NASA_FIRMS_MAP_KEY || process.env.FIRMS_MAP_KEY;
  if (!mapKey || mapKey.trim() === "" || mapKey.toLowerCase().includes("your_")) {
    return {
      success: false,
      source: "empty",
      observations: [],
      totalRawHotspots: 0,
      insertedCount: 0,
      updatedCount: 0,
      dataFreshnessHours: null,
      error: "NASA FIRMS key is not configured. Set VIIRS_API_KEY in the backend .env file.",
    };
  }

  if (!ALLOWED_SOURCES.has(source)) {
    throw new Error(`Unsupported NASA FIRMS source: ${source}`);
  }

  const safeDays = Math.min(10, Math.max(1, Number.parseInt(days, 10) || 3));
  const { minLng, minLat, maxLng, maxLat } = TATR_FIRMS_BBOX;
  const bbox = `${minLng},${minLat},${maxLng},${maxLat}`;
  const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${encodeURIComponent(mapKey.trim())}/${source}/${bbox}/${safeDays}`;

  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  const body = await response.text();
  if (!response.ok) {
    throw new Error(`NASA FIRMS returned HTTP ${response.status}: ${body.slice(0, 200)}`);
  }
  if (/invalid map key|bad request|error:/i.test(body.slice(0, 300))) {
    throw new Error(`NASA FIRMS rejected the request: ${body.trim().slice(0, 200)}`);
  }

  const parsed = parseFirmsCsv(body, source);
  const now = new Date();
  const cutoff = new Date(now.getTime() - safeDays * 24 * 60 * 60 * 1000);
  const freshCandidates = parsed.filter((item) => item.acquiredAt >= cutoff);

  let insertedCount = 0;
  let updatedCount = 0;
  if (freshCandidates.length > 0) {
    const operations = freshCandidates.map((item) => ({
      updateOne: {
        filter: { source: item.source, externalId: item.externalId },
        update: { $set: item, $setOnInsert: { createdAt: now } },
        upsert: true,
      },
    }));
    const result = await SatelliteObservation.bulkWrite(operations, { ordered: false });
    insertedCount = result.upsertedCount || 0;
    updatedCount = result.modifiedCount || 0;
  }

  const ids = freshCandidates.map((item) => item.externalId);
  const saved = ids.length
    ? await SatelliteObservation.find({ source, externalId: { $in: ids } }).sort({ acquiredAt: -1 }).lean()
    : [];
  const observations = saved.map(toFrontendObservation);
  const latest = saved.reduce((max, item) => (!max || item.acquiredAt > max ? item.acquiredAt : max), null);
  const dataFreshnessHours = latest
    ? Math.max(0, Math.round(((now.getTime() - new Date(latest).getTime()) / 3600000) * 10) / 10)
    : null;

  return {
    success: true,
    source: "live_api",
    observations,
    totalRawHotspots: parsed.length,
    insertedCount,
    updatedCount,
    dataFreshnessHours,
    days: safeDays,
    sourceProduct: source,
  };
}

export { parseFirmsCsv };
