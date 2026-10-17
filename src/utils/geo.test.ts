import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateHaversineDistanceKm,
  classifyTATRZone,
  findNearestRangerGate,
  isValidCoordinate
} from './geo.ts';

test('calculates accurate Haversine distance between two known coordinates', () => {
  // Distance between Moharli Gate (~20.2450, 79.3175) and Chandrapur HQ (~19.9530, 79.2960)
  const dist = calculateHaversineDistanceKm(20.2450, 79.3175, 19.9530, 79.2960);
  assert.ok(dist > 30 && dist < 35, `Expected ~32km, got ${dist}km`);
});

test('identifies Core Zone coordinates within Tadoba sanctuary', () => {
  // Center of Tadoba core lake / meadow ~20.35, 79.38
  const zone = classifyTATRZone(20.35, 79.38);
  assert.equal(zone, 'Core Zone');
});

test('identifies External Outskirts coordinates far from Chandrapur', () => {
  // Mumbai or Delhi coordinates
  const zone = classifyTATRZone(19.0760, 72.8777);
  assert.equal(zone, 'External Outskirts');
});

test('finds nearest ranger gate accurately', () => {
  // Near Moharli village
  const nearest = findNearestRangerGate(20.248, 79.319);
  assert.equal(nearest.gateId, 'gate-moharli');
  assert.ok(nearest.distanceKm < 2.0);
});

test('validates coordinate boundaries correctly', () => {
  assert.equal(isValidCoordinate(20.3, 79.4), true);
  assert.equal(isValidCoordinate(95, 79.4), false);
  assert.equal(isValidCoordinate(NaN, 79.4), false);
});
