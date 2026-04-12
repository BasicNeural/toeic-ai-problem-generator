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
