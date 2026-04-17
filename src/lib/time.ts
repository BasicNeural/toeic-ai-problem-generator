export function getDailyResetTime(): number {
  const now = Date.now();
  // KST is UTC+9
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstDate = new Date(now + kstOffset);
  
  const resetKst = new Date(kstDate);
  if (kstDate.getUTCHours() < 6) {
    resetKst.setUTCDate(resetKst.getUTCDate() - 1);
  }
  resetKst.setUTCHours(6, 0, 0, 0);
  
  return resetKst.getTime() - kstOffset;
}

/**
 * Same logic as getStudyDateKey(), but for an arbitrary timestamp.
 *
 * Our app defines a "study day" as KST 06:00 -> next day KST 05:59.
 */
export function getStudyDateKeyFromTime(timeMs: number): string {
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstDate = new Date(timeMs + kstOffset);

  if (kstDate.getUTCHours() < 6) {
    kstDate.setUTCDate(kstDate.getUTCDate() - 1);
  }

  const yyyy = kstDate.getUTCFullYear();
  const mm = String(kstDate.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(kstDate.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Returns YYYY-MM-DD string based on 06:00 AM (KST) reset.
 * Before 06:00 AM KST -> Returns yesterday's date.
 * After 06:00 AM KST -> Returns today's date.
 */
export function getStudyDateKey(): string {
  return getStudyDateKeyFromTime(Date.now());
}
