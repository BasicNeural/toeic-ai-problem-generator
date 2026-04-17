import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Returns whether the given calendar date should be treated as "today"
 * when the day boundary is at `cutoffHour` (default: 06:00).
 */
export function isToday(date: Date, cutoffHour = 6) {
  const effectiveNow = new Date();
  effectiveNow.setHours(effectiveNow.getHours() - cutoffHour);

  return (
    date.getFullYear() === effectiveNow.getFullYear() &&
    date.getMonth() === effectiveNow.getMonth() &&
    date.getDate() === effectiveNow.getDate()
  );
}
