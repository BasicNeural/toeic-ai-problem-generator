import { Word, Meaning, FSRSState } from '../types';

export function parseCSV(csv: string): Word[] {
  const lines = csv.trim().split('\n').filter(line => line.trim().length > 0);
  // Skip header if it exists
  const startIdx = lines.length > 0 && lines[0].toLowerCase().includes('word') ? 1 : 0;
  
  return lines.slice(startIdx).map((line, index) => {
    const parts = line.split('/').map(s => s.trim());
    const term = parts[0];
    const class1 = parts[1];
    const mean1 = parts[2];
    const class2 = parts[3];
    const mean2 = parts[4];
    
    const meanings: Meaning[] = [];
    if (class1 && mean1) {
      meanings.push({ wordClass: class1, definition: mean1 });
    }
    if (class2 && mean2) {
      meanings.push({ wordClass: class2, definition: mean2 });
    }

    // Fallback if no meanings found but parts exist
    if (meanings.length === 0 && parts.length >= 3) {
      meanings.push({ wordClass: parts[1] || '?', definition: parts[2] || '?' });
    }

    return {
      id: `word-${index}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      term: term || 'Unknown',
      meanings,
      memorized: false
    };
  }).filter(w => w.meanings.length > 0);
}
