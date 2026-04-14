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
 * Returns YYYY-MM-DD string based on 06:00 AM (KST) reset.
 * Before 06:00 AM KST -> Returns yesterday's date.
 * After 06:00 AM KST -> Returns today's date.
 */
export function getStudyDateKey(): string {
  const now = Date.now();
  const kstOffset = 9 * 60 * 60 * 1000;
  const kstNow = new Date(now + kstOffset);
  
  // If before 6 AM KST, date should be "yesterday"
  if (kstNow.getUTCHours() < 6) {
    kstNow.setUTCDate(kstNow.getUTCDate() - 1);
  }
  
  const yyyy = kstNow.getUTCFullYear();
  const mm = String(kstNow.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(kstNow.getUTCDate()).padStart(2, '0');
  
  return `${yyyy}-${mm}-${dd}`;
}
