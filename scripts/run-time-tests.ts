import { getStudyDateKeyFromTime } from '../src/lib/time';

function utcMs(yyyy: number, mm: number, dd: number, hh: number, min: number, ss = 0): number {
  return Date.UTC(yyyy, mm - 1, dd, hh, min, ss, 0);
}

function assertEqual(actual: unknown, expected: unknown, message: string) {
  if (actual !== expected) {
    throw new Error(`${message}\nexpected: ${expected}\nactual:   ${actual}`);
  }
}

// KST 2026-04-17 05:59 == UTC 2026-04-16 20:59 -> previous study day
assertEqual(
  getStudyDateKeyFromTime(utcMs(2026, 4, 16, 20, 59)),
  '2026-04-16',
  'Before 06:00 KST should bucket to previous date'
);

// KST 2026-04-17 06:00 == UTC 2026-04-16 21:00 -> new study day
assertEqual(
  getStudyDateKeyFromTime(utcMs(2026, 4, 16, 21, 0)),
  '2026-04-17',
  'At/after 06:00 KST should bucket to current date'
);

console.log('time tests passed');
