import type { PriorityLevel } from '../types/incident.ts';

export interface TriageInput {
  frp: number; // Fire Radiative Power (MW)
  confidencePercent: number; // 0 - 100
  zone: 'Core Zone' | 'Buffer Zone' | 'Reserve Boundary' | 'External Outskirts';
  hoursSinceObservation: number;
  corroboratingCount?: number;
  isNight?: boolean;
}

export interface TriageResult {
  priority: PriorityLevel;
  score: number;
  explanation: string;
}

/**
 * Computes an explainable priority level (P1-P4) based on thermal intensity,
 * spatial sensitivity (Core vs Buffer), satellite confidence, and temporal freshness.
 */
export function calculateIncidentPriority(input: TriageInput): TriageResult {
  const {
    frp,
    confidencePercent,
    zone,
    hoursSinceObservation,
    corroboratingCount = 1,
    isNight = false,
  } = input;

  // Stale detection: Observations older than 36 hours automatically drop urgency
  if (hoursSinceObservation > 36) {
    return {
      priority: 'P4',
      score: 25,
      explanation: `Observation is ${Math.round(hoursSinceObservation)}h old (>36h). Ranked as low urgency review to maintain historical tracking without overloading active response teams.`,
    };
  }

  // Calculate composite urgency score (0 - 100)
  let score = 0;

  // 1. Thermal Intensity (FRP) - up to 35 pts
  if (frp >= 25) score += 35;
  else if (frp >= 15) score += 28;
  else if (frp >= 8) score += 20;
  else if (frp >= 3) score += 12;
  else score += 5;

  // 2. Zone Sensitivity - up to 30 pts
  if (zone === 'Core Zone') score += 30;
  else if (zone === 'Buffer Zone') score += 20;
  else if (zone === 'Reserve Boundary') score += 12;
  else score += 5;

  // 3. Sensor Confidence - up to 20 pts
  if (confidencePercent >= 85) score += 20;
  else if (confidencePercent >= 65) score += 15;
  else if (confidencePercent >= 45) score += 10;
  else score += 5;

  // 4. Temporal Freshness - up to 15 pts
  if (hoursSinceObservation <= 3) score += 15;
  else if (hoursSinceObservation <= 8) score += 10;
  else if (hoursSinceObservation <= 18) score += 5;

  // Corroboration / night bonus (fires at night have fewer false positives from solar glint)
  if (corroboratingCount > 1) score = Math.min(100, score + 8);
  if (isNight && confidencePercent >= 50) score = Math.min(100, score + 5);

  // Map to explainable priority tier
  if (score >= 75) {
    const reasons: string[] = [];
    if (zone === 'Core Zone') reasons.push('critical location inside TATR Core Zone');
    if (frp >= 15) reasons.push(`elevated thermal radiative power (${frp} MW)`);
    if (confidencePercent >= 80) reasons.push(`high satellite confidence (${confidencePercent}%)`);
    if (hoursSinceObservation <= 4) reasons.push('fresh detection within last 4 hours');
    if (corroboratingCount > 1) reasons.push(`${corroboratingCount} spatially co-located hotspot detections`);

    return {
      priority: 'P1',
      score,
      explanation: `Urgent Review: ${reasons.join(', ')}. Strong evidence requiring prompt human assessment and rapid ranger alert.`,
    };
  }

  if (score >= 50) {
    const reasons: string[] = [];
    if (zone === 'Core Zone' || zone === 'Buffer Zone') reasons.push(`located in ${zone}`);
    if (frp >= 8) reasons.push(`moderate thermal energy (${frp} MW)`);
    if (hoursSinceObservation <= 12) reasons.push(`recent pass (${Math.round(hoursSinceObservation)}h ago)`);
    if (confidencePercent >= 60) reasons.push(`nominal confidence (${confidencePercent}%)`);

    return {
      priority: 'P2',
      score,
      explanation: `High Priority: ${reasons.join(', ')}. Meaningful thermal signature requiring patrol dispatch or aerial verification.`,
    };
  }

  // P3 is for active/recent observations that need human verification
  if (score >= 20 && hoursSinceObservation <= 24) {
    return {
      priority: 'P3',
      score,
      explanation: `Needs Verification: Ambiguous or isolated signal (${frp} MW, ${confidencePercent}% confidence) in ${zone}. Requires check for agricultural burning, brick kiln or cloud reflection before field dispatch.`,
    };
  }

  return {
    priority: 'P4',
    score,
    explanation: `Low Urgency / Stale: Low thermal energy (${frp} MW) or aged observation (${Math.round(hoursSinceObservation)}h). Maintained in log for audit and secondary watchtower monitoring.`,
  };
}
