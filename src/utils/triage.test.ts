import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateIncidentPriority } from './triage.ts';

test('P1 classification for fresh high-FRP fire in Core Zone', () => {
  const result = calculateIncidentPriority({
    frp: 28.5,
    confidencePercent: 92,
    zone: 'Core Zone',
    hoursSinceObservation: 1.5,
    corroboratingCount: 2,
    isNight: true,
  });

  assert.equal(result.priority, 'P1');
  assert.ok(result.score >= 75);
  assert.ok(result.explanation.includes('Urgent Review'));
  assert.ok(result.explanation.includes('Core Zone'));
});

test('P4 classification for stale observations over 36 hours old', () => {
  const result = calculateIncidentPriority({
    frp: 35.0,
    confidencePercent: 95,
    zone: 'Core Zone',
    hoursSinceObservation: 42,
  });

  assert.equal(result.priority, 'P4');
  assert.ok(result.explanation.includes('>36h'));
});

test('P2 classification for moderate FRP in Buffer Zone', () => {
  const result = calculateIncidentPriority({
    frp: 12.0,
    confidencePercent: 70,
    zone: 'Buffer Zone',
    hoursSinceObservation: 6,
  });

  assert.equal(result.priority, 'P2');
  assert.ok(result.score >= 50 && result.score < 75);
});

test('P3 classification for low confidence and low FRP', () => {
  const result = calculateIncidentPriority({
    frp: 2.1,
    confidencePercent: 40,
    zone: 'External Outskirts',
    hoursSinceObservation: 14,
  });

  assert.equal(result.priority, 'P3');
  assert.ok(result.score < 50);
});
